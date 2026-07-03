from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Polygon, Point
from django.contrib.auth import get_user_model
from apps.parking.models import Zone, ParkingSlot, SlotStatus
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds the database with initial zones, parking slots, and users'

    def handle(self, *args, **options):
        # 1. Seed Zones
        zones_data = [
            {
                'name': 'Westlands',
                'city': 'Nairobi',
                'billing_rate_hour': Decimal('50.00'),
                'center': (36.8108, -1.2676),  # (lng, lat)
                'boundary': Polygon(((36.8058, -1.2626), (36.8158, -1.2626), (36.8158, -1.2726), (36.8058, -1.2726), (36.8058, -1.2626)))
            },
            {
                'name': 'CBD',
                'city': 'Nairobi',
                'billing_rate_hour': Decimal('80.00'),
                'center': (36.8172, -1.2864),
                'boundary': Polygon(((36.8122, -1.2814), (36.8222, -1.2814), (36.8222, -1.2914), (36.8122, -1.2914), (36.8122, -1.2814)))
            },
            {
                'name': 'Kilimani',
                'city': 'Nairobi',
                'billing_rate_hour': Decimal('60.00'),
                'center': (36.7894, -1.2978),
                'boundary': Polygon(((36.7844, -1.2928), (36.7944, -1.2928), (36.7944, -1.3028), (36.7844, -1.3028), (36.7844, -1.2928)))
            }
        ]

        zones_count = 0
        slots_count = 0

        # Slot coordinate offsets to cluster around center
        offsets = [
            (-0.001, -0.001),
            (-0.001, 0.001),
            (0.001, -0.001),
            (0.001, 0.001),
            (-0.0015, 0.0),
            (0.0015, 0.0),
            (0.0, -0.0015),
            (0.0, 0.0015)
        ]

        zone_slot_summary = []

        for z_data in zones_data:
            zone, created = Zone.objects.get_or_create(
                name=z_data['name'],
                city=z_data['city'],
                defaults={
                    'billing_rate_hour': z_data['billing_rate_hour'],
                    'boundary_polygon': z_data['boundary']
                }
            )
            zones_count += 1

            # Seed 8 parking slots per zone
            zone_slots = 0
            for i in range(1, 9):
                slot_code = f"A{i}"
                lng_offset, lat_offset = offsets[i - 1]
                coord = Point(z_data['center'][0] + lng_offset, z_data['center'][1] + lat_offset)
                status = SlotStatus.FREE if i % 2 != 0 else SlotStatus.OCCUPIED

                slot, slot_created = ParkingSlot.objects.get_or_create(
                    zone=zone,
                    slot_code=slot_code,
                    defaults={
                        'coordinate': coord,
                        'current_status': status,
                        'confidence_score': Decimal('1.00')
                    }
                )
                zone_slots += 1
                slots_count += 1
            
            zone_slot_summary.append((zone.name, zone_slots))

        # 2. Seed Users
        User = get_user_model()
        users_data = [
            ('driver@easypark.test', 'TestDriver99!', 'DRIVER'),
            ('marshal@easypark.test', 'TestMarshal99!', 'MARSHAL'),
            ('admin@easypark.test', 'TestAdmin99!', 'ADMIN')
        ]

        users_count = 0
        for email, password, role in users_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'role': role}
            )
            
            # Set details for admin user specifically
            if role == 'ADMIN':
                user.is_staff = True
                user.is_superuser = True
                user.save()
            
            # Idempotently update password if needed
            if created or not user.check_password(password):
                user.set_password(password)
                user.save()
            users_count += 1

        # 3. Print Summary Table
        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))
        self.stdout.write(f"Zones created/found: {zones_count}")
        self.stdout.write(f"Slots created/found: {slots_count}")
        self.stdout.write(f"Users created/found: {users_count}")
        self.stdout.write("==================================================")
        for zone_name, slot_cnt in zone_slot_summary:
            self.stdout.write(f"  * Zone: {zone_name} | Slots: {slot_cnt}")
        self.stdout.write("==================================================")
