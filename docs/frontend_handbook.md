# EasyPark — Frontend Integration Handbook

**API Environment:** Production  
**Base URL:** `https://easypark-backend.fly.dev`  
**Protocol:** HTTPS only

---

## 🔑 Authentication & Token Management

All non-public endpoints require JWT Authentication. Pass the token in the HTTP `Authorization` header.

```http
Authorization: Bearer <your_access_token>
```

### 1. Register User
* **Endpoint:** `POST /api/v1/auth/register/`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "driver@easypark.test",
    "password": "TestDriver99!",
    "role": "DRIVER" // DRIVER, MARSHAL, or ADMIN
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "email": "driver@easypark.test",
    "role": "DRIVER",
    "message": "User registered successfully"
  }
  ```

### 2. Login User
* **Endpoint:** `POST /api/v1/auth/login/`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "driver@easypark.test",
    "password": "TestDriver99!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...",
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
  }
  ```

> [!IMPORTANT]
> The access token payload contains a custom `role` claim (`DRIVER`, `MARSHAL`, or `ADMIN`). The frontend must extract this claim to enforce client-side navigation restrictions and menu choices.

---

## 🚗 Parking Slot Operations

### 3. Fetch Map Grid (Proximity Search)
Queries and returns slots surrounding a geographical coordinate.
* **Endpoint:** `GET /api/v1/slots/map-grid/`
* **Access:** Authenticated (Any Role)
* **Query Parameters:**
  * `lat`: Latitude of user (decimal, e.g. `-1.2676`)
  * `lng`: Longitude of user (decimal, e.g. `36.8108`)
* **Response (200 OK):**
  ```json
  [
    {
      "id": "1094fa29-b1fd-4562-9737-aea435266af5",
      "slot_code": "SLOT-001",
      "coordinate": {
        "latitude": -1.2676,
        "longitude": 36.8108
      },
      "current_status": "FREE",
      "confidence_score": "1.00",
      "last_updated": "2026-07-10T21:18:45Z"
    }
  ]
  ```
> [!TIP]
> This endpoint is cached for **10 seconds** at the Redis layer. Do not poll faster than this duration.

### 4. Driver Check-in
* **Endpoint:** `POST /api/v1/slots/{id}/checkin/`
* **Access:** `DRIVER` only
* **Request Body:**
  ```json
  {
    "latitude": -1.267635,
    "longitude": 36.8108
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "id": "1094fa29-b1fd-4562-9737-aea435266af5",
    "current_status": "OCCUPIED",
    "confidence_score": "0.40",
    "last_updated": "2026-07-10T21:18:45Z"
  }
  ```

> [!WARNING]
> **Geofence Enforcement:** The API rejects check-ins if the driver is further than **15 meters** from the target slot.
> * If breached: Returns `HTTP 400 Bad Request` with `{"error": "Geofence breach: driver location is ... meters from slot"}`.

### 5. Marshal Override
* **Endpoint:** `PATCH /api/v1/slots/{id}/override/`
* **Access:** `MARSHAL` or `ADMIN` only
* **Request Body:**
  ```json
  {
    "status": "FREE" // or "OCCUPIED"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "id": "1094fa29-b1fd-4562-9737-aea435266af5",
    "current_status": "FREE",
    "source_weight": "1.00",
    "last_updated": "2026-07-10T21:18:45Z"
  }
  ```

---

## 🛜 Offline & Sync Operations

### 6. Marshal Bulk Sync
Used when a Marshal performs offline status checks and synchronizes cached queue actions once reconnecting.
* **Endpoint:** `POST /api/v1/sync/bulk/`
* **Access:** `MARSHAL` or `ADMIN` only
* **Request Body:**
  ```json
  {
    "sync_batch_id": "batch-10294-826",
    "client_device_time": "2026-07-10T22:10:00Z",
    "queued_actions": [
      {
        "idempotency_key": "marshal-uuid-action-1",
        "slot_id": "1094fa29-b1fd-4562-9737-aea435266af5",
        "action": "STATUS_OVERRIDE",
        "payload": {
          "status": "OCCUPIED"
        },
        "original_timestamp": "2026-07-10T22:00:00Z"
      },
      {
        "idempotency_key": "marshal-uuid-action-2",
        "slot_id": "1094fa29-b1fd-4562-9737-aea435266af5",
        "action": "STATUS_OVERRIDE",
        "payload": {
          "status": "FREE"
        },
        "original_timestamp": "2026-07-10T22:05:00Z"
      }
    ]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "batch_id": "batch-10294-826",
    "status": "COMPLETED",
    "processed": 2,
    "skipped_duplicate": 0,
    "skipped_invalid": 0
  }
  ```

> [!NOTE]
> **Idempotency Guarantee:** Pushing a batch with already-processed `idempotency_key`s is safe. The API skips them without throwing errors.
> **Chronological Replay:** Actions targeting the same slot are replayed in chronological order based on `original_timestamp`.
