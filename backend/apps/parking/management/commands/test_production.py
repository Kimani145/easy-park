import json
import urllib.request
import urllib.error
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.contrib.gis.geos import Point
from apps.parking.models import ParkingSlot, SlotStatus
from apps.logs.models import UpdateLog

# Constants for geofencing offsets
GEOFENCE_OK_OFFSET_METERS = 4.0
GEOFENCE_BREACH_OFFSET_METERS = 50.0
METERS_PER_DEGREE = 111320.0

VALID_GEOFENCE_OFFSET = GEOFENCE_OK_OFFSET_METERS / METERS_PER_DEGREE
INVALID_GEOFENCE_OFFSET = GEOFENCE_BREACH_OFFSET_METERS / METERS_PER_DEGREE

class Command(BaseCommand):
    help = 'Runs all 5 UAT profiles from the SRS against the production URL'

    def add_arguments(self, parser):
        parser.add_argument(
            '--base-url',
            type=str,
            default='https://easypark-backend.fly.dev',
            help='Base URL of the live production server'
        )

    def make_request(self, url, method="GET", token=None, body=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        data = json.dumps(body).encode('utf-8') if body is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req) as response:
                status_code = response.status
                resp_data = response.read().decode('utf-8')
                resp_json = json.loads(resp_data) if resp_data else {}
                return status_code, resp_json
        except urllib.error.HTTPError as e:
            status_code = e.code
            resp_data = e.read().decode('utf-8')
            try:
                resp_json = json.loads(resp_data)
            except json.JSONDecodeError:
                resp_json = resp_data
            return status_code, resp_json
        except Exception as e:
            return 0, str(e)

    def handle(self, *args, **options):
        base_url = options['base_url']
        self.stdout.write(f"Starting production verification against: {base_url}")

        # Setup - Step 1: Login as driver, marshal, and admin to retrieve tokens
        login_url = f"{base_url}/api/v1/auth/login/"
        
        # Driver Login
        status, resp = self.make_request(login_url, method="POST", body={
            "email": "driver@easypark.test",
            "password": "TestDriver99!"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"Driver login failed. Status: {status}, Response: {resp}"))
            raise CommandError("DRIVER token retrieval failed during setup")
        driver_token = resp.get("access")

        # Marshal Login
        status, resp = self.make_request(login_url, method="POST", body={
            "email": "marshal@easypark.test",
            "password": "TestMarshal99!"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"Marshal login failed. Status: {status}, Response: {resp}"))
            raise CommandError("MARSHAL token retrieval failed during setup")
        marshal_token = resp.get("access")

        # Admin Login
        status, resp = self.make_request(login_url, method="POST", body={
            "email": "admin@easypark.test",
            "password": "TestAdmin99!"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"Admin login failed. Status: {status}, Response: {resp}"))
            raise CommandError("ADMIN token retrieval failed during setup")
        admin_token = resp.get("access")

        # Setup - Step 2: Clear idempotency logs to make tests fully re-runnable
        UpdateLog.objects.filter(idempotency_key__in=['prod-uattest-001', 'prod-uattest-002']).delete()

        # Setup - Step 3: Fetch or prepare a FREE slot
        slot = ParkingSlot.objects.filter(current_status=SlotStatus.FREE).first()
        if not slot:
            slot = ParkingSlot.objects.first()
            if not slot:
                raise CommandError("No parking slots found in the database. Please run seed_db.")
            
            # Reset the slot to FREE via marshal override endpoint using the MARSHAL token
            override_url = f"{base_url}/api/v1/slots/{slot.id}/override/"
            status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
                "status": "FREE"
            })
            if status != 200:
                self.stdout.write(self.style.ERROR(f"Failed to reset slot via marshal override. Status: {status}, Response: {resp}"))
                raise CommandError("Failed to prepare slot during setup")
            slot.refresh_from_db()

        # ----------------------------------------------------------------------
        # UAT-01: Valid Geofenced Check-in
        # ----------------------------------------------------------------------
        offset_lat = slot.coordinate.y + VALID_GEOFENCE_OFFSET
        checkin_url = f"{base_url}/api/v1/slots/{slot.id}/checkin/"
        status, resp = self.make_request(checkin_url, method="POST", token=driver_token, body={
            "latitude": offset_lat,
            "longitude": slot.coordinate.x
        })

        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-01 FAIL — Expected HTTP 200, got {status}"))
            self.stdout.write(f"Response body: {resp}")
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-01 Verification Failed")
        
        if resp.get('current_status') != 'OCCUPIED':
            self.stdout.write(self.style.ERROR(f"UAT-01 FAIL — Expected response status to be OCCUPIED, got {resp.get('current_status')}"))
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-01 Verification Failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.OCCUPIED:
            self.stdout.write(self.style.ERROR(f"UAT-01 FAIL — DB slot status is {slot.current_status}, expected OCCUPIED"))
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-01 Verification Failed")

        self.stdout.write(self.style.SUCCESS("UAT-01 PASS — valid geofenced check-in accepted"))

        # ----------------------------------------------------------------------
        # UAT-02: Geofence Breach Rejection
        # ----------------------------------------------------------------------
        # Reset slot to FREE via override
        override_url = f"{base_url}/api/v1/slots/{slot.id}/override/"
        status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
            "status": "FREE"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-02 Setup Fail — Override reset failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-02 Setup Failed")

        offset_lat_50m = slot.coordinate.y + INVALID_GEOFENCE_OFFSET
        status, resp = self.make_request(checkin_url, method="POST", token=driver_token, body={
            "latitude": offset_lat_50m,
            "longitude": slot.coordinate.x
        })

        if status != 400:
            self.stdout.write(self.style.ERROR(f"UAT-02 FAIL — Expected HTTP 400, got {status}"))
            self.stdout.write(f"Response body: {resp}")
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-02 Verification Failed")

        error_message = resp.get('error', '') or resp.get('detail', '')
        if 'Geofence' not in error_message and 'geofence' not in str(error_message):
            self.stdout.write(self.style.ERROR(f"UAT-02 FAIL — Expected 'Geofence' in error message, got: {resp}"))
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-02 Verification Failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.stdout.write(self.style.ERROR(f"UAT-02 FAIL — DB slot status changed to {slot.current_status}, expected FREE"))
            self.stdout.write(f"PRODUCTION URL: {base_url}")
            raise CommandError("UAT-02 Verification Failed")

        self.stdout.write(self.style.SUCCESS("UAT-02 PASS — geofence breach rejected, slot unchanged"))

        # ----------------------------------------------------------------------
        # UAT-03: Marshal Conflict Override
        # ----------------------------------------------------------------------
        # Reset slot to FREE
        status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
            "status": "FREE"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-03 Setup Fail — Reset failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-03 Setup Failed")

        # Step A: Driver checks in (4m offset)
        status, resp = self.make_request(checkin_url, method="POST", token=driver_token, body={
            "latitude": slot.coordinate.y + VALID_GEOFENCE_OFFSET,
            "longitude": slot.coordinate.x
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-03 Step A FAIL — Driver check-in failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-03 Verification Failed")

        # Step B: Marshal overrides to FREE
        status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
            "status": "FREE"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-03 Step B FAIL — Marshal override failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-03 Verification Failed")

        # Assert response['source_weight'] == '1.00' and response['current_status'] == 'FREE'
        weight = resp.get('source_weight')
        if str(weight) != "1.00":
            self.stdout.write(self.style.ERROR(f"UAT-03 FAIL — Expected marshal source_weight 1.00, got: {weight}"))
            raise CommandError("UAT-03 Verification Failed")

        if resp.get('current_status') != 'FREE':
            self.stdout.write(self.style.ERROR(f"UAT-03 FAIL — Expected response current_status to be FREE, got: {resp.get('current_status')}"))
            raise CommandError("UAT-03 Verification Failed")

        # Step C: Verify DB state via ORM
        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.stdout.write(self.style.ERROR(f"UAT-03 Step C FAIL — DB current_status is {slot.current_status}, expected FREE"))
            raise CommandError("UAT-03 Verification Failed")

        if slot.confidence_score != Decimal('1.00'):
            self.stdout.write(self.style.ERROR(f"UAT-03 Step C FAIL — DB confidence_score is {slot.confidence_score}, expected 1.00"))
            raise CommandError("UAT-03 Verification Failed")

        self.stdout.write(self.style.SUCCESS("UAT-03 PASS — marshal override beats driver, weight 1.00 confirmed"))

        # ----------------------------------------------------------------------
        # UAT-04: Offline Synchronisation (Bulk Sync)
        # ----------------------------------------------------------------------
        # Reset slot to FREE
        status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
            "status": "FREE"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-04 Setup Fail — Reset failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-04 Setup Failed")

        # Build batch payload with 2 actions
        action_1 = {
            "idempotency_key": "prod-uattest-001",
            "slot_id": str(slot.id),
            "action": "STATUS_OVERRIDE",
            "payload": {"status": "OCCUPIED"},
            "original_timestamp": "2026-07-10T12:00:00Z"
        }
        action_2 = {
            "idempotency_key": "prod-uattest-002",
            "slot_id": str(slot.id),
            "action": "STATUS_OVERRIDE",
            "payload": {"status": "FREE"},
            "original_timestamp": "2026-07-10T12:05:00Z"
        }
        
        batch_payload = {
            "sync_batch_id": "prod-batch-001",
            "client_device_time": "2026-07-10T12:10:00Z",
            "queued_actions": [action_1, action_2]
        }

        sync_url = f"{base_url}/api/v1/sync/bulk/"
        status, resp = self.make_request(sync_url, method="POST", token=marshal_token, body=batch_payload)
        
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-04 FAIL — Bulk sync failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-04 Verification Failed")

        if resp.get('processed') != 2 or resp.get('skipped_duplicate') != 0:
            self.stdout.write(self.style.ERROR(f"UAT-04 FAIL — Unexpected bulk sync counts. Response: {resp}"))
            raise CommandError("UAT-04 Verification Failed")

        # Submit the same batch again immediately
        status_dup, resp_dup = self.make_request(sync_url, method="POST", token=marshal_token, body=batch_payload)
        if status_dup != 200:
            self.stdout.write(self.style.ERROR(f"UAT-04 Duplication FAIL — Duplicate bulk sync failed. Status: {status_dup}, Response: {resp_dup}"))
            raise CommandError("UAT-04 Verification Failed")

        if resp_dup.get('processed') != 0 or resp_dup.get('skipped_duplicate') != 2:
            self.stdout.write(self.style.ERROR(f"UAT-04 Duplication FAIL — Duplicate counts mismatch. Response: {resp_dup}"))
            raise CommandError("UAT-04 Verification Failed")

        # Re-fetch slot and assert current_status is FREE (chronological: OCCUPIED then FREE)
        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.stdout.write(self.style.ERROR(f"UAT-04 DB FAIL — Expected final status FREE, got: {slot.current_status}"))
            raise CommandError("UAT-04 Verification Failed")

        self.stdout.write(self.style.SUCCESS("UAT-04 PASS — bulk sync processed, duplicates rejected"))

        # ----------------------------------------------------------------------
        # UAT-05: RBAC Security Block
        # ----------------------------------------------------------------------
        # Reset slot to FREE
        status, resp = self.make_request(override_url, method="PATCH", token=marshal_token, body={
            "status": "FREE"
        })
        if status != 200:
            self.stdout.write(self.style.ERROR(f"UAT-05 Setup Fail — Reset failed. Status: {status}, Response: {resp}"))
            raise CommandError("UAT-05 Setup Failed")

        # PATCH override with DRIVER token (wrong role)
        status, resp = self.make_request(override_url, method="PATCH", token=driver_token, body={
            "status": "OCCUPIED"
        })

        if status != 403:
            self.stdout.write(self.style.ERROR(f"UAT-05 FAIL — Expected HTTP 403, got {status}"))
            self.stdout.write(f"Response body: {resp}")
            raise CommandError("UAT-05 Verification Failed")

        slot.refresh_from_db()
        if slot.current_status != SlotStatus.FREE:
            self.stdout.write(self.style.ERROR(f"UAT-05 DB FAIL — Slot status changed to {slot.current_status}, expected FREE"))
            raise CommandError("UAT-05 Verification Failed")

        self.stdout.write(self.style.SUCCESS("UAT-05 PASS — driver blocked from marshal endpoint (403)"))

        # ----------------------------------------------------------------------
        # Success Summary
        # ----------------------------------------------------------------------
        self.stdout.write(self.style.SUCCESS("ALL UAT PROFILES PASSED AGAINST PRODUCTION"))
