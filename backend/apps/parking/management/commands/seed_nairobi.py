import requests
import uuid
import logging
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from apps.parking.models import ParkingSlot

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seeds Nairobi parking nodes from Overpass API'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Wiping existing parking records..."))
        ParkingSlot.objects.all().delete()
        
        # Bounding box for Nairobi core
        # Note: Corrected the user's -36.762 to 36.762 (Nairobi is East, not West)
        bbox = "-1.312,36.762,-1.258,36.852"
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json];
        (
          node["amenity"="parking"]({bbox});
          way["amenity"="parking"]({bbox});
        );
        out center;
        """
        
        self.stdout.write(self.style.WARNING(f"Querying Overpass API..."))
        
        headers = {'User-Agent': 'EasyPark/1.0 (test script)', 'Accept': '*/*'}
        response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
        if response.status_code != 200:
            self.stdout.write(self.style.ERROR(f"Failed to query Overpass API: {response.text}"))
            return
            
        data = response.json()
        elements = data.get('elements', [])
        
        self.stdout.write(self.style.SUCCESS(f"Found {len(elements)} parking amenities. Processing..."))
        
        slots_to_create = []
        
        for element in elements:
            tags = element.get('tags', {})
            
            # Geometry handling for nodes vs ways
            if element['type'] == 'node':
                lat = element['lat']
                lon = element['lon']
            elif element['type'] == 'way':
                if 'center' not in element:
                    continue
                lat = element['center']['lat']
                lon = element['center']['lon']
            else:
                continue
                
            street_name = tags.get('addr:street', 'Unknown Street')
            parking_type = tags.get('parking', 'surface')
            
            # Assign default zone based on type
            if parking_type in ['multi-storey', 'underground']:
                zone = 'Zone II'
            else:
                zone = 'Zone I'
                
            slot_code = f"NRB-{element['id']}"
            
            slots_to_create.append(
                ParkingSlot(
                    id=uuid.uuid4(),
                    slot_code=slot_code,
                    street_name=street_name,
                    zone=zone,
                    parking_type=parking_type,
                    location=Point(float(lon), float(lat), srid=4326),
                    current_status='FREE',
                    confidence_score=1.00
                )
            )
            
        self.stdout.write(self.style.WARNING(f"Bulk creating {len(slots_to_create)} parking slots..."))
        
        ParkingSlot.objects.bulk_create(slots_to_create, ignore_conflicts=True)
        
        self.stdout.write(self.style.SUCCESS("Nairobi infrastructure successfully ingested!"))
