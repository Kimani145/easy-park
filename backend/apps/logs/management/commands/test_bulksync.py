import json
import urllib.request
import urllib.error
from django.core.management.base import BaseCommand, CommandError
from apps.parking.models import ParkingSlot, SlotStatus
from apps.logs.models import UpdateLog

class Command(BaseCommand):
    help = 'Runs end-to-end integration tests for Bulk Sync API endpoint'

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

    def print_failure(self, test_name, status_code, resp_json, slots=None):
        self.stdout.write(self.style.ERROR(f"FAILURE on {test_name}"))
        self.stdout.write(f"Actual HTTP status: {status_code}")
        self.stdout.write(f"Response body: {resp_json}")
        if slots:
            for name, s in slots.items():
                s.refresh_from_db()
                self.stdout.write(f"DB State for {name}: ID={s.id}, Code={s.slot_code}, Status={s.current_status}")

    def make_payload(self, slot, idem_key, status, timestamp='2026-06-18T22:32:15Z'):
        return {
            "idempotency_key": idem_key,
            "slot_id": str(slot.id),
            "action": "STATUS_OVERRIDE",
            "payload": {"status": status},
            "original_timestamp": timestamp
        }

    def handle(self, *args, **options):
        # Setup:
        # 1. Obtain tokens
        status_dr, resp_dr = self.make_post_request("/api/v1/auth/login/", body={
            "email": "driver@easypark.test",
            "password": "TestDriver99!"
        })
        if status_dr != 200:
            self.print_failure("Setup: DRIVER Login", status_dr, resp_dr)
            raise CommandError("DRIVER login failed")
        driver_token = resp_dr.get("access")

        status_ma, resp_ma = self.make_post_request("/api/v1/auth/login/", body={
            "email": "marshal@easypark.test",
            "password": "TestMarshal99!"
        })
        if status_ma != 200:
            self.print_failure("Setup: MARSHAL Login", status_ma, resp_ma)
            raise CommandError("MARSHAL login failed")
        marshal_token = resp_ma.get("access")

        # 2. Fetch 2 FREE slots
        free_slots = list(ParkingSlot.objects.filter(current_status=SlotStatus.FREE)[:2])
        if len(free_slots) < 2:
            all_slots = list(ParkingSlot.objects.all()[:2])
            if len(all_slots) < 2:
                raise CommandError("No slots exist in database. Seed DB first.")
            for s in all_slots:
                s.current_status = SlotStatus.FREE
                s.save()
            free_slots = all_slots

        slot_a, slot_b = free_slots[0], free_slots[1]

        # 3. Clear existing logs for slot_a and slot_b
        UpdateLog.objects.filter(slot__in=[slot_a, slot_b]).delete()
        # Clear logs with test idempotency keys to ensure they don't block fresh runs
        test_keys = [
            'idem-test-001', 'idem-test-002', 'idem-test-003',
            'idem-test-004', 'idem-test-005', 'idem-chrono-001', 'idem-chrono-002'
        ]
        UpdateLog.objects.filter(idempotency_key__in=test_keys).delete()

        slots_dict = {"slot_a": slot_a, "slot_b": slot_b}

        # TEST 1 — UAT-04: Valid batch processes correctly
        action_1 = self.make_payload(slot_a, 'idem-test-001', 'OCCUPIED')
        action_2 = self.make_payload(slot_b, 'idem-test-002', 'FREE')

        body_t1 = {
            "sync_batch_id": "batch-test-001",
            "client_device_time": "2026-06-18T22:40:00Z",
            "queued_actions": [action_1, action_2]
        }

        status_t1, resp_t1 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t1)
        if status_t1 != 200:
            self.print_failure("TEST 1 — UAT-04: Valid batch", status_t1, resp_t1, slots_dict)
            raise CommandError("TEST 1 failed")

        if not isinstance(resp_t1, dict) or resp_t1.get("processed") != 2 or resp_t1.get("skipped_duplicate") != 0 or resp_t1.get("skipped_invalid") != 0:
            self.print_failure("TEST 1 — UAT-04: Valid batch response mismatch", status_t1, resp_t1, slots_dict)
            raise CommandError("TEST 1 failed")

        slot_a.refresh_from_db()
        slot_b.refresh_from_db()
        if slot_a.current_status != 'OCCUPIED' or slot_b.current_status != 'FREE':
            self.print_failure("TEST 1 — UAT-04: Valid batch slot status mismatch", status_t1, resp_t1, slots_dict)
            raise CommandError("TEST 1 failed")

        logs_count_t1 = UpdateLog.objects.filter(idempotency_key__in=['idem-test-001', 'idem-test-002']).count()
        if logs_count_t1 != 2:
            self.print_failure(f"TEST 1 — UAT-04: Expected 2 log entries, got {logs_count_t1}", status_t1, resp_t1, slots_dict)
            raise CommandError("TEST 1 failed")

        self.stdout.write("TEST 1 PASS — UAT-04: batch processed, 2 slots updated correctly")

        # TEST 2 — Idempotency: same batch submitted again
        status_t2, resp_t2 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t1)
        if status_t2 != 200:
            self.print_failure("TEST 2 — Idempotency duplicate batch", status_t2, resp_t2, slots_dict)
            raise CommandError("TEST 2 failed")

        if not isinstance(resp_t2, dict) or resp_t2.get("processed") != 0 or resp_t2.get("skipped_duplicate") != 2 or resp_t2.get("skipped_invalid") != 0:
            self.print_failure("TEST 2 — Idempotency duplicate batch response mismatch", status_t2, resp_t2, slots_dict)
            raise CommandError("TEST 2 failed")

        logs_count_t2 = UpdateLog.objects.filter(idempotency_key__in=['idem-test-001', 'idem-test-002']).count()
        if logs_count_t2 != 2:
            self.print_failure(f"TEST 2 — Idempotency: Expected 2 logs in DB, got {logs_count_t2}", status_t2, resp_t2, slots_dict)
            raise CommandError("TEST 2 failed")

        self.stdout.write("TEST 2 PASS — idempotency: duplicate batch skipped, DB unchanged")

        # TEST 3 — Partial duplicate: one new, one duplicate
        action_3_1 = self.make_payload(slot_a, 'idem-test-001', 'FREE') # duplicate key
        action_3_2 = self.make_payload(slot_b, 'idem-test-003', 'OCCUPIED') # new key

        body_t3 = {
            "sync_batch_id": "batch-test-002",
            "client_device_time": "2026-06-18T22:45:00Z",
            "queued_actions": [action_3_1, action_3_2]
        }

        status_t3, resp_t3 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t3)
        if status_t3 != 200:
            self.print_failure("TEST 3 — Partial duplicate batch", status_t3, resp_t3, slots_dict)
            raise CommandError("TEST 3 failed")

        if not isinstance(resp_t3, dict) or resp_t3.get("processed") != 1 or resp_t3.get("skipped_duplicate") != 1 or resp_t3.get("skipped_invalid") != 0:
            self.print_failure("TEST 3 — Partial duplicate response mismatch", status_t3, resp_t3, slots_dict)
            raise CommandError("TEST 3 failed")

        slot_a.refresh_from_db()
        slot_b.refresh_from_db()
        if slot_b.current_status != 'OCCUPIED':
            self.print_failure("TEST 3 — Partial duplicate slot_b status mismatch", status_t3, resp_t3, slots_dict)
            raise CommandError("TEST 3 failed")

        if slot_a.current_status != 'OCCUPIED': # Must remain unchanged from TEST 1
            self.print_failure("TEST 3 — Partial duplicate slot_a status was modified", status_t3, resp_t3, slots_dict)
            raise CommandError("TEST 3 failed")

        self.stdout.write("TEST 3 PASS — partial duplicate: 1 processed, 1 skipped correctly")

        # TEST 4 — Invalid action type skipped
        action_4_1 = self.make_payload(slot_a, 'idem-test-004', 'OCCUPIED')
        action_4_2 = self.make_payload(slot_b, 'idem-test-005', 'FREE')
        action_4_2['action'] = 'INVALID_ACTION'

        body_t4 = {
            "sync_batch_id": "batch-test-003",
            "client_device_time": "2026-06-18T22:48:00Z",
            "queued_actions": [action_4_1, action_4_2]
        }

        status_t4, resp_t4 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t4)
        if status_t4 != 200:
            self.print_failure("TEST 4 — Invalid action batch", status_t4, resp_t4, slots_dict)
            raise CommandError("TEST 4 failed")

        if not isinstance(resp_t4, dict) or resp_t4.get("processed") != 1 or resp_t4.get("skipped_duplicate") != 0 or resp_t4.get("skipped_invalid") != 1:
            self.print_failure("TEST 4 — Invalid action response mismatch", status_t4, resp_t4, slots_dict)
            raise CommandError("TEST 4 failed")

        self.stdout.write("TEST 4 PASS — invalid action type skipped, valid action processed")

        # TEST 5 — Invalid slot_id skipped gracefully
        ghost_action = {
            "idempotency_key": "idem-test-ghost",
            "slot_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "action": "STATUS_OVERRIDE",
            "payload": {"status": "OCCUPIED"},
            "original_timestamp": "2026-06-18T22:32:15Z"
        }

        body_t5 = {
            "sync_batch_id": "batch-test-004",
            "client_device_time": "2026-06-18T22:50:00Z",
            "queued_actions": [ghost_action]
        }

        status_t5, resp_t5 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t5)
        if status_t5 != 200:
            self.print_failure("TEST 5 — Invalid slot ID", status_t5, resp_t5, slots_dict)
            raise CommandError("TEST 5 failed")

        if not isinstance(resp_t5, dict) or resp_t5.get("processed") != 0 or resp_t5.get("skipped_duplicate") != 0 or resp_t5.get("skipped_invalid") != 1:
            self.print_failure("TEST 5 — Invalid slot ID response mismatch", status_t5, resp_t5, slots_dict)
            raise CommandError("TEST 5 failed")

        self.stdout.write("TEST 5 PASS — non-existent slot skipped gracefully")

        # TEST 6 — UAT-05: Driver token rejected
        status_t6, resp_t6 = self.make_post_request("/api/v1/sync/bulk/", token=driver_token, body=body_t1)
        if status_t6 != 403:
            self.print_failure("TEST 6 — Driver role block", status_t6, resp_t6, slots_dict)
            raise CommandError("TEST 6 failed")

        self.stdout.write("TEST 6 PASS — UAT-05: driver blocked from bulk sync endpoint")

        # TEST 7 — Unauthenticated request rejected
        status_t7, resp_t7 = self.make_post_request("/api/v1/sync/bulk/", token=None, body=body_t1)
        if status_t7 != 401:
            self.print_failure("TEST 7 — Unauthenticated request", status_t7, resp_t7, slots_dict)
            raise CommandError("TEST 7 failed")

        self.stdout.write("TEST 7 PASS — unauthenticated bulk sync rejected")

        # TEST 8 — Oversized batch rejected
        oversized_actions = []
        for i in range(101):
            oversized_actions.append(self.make_payload(slot_a, f"idem-oversized-{i}", "FREE"))

        body_t8 = {
            "sync_batch_id": "batch-test-oversized",
            "client_device_time": "2026-06-18T22:55:00Z",
            "queued_actions": oversized_actions
        }

        status_t8, resp_t8 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t8)
        if status_t8 != 400:
            self.print_failure("TEST 8 — Oversized batch", status_t8, resp_t8, slots_dict)
            raise CommandError("TEST 8 failed")

        self.stdout.write("TEST 8 PASS — oversized batch (101 actions) rejected at serializer")

        # TEST 9 — Chronological ordering verification
        # Clean slot_a state and logs
        slot_a.current_status = SlotStatus.FREE
        slot_a.save()
        UpdateLog.objects.filter(slot=slot_a).delete()

        # Action 1: newer (applied second, wins)
        action_9_1 = self.make_payload(slot_a, 'idem-chrono-002', 'FREE', timestamp='2026-06-18T22:35:00Z')
        # Action 2: older (applied first, gets overwritten)
        action_9_2 = self.make_payload(slot_a, 'idem-chrono-001', 'OCCUPIED', timestamp='2026-06-18T22:30:00Z')

        body_t9 = {
            "sync_batch_id": "batch-test-chrono",
            "client_device_time": "2026-06-18T22:58:00Z",
            "queued_actions": [action_9_1, action_9_2] # Submitted reverse chronological
        }

        status_t9, resp_t9 = self.make_post_request("/api/v1/sync/bulk/", token=marshal_token, body=body_t9)
        if status_t9 != 200:
            self.print_failure("TEST 9 — Chronological ordering", status_t9, resp_t9, slots_dict)
            raise CommandError("TEST 9 failed")

        if not isinstance(resp_t9, dict) or resp_t9.get("processed") != 2:
            self.print_failure("TEST 9 — Chronological ordering response mismatch", status_t9, resp_t9, slots_dict)
            raise CommandError("TEST 9 failed")

        slot_a.refresh_from_db()
        if slot_a.current_status != 'FREE':
            self.print_failure("TEST 9 — Chronological ordering state mismatch (Expected FREE)", status_t9, resp_t9, slots_dict)
            raise CommandError("TEST 9 failed")

        self.stdout.write("TEST 9 PASS — chronological replay: newer action wins final state")

        # All passed
        self.stdout.write("ALL BULK SYNC TESTS PASSED")
