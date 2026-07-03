import json
import urllib.request
import urllib.error
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from apps.accounts.models import User
from apps.parking.models import ParkingSlot, SlotStatus

class Command(BaseCommand):
    help = 'Runs end-to-end integration tests for the slots check-in API endpoint against the live server'

    def make_post_request(self, url_path, token=None, body=None):
        url = f"http://localhost:8000{url_path}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        data = json.dumps(body).encode('utf-8') if body is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        
        try:
            with urllib.request.urlopen(req) as response:
                status_code = response.status
                resp_bytes = response.read()
                resp_str = resp_bytes.decode('utf-8')
                try:
                    resp_json = json.loads(resp_str)
                except json.JSONDecodeError:
                    resp_json = resp_str
                return status_code, resp_json
        except urllib.error.HTTPError as e:
            status_code = e.code
            resp_bytes = e.read()
            resp_str = resp_bytes.decode('utf-8')
            try:
                resp_json = json.loads(resp_str)
            except json.JSONDecodeError:
                resp_json = resp_str
            return status_code, resp_json
        except Exception as e:
            return 0, str(e)

    def print_failure(self, test_name, status_code, resp_json, slot):
        self.stdout.write(self.style.ERROR(f"FAILURE on {test_name}"))
        self.stdout.write(f"Actual HTTP status: {status_code}")
        self.stdout.write(f"Response body: {resp_json}")
        if slot:
            slot.refresh_from_db()
            self.stdout.write(f"DB Slot State: ID={slot.id}, Code={slot.slot_code}, Status={slot.current_status}")

    def handle(self, *args, **options):
        # Setup (run once before all tests):
        # 1. Obtain DRIVER and MARSHAL users from DB to clear their cache or verify existence
        try:
            driver_user = User.objects.get(email='driver@easypark.test')
            marshal_user = User.objects.get(email='marshal@easypark.test')
        except User.DoesNotExist as e:
            raise CommandError(f"Driver or Marshal user not found. Seed DB first: {e}")

        # 2. Obtain a DRIVER token
        login_body_driver = {
            "email": "driver@easypark.test",
            "password": "TestDriver99!"
        }
        status_driver, resp_driver = self.make_post_request("/api/v1/auth/login/", body=login_body_driver)
        if status_driver != 200:
            self.print_failure("Setup: DRIVER Token Retrieval", status_driver, resp_driver, None)
            raise CommandError("DRIVER token retrieval failed during setup")
        driver_token = resp_driver.get("access")

        # 3. Obtain a MARSHAL token
        login_body_marshal = {
            "email": "marshal@easypark.test",
            "password": "TestMarshal99!"
        }
        status_marshal, resp_marshal = self.make_post_request("/api/v1/auth/login/", body=login_body_marshal)
        if status_marshal != 200:
            self.print_failure("Setup: MARSHAL Token Retrieval", status_marshal, resp_marshal, None)
            raise CommandError("MARSHAL token retrieval failed during setup")
        marshal_token = resp_marshal.get("access")

        # 4. Fetch a FREE slot from the database
        slot = ParkingSlot.objects.filter(current_status=SlotStatus.FREE).first()
        if not slot:
            slot = ParkingSlot.objects.first()
            if not slot:
                raise CommandError("No parking slots exist in the database. Run seed_db first.")
            slot.current_status = SlotStatus.FREE
            slot.save()

        # TEST 1 — UAT-01: Valid geofenced check-in
        slot.current_status = SlotStatus.FREE
        slot.save()
        cache.delete(f"last_location:{driver_user.id}")

        offset_lat_4m = slot.coordinate.y + (4.0 / 111320.0)
        body_test1 = {
            "latitude": offset_lat_4m,
            "longitude": slot.coordinate.x
        }
        status_t1, resp_t1 = self.make_post_request(f"/api/v1/slots/{slot.id}/checkin/", token=driver_token, body=body_test1)
        
        if status_t1 != 200:
            self.print_failure("TEST 1 — UAT-01: Valid check-in", status_t1, resp_t1, slot)
            raise CommandError("TEST 1 failed")
        
        if isinstance(resp_t1, dict) and resp_t1.get("current_status") != "OCCUPIED":
            self.print_failure("TEST 1 — UAT-01: Valid check-in (Status expected 'OCCUPIED')", status_t1, resp_t1, slot)
            raise CommandError("TEST 1 failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.OCCUPIED:
            self.print_failure("TEST 1 — UAT-01: Valid check-in (DB Status expected 'OCCUPIED')", status_t1, resp_t1, slot)
            raise CommandError("TEST 1 failed")
        
        self.stdout.write("TEST 1 PASS — UAT-01: valid check-in accepted, slot OCCUPIED")

        # TEST 2 — UAT-02: Geofence breach rejection
        slot.current_status = SlotStatus.FREE
        slot.save()
        cache.delete(f"last_location:{driver_user.id}")

        offset_lat_50m = slot.coordinate.y + (50.0 / 111320.0)
        body_test2 = {
            "latitude": offset_lat_50m,
            "longitude": slot.coordinate.x
        }
        status_t2, resp_t2 = self.make_post_request(f"/api/v1/slots/{slot.id}/checkin/", token=driver_token, body=body_test2)

        if status_t2 != 400:
            self.print_failure("TEST 2 — UAT-02: Geofence breach rejection", status_t2, resp_t2, slot)
            raise CommandError("TEST 2 failed")

        error_msg = resp_t2.get("error") if isinstance(resp_t2, dict) else ""
        if "Geofence" not in str(error_msg):
            self.print_failure("TEST 2 — UAT-02: Geofence breach rejection (expected 'Geofence' in error)", status_t2, resp_t2, slot)
            raise CommandError("TEST 2 failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.print_failure("TEST 2 — UAT-02: Geofence breach rejection (DB status changed)", status_t2, resp_t2, slot)
            raise CommandError("TEST 2 failed")

        self.stdout.write("TEST 2 PASS — UAT-02: 50m point rejected, slot remains FREE")

        # TEST 3 — UAT-05 partial: RBAC blocks marshal on driver endpoint
        # Reset the slot to FREE just in case
        slot.current_status = SlotStatus.FREE
        slot.save()
        cache.delete(f"last_location:{marshal_user.id}")

        body_test3 = {
            "latitude": offset_lat_4m,
            "longitude": slot.coordinate.x
        }
        status_t3, resp_t3 = self.make_post_request(f"/api/v1/slots/{slot.id}/checkin/", token=marshal_token, body=body_test3)

        if status_t3 != 403:
            self.print_failure("TEST 3 — UAT-05 partial: RBAC blocks marshal", status_t3, resp_t3, slot)
            raise CommandError("TEST 3 failed")

        self.stdout.write("TEST 3 PASS — UAT-05: marshal blocked from check-in endpoint")

        # TEST 4 — Invalid coordinates rejection
        cache.delete(f"last_location:{driver_user.id}")
        body_test4 = {
            "latitude": 999,
            "longitude": 36.8
        }
        status_t4, resp_t4 = self.make_post_request(f"/api/v1/slots/{slot.id}/checkin/", token=driver_token, body=body_test4)

        if status_t4 != 400:
            self.print_failure("TEST 4 — Invalid coordinates rejection", status_t4, resp_t4, slot)
            raise CommandError("TEST 4 failed")

        self.stdout.write("TEST 4 PASS — out-of-range latitude rejected")

        # TEST 5 — Unauthenticated request rejection
        body_test5 = {
            "latitude": offset_lat_4m,
            "longitude": slot.coordinate.x
        }
        status_t5, resp_t5 = self.make_post_request(f"/api/v1/slots/{slot.id}/checkin/", token=None, body=body_test5)

        if status_t5 != 401:
            self.print_failure("TEST 5 — Unauthenticated request rejection", status_t5, resp_t5, slot)
            raise CommandError("TEST 5 failed")

        self.stdout.write("TEST 5 PASS — unauthenticated request rejected")

        # On all passing:
        self.stdout.write("ALL CHECK-IN ENDPOINT TESTS PASSED")
