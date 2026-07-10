# EasyPark — QA Verification & Test Handbook

**API Environment:** Production  
**Base URL:** `https://easypark-backend.fly.dev`  
**Database:** Supabase PostgreSQL + PostGIS (Port 5432)

---

## 🧪 Verification Strategy

This handbook details the verification steps for the 5 User Acceptance Testing (UAT) profiles and Non-Functional Requirements (NFR) of the EasyPark backend service.

---

## 📈 UAT Profiles

### UAT-01: Valid Geofenced Check-in
* **Goal:** Verify that a driver can successfully check in if they are within the 15-meter geofence of a free parking slot.
* **Test Case:**
  1. Login as `driver@easypark.test` and obtain JWT access token.
  2. Query coordinates of a free slot from the database.
  3. Calculate a valid position (e.g., offset by 4 meters north: `latitude = slot_lat + (4.0 / 111320.0)`).
  4. Send `POST /api/v1/slots/{slot_id}/checkin/` with driver credentials and computed coordinates.
  5. Assert response status is `200 OK` and `current_status` is `OCCUPIED`.
  6. Query database directly and verify the slot status changed to `OCCUPIED` with a confidence score of `0.40`.

### UAT-02: Geofence Breach Rejection
* **Goal:** Verify that check-ins from beyond the 15-meter radius are rejected.
* **Test Case:**
  1. Reset slot status to `FREE`.
  2. Calculate an invalid position (e.g., offset by 50 meters north: `latitude = slot_lat + (50.0 / 111320.0)`).
  3. Send `POST /api/v1/slots/{slot_id}/checkin/` with driver credentials and computed coordinates.
  4. Assert response status is `400 Bad Request`.
  5. Assert response body contains a geofence error message.
  6. Query database and verify slot status remains `FREE`.

### UAT-03: Marshal Conflict Override
* **Goal:** Verify that a Marshal's manual status override takes precedence over a Driver's check-in status (since Marshal weight = 1.00 and Driver weight = 0.40).
* **Test Case:**
  1. Reset slot status to `FREE`.
  2. Driver checks in (4m offset) -> slot changes to `OCCUPIED` (weight `0.40`).
  3. Marshal sends manual override `PATCH /api/v1/slots/{slot_id}/override/` with body `{"status": "FREE"}`.
  4. Assert response status is `200 OK`, `source_weight` is `1.00`, and `current_status` is `FREE`.
  5. Query database and verify slot status is `FREE` and `confidence_score` is `1.00`.

### UAT-04: Offline Bulk Sync & Idempotency
* **Goal:** Verify that offline actions from Marshals are replayed chronologically and that duplicate requests are ignored using database-level uniqueness.
* **Test Case:**
  1. Reset slot status to `FREE`.
  2. Send `POST /api/v1/sync/bulk/` with a payload of 2 actions on the same slot:
     - Action 1: set status `OCCUPIED` at timestamp `T1`.
     - Action 2: set status `FREE` at timestamp `T2` (where `T2 > T1`).
  3. Assert response status is `200 OK` with `processed: 2`.
  4. Query database and verify slot status is `FREE` (as the chronologically newer status wins).
  5. Send the same payload again.
  6. Assert response status is `200 OK` with `processed: 0` and `skipped_duplicate: 2`.

### UAT-05: RBAC Security Block
* **Goal:** Verify that non-authorized roles are blocked from administrative/marshal endpoints.
* **Test Case:**
  1. Send `PATCH /api/v1/slots/{slot_id}/override/` with driver JWT credentials.
  2. Assert response status is `403 Forbidden`.
  3. Verify that database slot status is unchanged.

---

## ⚡ Non-Functional Requirements (NFR)

### NFR-1: Payload Size < 5KB
* **Requirement:** Proximity search payload must be compact to conserve mobile bandwidth.
* **Verification:** Run `curl -s -w '%{size_download}' -o /dev/null "https://easypark-backend.fly.dev/api/v1/slots/map-grid/?lat=-1.2676&lng=36.8108"`.
* **Standard:** Response download size must be under 5,000 bytes. Current actual payload for 8 slots is ~888 bytes.

### NFR-3: Proximity Query < 100ms
* **Requirement:** Database spatial querying (ST_DWithin) must respond quickly.
* **Verification:** Record server response times using `curl -s -w '%{time_starttransfer}' -o /dev/null ...` on warmed database queries.
* **Standard:** Must be under 100ms. Current average warmed query time is ~47ms.

---

## 🏃 Running Automated UAT verification

Verify production deployment directly from the development terminal:

```bash
cd backend
python manage.py test_production --base-url https://easypark-backend.fly.dev --settings=config.settings.development
```
