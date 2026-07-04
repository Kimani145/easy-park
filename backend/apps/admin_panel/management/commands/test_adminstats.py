import json
import time
import urllib.request
import urllib.error
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache

class Command(BaseCommand):
    help = "Integration test for GET /api/v1/admin/stats/"

    def handle(self, *args, **options):
        # 1. Acquire tokens for tests
        self.stdout.write("Obtaining tokens for driver, marshal, and admin...")
        try:
            driver_token = self.get_token("driver@easypark.test", "TestDriver99!")
            marshal_token = self.get_token("marshal@easypark.test", "TestMarshal99!")
            admin_token = self.get_token("admin@easypark.test", "TestAdmin99!")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to obtain JWT tokens. Ensure the development server is running on port 8000 and seed_db has been executed. Error: {e}"))
            raise CommandError("Token acquisition failed.")

        # TEST 1 — RBAC: unauthenticated request rejected
        self.stdout.write("Running TEST 1...")
        status, body, _ = self.make_get_request(token=None)
        if status != 401:
            self.stdout.write(self.style.ERROR(f"TEST 1 FAIL — Expected status 401, got {status}. Body: {body}"))
            raise CommandError("TEST 1 failed.")
        self.stdout.write(self.style.SUCCESS("TEST 1 PASS — unauthenticated request rejected"))

        # TEST 2 — RBAC: driver token rejected
        self.stdout.write("Running TEST 2...")
        status, body, _ = self.make_get_request(token=driver_token)
        if status != 403:
            self.stdout.write(self.style.ERROR(f"TEST 2 FAIL — Expected status 403, got {status}. Body: {body}"))
            raise CommandError("TEST 2 failed.")
        self.stdout.write(self.style.SUCCESS("TEST 2 PASS — driver token rejected (403)"))

        # TEST 3 — RBAC: marshal token rejected
        self.stdout.write("Running TEST 3...")
        status, body, _ = self.make_get_request(token=marshal_token)
        if status != 403:
            self.stdout.write(self.style.ERROR(f"TEST 3 FAIL — Expected status 403, got {status}. Body: {body}"))
            raise CommandError("TEST 3 failed.")
        self.stdout.write(self.style.SUCCESS("TEST 3 PASS — marshal token rejected (403)"))

        # TEST 4 — Admin token accepted, response shape correct
        self.stdout.write("Running TEST 4...")
        status, body, response_data = self.make_get_request(token=admin_token)
        if status != 200:
            self.stdout.write(self.style.ERROR(f"TEST 4 FAIL — Expected status 200, got {status}. Body: {body}"))
            raise CommandError("TEST 4 failed.")

        required_keys = [
            'total_users', 'total_drivers', 'total_marshals',
            'total_slots', 'occupied_slots', 'free_slots',
            'total_zones', 'total_logs', 'generated_at', 'recent_activity'
        ]
        for key in required_keys:
            if key not in response_data:
                self.stdout.write(self.style.ERROR(f"TEST 4 FAIL — Missing key '{key}' in response. Got keys: {list(response_data.keys())}"))
                raise CommandError("TEST 4 failed.")

        # Assert value types and ranges
        try:
            assert isinstance(response_data['total_users'], int) and response_data['total_users'] >= 3, "total_users must be int >= 3"
            assert isinstance(response_data['total_slots'], int) and response_data['total_slots'] >= 24, "total_slots must be int >= 24"
            assert isinstance(response_data['total_zones'], int) and response_data['total_zones'] >= 3, "total_zones must be int >= 3"
            assert response_data['occupied_slots'] + response_data['free_slots'] == response_data['total_slots'], "occupied_slots + free_slots must equal total_slots"
            assert isinstance(response_data['recent_activity'], list), "recent_activity must be a list"
        except AssertionError as ae:
            self.stdout.write(self.style.ERROR(f"TEST 4 FAIL — Value assertions failed: {ae}"))
            raise CommandError("TEST 4 failed.")

        self.stdout.write(self.style.SUCCESS("TEST 4 PASS — admin stats response shape and values correct"))

        # TEST 5 — recent_activity entry shape correct
        self.stdout.write("Running TEST 5...")
        recent_activity = response_data['recent_activity']
        if recent_activity:
            entry = recent_activity[0]
            expected_entry_keys = ['id', 'slot_code', 'zone_name', 'reported_status', 'source_weight', 'logged_at', 'actioned_by']
            for key in expected_entry_keys:
                if key not in entry:
                    self.stdout.write(self.style.ERROR(f"TEST 5 FAIL — Missing key '{key}' in recent_activity entry. Entry: {entry}"))
                    raise CommandError("TEST 5 failed.")

            try:
                assert entry['reported_status'] in ('FREE', 'OCCUPIED'), "reported_status must be FREE or OCCUPIED"
                assert entry['zone_name'] in ('Westlands', 'CBD', 'Kilimani'), "zone_name must be one of seeded zones"
                assert '@' in entry['actioned_by'] or entry['actioned_by'] == 'system', "actioned_by must be an email or 'system'"
            except AssertionError as ae:
                self.stdout.write(self.style.ERROR(f"TEST 5 FAIL — Value assertions failed: {ae}"))
                raise CommandError("TEST 5 failed.")
            self.stdout.write(self.style.SUCCESS("TEST 5 PASS — recent_activity entry shape correct"))
        else:
            self.stdout.write("TEST 5 SKIP — no log entries exist yet (run other tests first)")

        # TEST 6 — Cache: second request returns cached result
        self.stdout.write("Running TEST 6...")
        cache.delete('admin_stats')

        # First request (cache miss)
        start = time.perf_counter()
        status1, body1, data1 = self.make_get_request(token=admin_token)
        first_ms = (time.perf_counter() - start) * 1000
        if status1 != 200:
            self.stdout.write(self.style.ERROR(f"TEST 6 Miss FAIL — Expected status 200, got {status1}. Body: {body1}"))
            raise CommandError("TEST 6 failed.")

        # Second request immediately (cache hit)
        start = time.perf_counter()
        status2, body2, data2 = self.make_get_request(token=admin_token)
        second_ms = (time.perf_counter() - start) * 1000
        if status2 != 200:
            self.stdout.write(self.style.ERROR(f"TEST 6 Hit FAIL — Expected status 200, got {status2}. Body: {body2}"))
            raise CommandError("TEST 6 failed.")

        try:
            assert data2 == data1, "second response JSON must be identical to first response JSON"
            assert second_ms < first_ms, f"cache hit ({second_ms:.2f}ms) must be faster than cache miss ({first_ms:.2f}ms)"
        except AssertionError as ae:
            self.stdout.write(self.style.ERROR(f"TEST 6 FAIL — Cache assertions failed: {ae}"))
            # If second_ms is slightly higher than first_ms due to networking or timing jitter in local environment,
            # we want to print details but still raise CommandError as requested by prompt.
            raise CommandError("TEST 6 failed.")
        self.stdout.write(self.style.SUCCESS(f"TEST 6 PASS — cache hit {second_ms:.1f}ms vs miss {first_ms:.1f}ms"))

        # TEST 7 — Aggregate consistency: occupied + free = total
        self.stdout.write("Running TEST 7...")
        response = data2
        try:
            assert response['occupied_slots'] + response['free_slots'] == response['total_slots'], (
                f"Slot counts inconsistent: {response['occupied_slots']} + "
                f"{response['free_slots']} != {response['total_slots']}"
            )
        except AssertionError as ae:
            self.stdout.write(self.style.ERROR(f"TEST 7 FAIL — {ae}"))
            raise CommandError("TEST 7 failed.")
        self.stdout.write(self.style.SUCCESS("TEST 7 PASS — occupied + free == total_slots (aggregate consistency)"))

        self.stdout.write(self.style.SUCCESS("ALL ADMIN STATS TESTS PASSED"))

    def get_token(self, email, password):
        url = "http://localhost:8000/api/v1/auth/login/"
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["access"]

    def make_get_request(self, token=None):
        url = "http://localhost:8000/api/v1/admin/stats/"
        req = urllib.request.Request(url, method="GET")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req) as response:
                body_bytes = response.read()
                body_str = body_bytes.decode("utf-8")
                return response.status, body_str, json.loads(body_str)
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8")
            return e.code, body_str, None
        except Exception as e:
            return 500, str(e), None
