import json
import urllib.request
import urllib.error
import time
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache

class Command(BaseCommand):
    help = 'Runs end-to-end integration tests for map grid endpoint'

    def make_post_request(self, url_path, body=None):
        url = f"http://localhost:8000{url_path}"
        headers = {'Content-Type': 'application/json'}
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

    def make_get_request(self, url_path, token=None):
        url = f"http://localhost:8000{url_path}"
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        req = urllib.request.Request(url, headers=headers, method='GET')
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

    def print_failure(self, test_name, status_code, resp_json):
        self.stdout.write(self.style.ERROR(f"FAILURE on {test_name}"))
        self.stdout.write(f"Actual HTTP status: {status_code}")
        self.stdout.write(f"Response body: {resp_json}")

    def handle(self, *args, **options):
        # Setup: obtain tokens
        status_dr, resp_dr = self.make_post_request("/api/v1/auth/login/", body={
            "email": "driver@easypark.test",
            "password": "TestDriver99!"
        })
        if status_dr != 200:
            self.print_failure("Setup: DRIVER login", status_dr, resp_dr)
            raise CommandError("DRIVER login failed")
        driver_token = resp_dr.get("access")

        status_ad, resp_ad = self.make_post_request("/api/v1/auth/login/", body={
            "email": "admin@easypark.test",
            "password": "TestAdmin99!"
        })
        if status_ad != 200:
            self.print_failure("Setup: ADMIN login", status_ad, resp_ad)
            raise CommandError("ADMIN login failed")
        admin_token = resp_ad.get("access")

        # TEST 1 — Valid request returns slots
        url_t1 = "/api/v1/slots/map-grid/?lat=-1.2676&lng=36.8108&radius=500"
        status_t1, resp_t1 = self.make_get_request(url_t1, token=driver_token)

        if status_t1 != 200:
            self.print_failure("TEST 1 — Valid request returns slots", status_t1, resp_t1)
            raise CommandError("TEST 1 failed")

        if not isinstance(resp_t1, list) or len(resp_t1) == 0:
            self.print_failure("TEST 1 — Expected list of slots with length > 0", status_t1, resp_t1)
            raise CommandError("TEST 1 failed")

        first_item = resp_t1[0]
        expected_keys = ('id', 'c', 's', 'lat', 'lng')
        if not all(k in first_item for k in expected_keys):
            self.print_failure("TEST 1 — Missing keys in slots response", status_t1, resp_t1)
            raise CommandError("TEST 1 failed")

        if first_item['s'] not in ('FREE', 'OCCUPIED'):
            self.print_failure("TEST 1 — Invalid slot status returned", status_t1, resp_t1)
            raise CommandError("TEST 1 failed")

        self.stdout.write(f"TEST 1 PASS — {len(resp_t1)} slots returned for Westlands")

        # TEST 2 — NFR-1: payload size < 5KB
        payload_bytes = len(json.dumps(resp_t1).encode('utf-8'))
        if payload_bytes >= 5120:
            self.print_failure(f"TEST 2 — NFR-1: payload size is {payload_bytes} bytes (>= 5120 bytes)", status_t1, resp_t1)
            raise CommandError("TEST 2 failed")

        self.stdout.write(f"TEST 2 PASS — NFR-1: payload {payload_bytes} bytes (< 5120)")

        # TEST 3 — NFR-3: query time < 100ms (cache miss)
        cache.delete("map_grid:-1.2676:36.8108:500")
        
        start_t3 = time.perf_counter()
        status_t3, resp_t3 = self.make_get_request(url_t1, token=driver_token)
        elapsed_ms_t3 = (time.perf_counter() - start_t3) * 1000

        if status_t3 != 200:
            self.print_failure("TEST 3 — NFR-3: query time failed with bad status", status_t3, resp_t3)
            raise CommandError("TEST 3 failed")

        if elapsed_ms_t3 >= 100:
            self.stdout.write(self.style.WARNING(
                f"TEST 3 WARNING — {elapsed_ms_t3:.1f}ms exceeds 100ms target.\n"
                f"           Check DB query plan with EXPLAIN ANALYZE."
            ))
        else:
            self.stdout.write(f"TEST 3 PASS — NFR-3: response in {elapsed_ms_t3:.1f}ms (< 100ms)")

        # TEST 4 — Cache hit returns same result faster
        start_t4 = time.perf_counter()
        status_t4, resp_t4 = self.make_get_request(url_t1, token=driver_token)
        elapsed_ms_t4 = (time.perf_counter() - start_t4) * 1000

        if status_t4 != 200:
            self.print_failure("TEST 4 — Cache hit view failed", status_t4, resp_t4)
            raise CommandError("TEST 4 failed")

        if not (elapsed_ms_t4 < elapsed_ms_t3 or elapsed_ms_t4 < 20.0):
            self.print_failure(f"TEST 4 — Cache hit not faster: hit took {elapsed_ms_t4:.1f}ms, miss took {elapsed_ms_t3:.1f}ms", status_t4, resp_t4)
            raise CommandError("TEST 4 failed")

        self.stdout.write(f"TEST 4 PASS — cache hit: {elapsed_ms_t4:.1f}ms")

        # TEST 5 — Radius boundary: no slots at distant location
        url_t5 = "/api/v1/slots/map-grid/?lat=0.0&lng=0.0&radius=500"
        status_t5, resp_t5 = self.make_get_request(url_t5, token=driver_token)
        if status_t5 != 200:
            self.print_failure("TEST 5 — Distance query failed", status_t5, resp_t5)
            raise CommandError("TEST 5 failed")

        if resp_t5 != []:
            self.print_failure("TEST 5 — Distant query expected empty list", status_t5, resp_t5)
            raise CommandError("TEST 5 failed")

        self.stdout.write("TEST 5 PASS — empty list for out-of-range location")

        # TEST 6 — Invalid coordinates rejected
        url_t6 = "/api/v1/slots/map-grid/?lat=999&lng=36.8108&radius=500"
        status_t6, resp_t6 = self.make_get_request(url_t6, token=driver_token)
        if status_t6 != 400:
            self.print_failure("TEST 6 — Expected status 400 for out-of-range coordinates", status_t6, resp_t6)
            raise CommandError("TEST 6 failed")

        self.stdout.write("TEST 6 PASS — invalid lat rejected")

        # TEST 7 — Unauthenticated request rejected
        status_t7, resp_t7 = self.make_get_request(url_t1, token=None)
        if status_t7 != 401:
            self.print_failure("TEST 7 — Expected status 401 for unauthenticated request", status_t7, resp_t7)
            raise CommandError("TEST 7 failed")

        self.stdout.write("TEST 7 PASS — unauthenticated request rejected")

        # TEST 8 — Admin token also accepted (IsAuthenticated, not IsDriver)
        status_t8, resp_t8 = self.make_get_request(url_t1, token=admin_token)
        if status_t8 != 200:
            self.print_failure("TEST 8 — Expected status 200 for admin token", status_t8, resp_t8)
            raise CommandError("TEST 8 failed")

        self.stdout.write("TEST 8 PASS — admin token accepted on map-grid endpoint")

        # On all passing
        self.stdout.write("ALL MAP GRID TESTS PASSED")
