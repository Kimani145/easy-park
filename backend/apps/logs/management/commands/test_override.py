import json
import urllib.request
import urllib.error
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from apps.accounts.models import User
from apps.parking.models import ParkingSlot, SlotStatus
from apps.logs.models import UpdateLog
from apps.logs.conflict import resolve_slot_status

class Command(BaseCommand):
    help = 'Runs end-to-end integration tests for marshal override and conflict resolution'

    def make_request(self, method, url_path, token=None, body=None):
        url = f"http://localhost:8000{url_path}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        data = json.dumps(body).encode('utf-8') if body is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
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
            self.stdout.write(f"DB Slot State: ID={slot.id}, Code={slot.slot_code}, Status={slot.current_status}, Confidence={slot.confidence_score}")
            log_count = UpdateLog.objects.filter(slot=slot).count()
            self.stdout.write(f"UpdateLog Count for Slot: {log_count}")

    def handle(self, *args, **options):
        # Setup:
        # Obtain tokens
        try:
            driver_user = User.objects.get(email='driver@easypark.test')
            marshal_user = User.objects.get(email='marshal@easypark.test')
            admin_user = User.objects.get(email='admin@easypark.test')
        except User.DoesNotExist as e:
            raise CommandError(f"Test users not found. Seed DB first: {e}")

        # Get DRIVER token
        status_dr, resp_dr = self.make_request("POST", "/api/v1/auth/login/", body={
            "email": "driver@easypark.test",
            "password": "TestDriver99!"
        })
        if status_dr != 200:
            self.print_failure("Setup: DRIVER Login", status_dr, resp_dr, None)
            raise CommandError("DRIVER login failed")
        driver_token = resp_dr.get("access")

        # Get MARSHAL token
        status_ma, resp_ma = self.make_request("POST", "/api/v1/auth/login/", body={
            "email": "marshal@easypark.test",
            "password": "TestMarshal99!"
        })
        if status_ma != 200:
            self.print_failure("Setup: MARSHAL Login", status_ma, resp_ma, None)
            raise CommandError("MARSHAL login failed")
        marshal_token = resp_ma.get("access")

        # Get ADMIN token
        status_ad, resp_ad = self.make_request("POST", "/api/v1/auth/login/", body={
            "email": "admin@easypark.test",
            "password": "TestAdmin99!"
        })
        if status_ad != 200:
            self.print_failure("Setup: ADMIN Login", status_ad, resp_ad, None)
            raise CommandError("ADMIN login failed")
        admin_token = resp_ad.get("access")

        # Fetch/reset FREE slot
        slot = ParkingSlot.objects.filter(current_status=SlotStatus.FREE).first()
        if not slot:
            slot = ParkingSlot.objects.first()
            if not slot:
                raise CommandError("No slots exist in database. Seed DB first.")
            slot.current_status = SlotStatus.FREE
            slot.save()

        # Clean existing logs for the slot to have clean assertion counts
        UpdateLog.objects.filter(slot=slot).delete()

        # TEST 1 — UAT-03: Marshal overrides driver check-in
        # Step A: Driver checks in (4m offset)
        slot.current_status = SlotStatus.FREE
        slot.save()
        cache.delete(f"last_location:{driver_user.id}")

        offset_lat_4m = slot.coordinate.y + (4.0 / 111320.0)
        body_checkin = {
            "latitude": offset_lat_4m,
            "longitude": slot.coordinate.x
        }
        status_c1, resp_c1 = self.make_request("POST", f"/api/v1/slots/{slot.id}/checkin/", token=driver_token, body=body_checkin)
        if status_c1 != 200:
            self.print_failure("TEST 1 - Step A: Driver check-in", status_c1, resp_c1, slot)
            raise CommandError("TEST 1 failed at Step A")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.OCCUPIED:
            self.print_failure("TEST 1 - Step A check-in state mismatch", status_c1, resp_c1, slot)
            raise CommandError("TEST 1 failed at Step A state verification")

        # Step B: Marshal overrides to FREE
        body_override = {"status": "FREE"}
        status_ov, resp_ov = self.make_request("PATCH", f"/api/v1/slots/{slot.id}/override/", token=marshal_token, body=body_override)
        if status_ov != 200:
            self.print_failure("TEST 1 - Step B: Marshal override", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step B")

        if not isinstance(resp_ov, dict) or resp_ov.get("source_weight") != "1.00" or resp_ov.get("current_status") != "FREE":
            self.print_failure("TEST 1 - Step B override response mismatch", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step B response verification")

        # Step C: Verify DB state
        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.print_failure("TEST 1 - Step C DB slot status mismatch", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step C slot status verification")
        
        if slot.confidence_score != Decimal("1.00"):
            self.print_failure("TEST 1 - Step C DB slot confidence mismatch", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step C slot confidence verification")

        logs_count = UpdateLog.objects.filter(slot=slot).count()
        if logs_count < 2:
            self.print_failure(f"TEST 1 - Step C DB logs count mismatch (got {logs_count}, expected >= 2)", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step C logs count verification")

        latest_log = UpdateLog.objects.filter(slot=slot).order_by('-logged_at').first()
        if latest_log.source_weight != Decimal("1.00"):
            self.print_failure("TEST 1 - Step C latest log source weight mismatch", status_ov, resp_ov, slot)
            raise CommandError("TEST 1 failed at Step C latest log verification")

        self.stdout.write("TEST 1 PASS — UAT-03: marshal override beats driver, DB state correct")

        # TEST 2 — UAT-05: Driver blocked from override endpoint
        status_t2, resp_t2 = self.make_request("PATCH", f"/api/v1/slots/{slot.id}/override/", token=driver_token, body={"status": "OCCUPIED"})
        if status_t2 != 403:
            self.print_failure("TEST 2 — UAT-05: Driver override block", status_t2, resp_t2, slot)
            raise CommandError("TEST 2 failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.print_failure("TEST 2 — UAT-05: Driver override block (status changed)", status_t2, resp_t2, slot)
            raise CommandError("TEST 2 failed")

        self.stdout.write("TEST 2 PASS — UAT-05: driver blocked from override endpoint")

        # TEST 3 — Admin can override (role coverage)
        status_t3, resp_t3 = self.make_request("PATCH", f"/api/v1/slots/{slot.id}/override/", token=admin_token, body={"status": "OCCUPIED"})
        if status_t3 != 200:
            self.print_failure("TEST 3 — Admin override", status_t3, resp_t3, slot)
            raise CommandError("TEST 3 failed")

        if not isinstance(resp_t3, dict) or resp_t3.get("source_weight") != "1.00":
            self.print_failure("TEST 3 — Admin override response mismatch", status_t3, resp_t3, slot)
            raise CommandError("TEST 3 failed response verification")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.OCCUPIED:
            self.print_failure("TEST 3 — Admin override DB status mismatch", status_t3, resp_t3, slot)
            raise CommandError("TEST 3 failed DB status verification")

        self.stdout.write("TEST 3 PASS — admin override accepted with weight 1.00")

        # TEST 4 — Invalid status value rejected
        status_t4, resp_t4 = self.make_request("PATCH", f"/api/v1/slots/{slot.id}/override/", token=marshal_token, body={"status": "BROKEN"})
        if status_t4 != 400:
            self.print_failure("TEST 4 — Invalid status value", status_t4, resp_t4, slot)
            raise CommandError("TEST 4 failed")

        self.stdout.write("TEST 4 PASS — invalid status value rejected")

        # TEST 5 — Unauthenticated request rejected
        status_t5, resp_t5 = self.make_request("PATCH", f"/api/v1/slots/{slot.id}/override/", token=None, body={"status": "FREE"})
        if status_t5 != 401:
            self.print_failure("TEST 5 — Unauthenticated request", status_t5, resp_t5, slot)
            raise CommandError("TEST 5 failed")

        self.stdout.write("TEST 5 PASS — unauthenticated override rejected")

        # TEST 6 — Conflict resolution: verify weight ordering
        # Create two UpdateLog entries directly in the DB
        log_a = UpdateLog.objects.create(
            slot=slot,
            user=driver_user,
            reported_status='OCCUPIED',
            source_weight=Decimal('0.40'),
            idempotency_key='test-driver-log'
        )
        log_b = UpdateLog.objects.create(
            slot=slot,
            user=marshal_user,
            reported_status='FREE',
            source_weight=Decimal('1.00'),
            idempotency_key='test-marshal-log'
        )

        resolved = resolve_slot_status(slot)
        
        # Clean up
        log_a.delete()
        log_b.delete()

        if resolved != 'FREE':
            self.stdout.write(self.style.ERROR(f"TEST 6 FAIL — Expected resolution 'FREE', got '{resolved}'"))
            raise CommandError("TEST 6 failed")

        self.stdout.write("TEST 6 PASS — conflict resolution: marshal weight wins over driver")

        # All passed
        self.stdout.write("ALL OVERRIDE AND CONFLICT RESOLUTION TESTS PASSED")
