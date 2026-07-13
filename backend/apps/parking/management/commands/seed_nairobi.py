import requests
import uuid
import logging
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from apps.parking.models import ParkingSlot

logger = logging.getLogger(__name__)


def assign_zone(lat: float, lon: float) -> str:
    """
    Assigns a Nairobi administrative zone based on geographic bounding boxes.
    Boundaries derived from Nairobi City County divisions.
    """
    if -1.295 <= lat <= -1.270 and 36.812 <= lon <= 36.840:
        return 'CBD'
    elif -1.270 <= lat <= -1.248 and 36.798 <= lon <= 36.822:
        return 'Westlands'
    elif -1.310 <= lat <= -1.285 and 36.790 <= lon <= 36.820:
        return 'Kilimani'
    elif -1.264 <= lat <= -1.248 and 36.820 <= lon <= 36.845:
        return 'Parklands'
    elif -1.315 <= lat <= -1.275 and 36.840 <= lon <= 36.872:
        return 'Industrial'
    elif -1.335 <= lat <= -1.305 and 36.820 <= lon <= 36.855:
        return 'South B/C'
    else:
        return 'Greater Nairobi'


class Command(BaseCommand):
    help = 'Seeds real Nairobi parking nodes from OpenStreetMap via Overpass API'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Wiping existing parking records..."))
        ParkingSlot.objects.all().delete()

        bbox = "-1.335,36.762,-1.248,36.872"
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json][timeout:60];
        (
          node["amenity"="parking"]({bbox});
          way["amenity"="parking"]({bbox});
        );
        out center tags;
        """

        self.stdout.write(self.style.WARNING("Querying OpenStreetMap Overpass API..."))

        headers = {
            'User-Agent': 'EasyPark/1.0 Academic Project',
            'Accept': 'application/json',
        }

        try:
            response = requests.post(
                overpass_url,
                data={'data': overpass_query},
                headers=headers,
                timeout=60
            )
            response.raise_for_status()
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Overpass API request failed: {e}"))
            return

        data = response.json()
        elements = data.get('elements', [])
        self.stdout.write(
            self.style.SUCCESS(f"Found {len(elements)} parking amenities. Processing...")
        )

        slots_to_create = []
        zone_counts = {}

        for element in elements:
            tags = element.get('tags', {})

            # Extract coordinates
            if element['type'] == 'node':
                lat, lon = element['lat'], element['lon']
            elif element['type'] == 'way':
                if 'center' not in element:
                    continue
                lat, lon = element['center']['lat'], element['center']['lon']
            else:
                continue

            # Best available name: OSM name > operator name > addr:street > addr:place
            name = (
                tags.get('name') or
                tags.get('operator') or
                tags.get('addr:street') or
                tags.get('addr:full') or
                tags.get('addr:place') or
                'Unknown Street'
            )

            parking_type = tags.get('parking', tags.get('parking:type', 'surface'))
            zone = assign_zone(lat, lon)
            slot_code = f"NRB-{element['id']}"

            zone_counts[zone] = zone_counts.get(zone, 0) + 1

            slots_to_create.append(
                ParkingSlot(
                    id=uuid.uuid4(),
                    slot_code=slot_code,
                    street_name=name,
                    zone=zone,
                    parking_type=parking_type,
                    location=Point(float(lon), float(lat), srid=4326),
                    current_status='FREE',
                    confidence_score=1.00,
                )
            )

        self.stdout.write(
            self.style.WARNING(f"Bulk inserting {len(slots_to_create)} slots...")
        )
        ParkingSlot.objects.bulk_create(slots_to_create, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Nairobi infrastructure seeded!"))
        self.stdout.write(self.style.SUCCESS("Zone distribution:"))
        for zone, count in sorted(zone_counts.items()):
            self.stdout.write(f"  {zone}: {count} slots")
