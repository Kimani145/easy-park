import uuid
import time
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from apps.parking.models import ParkingSlot
from apps.parking.geofence import validate_checkin_coordinates
from apps.parking.velocity import check_velocity

class Command(BaseCommand):
    help = 'Runs verification tests against geofence and velocity validation services'

    def handle(self, *args, **options):
        # Fetch any seeded ParkingSlot from the database
        slot = ParkingSlot.objects.first()
        if not slot:
            raise CommandError("No ParkingSlot found in the database. Please run seed_db first.")

        # Test 1 — Geofence pass (UAT-01 analogue)
        try:
            # slot.coordinate.y = latitude, slot.coordinate.x = longitude
            offset_lat_4m = slot.coordinate.y + (4.0 / 111320.0)
            res1 = validate_checkin_coordinates(str(slot.id), offset_lat_4m, slot.coordinate.x)
            assert res1["valid"] is True, f"Expected valid=True, got {res1}"
            self.stdout.write(self.style.SUCCESS("TEST 1 PASS — 4m point accepted"))
        except AssertionError as e:
            self.stdout.write(self.style.ERROR(f"TEST 1 FAIL — {e}"))
            raise CommandError(f"Test 1 failed: {res1}")

        # Test 2 — Geofence fail (UAT-02 analogue)
        try:
            offset_lat_50m = slot.coordinate.y + (50.0 / 111320.0)
            res2 = validate_checkin_coordinates(str(slot.id), offset_lat_50m, slot.coordinate.x)
            assert res2["valid"] is False, f"Expected valid=False, got {res2}"
            assert res2["reason"] == "Outside geofence boundary", f"Expected 'Outside geofence boundary', got '{res2.get('reason')}'"
            self.stdout.write(self.style.SUCCESS("TEST 2 PASS — 50m point rejected"))
        except AssertionError as e:
            self.stdout.write(self.style.ERROR(f"TEST 2 FAIL — {e}"))
            raise CommandError(f"Test 2 failed: {res2}")

        # Test 3 — Velocity pass (first check-in)
        test_user_id = str(uuid.uuid4())
        try:
            res3 = check_velocity(test_user_id, -1.2676, 36.8108)
            assert res3["valid"] is True, f"Expected valid=True, got {res3}"
            self.stdout.write(self.style.SUCCESS("TEST 3 PASS — first check-in accepted"))
        except AssertionError as e:
            self.stdout.write(self.style.ERROR(f"TEST 3 FAIL — {e}"))
            raise CommandError(f"Test 3 failed: {res3}")

        # Test 4 — Velocity fail (impossible speed)
        try:
            # Manually set cache entry 100km away (~1 degree lat offset is ~111km)
            cache.set(
                f"last_location:{test_user_id}",
                {"lat": -2.2676, "lng": 36.8108, "ts": time.time() - 1.0},
                timeout=3600
            )
            res4 = check_velocity(test_user_id, -1.2676, 36.8108)
            assert res4["valid"] is False, f"Expected valid=False, got {res4}"
            assert "Implausible" in res4.get("reason", ""), f"Expected 'Implausible' in reason, got '{res4.get('reason')}'"
            self.stdout.write(self.style.SUCCESS("TEST 4 PASS — impossible speed rejected"))
        except AssertionError as e:
            self.stdout.write(self.style.ERROR(f"TEST 4 FAIL — {e}"))
            raise CommandError(f"Test 4 failed: {res4}")

        self.stdout.write(self.style.SUCCESS("ALL GEOFENCE AND VELOCITY TESTS PASSED"))
