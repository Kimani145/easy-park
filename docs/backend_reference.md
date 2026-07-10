# EasyPark — Backend Reference Documentation

This document describes the architectural layout, database models, environment configurations, and core logic of the EasyPark Django REST Framework API.

---

## 🏗️ Architecture & Apps Directory

The backend project structure is organized as follows:

```text
EasyPark/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # User & Role management
│   │   ├── parking/        # Spatial parking logic (Zones, Slots)
│   │   ├── logs/           # Synchronization logs & Conflict Resolution
│   │   └── admin_panel/    # Admin stats & dashboard integrations
```

---

## ⚙️ Environment Configuration (.env)

The application uses `django-decouple` to parse configuration variables. The production environment relies on these configurations defined via secrets:

| Variable | Description | Production Value |
|---|---|---|
| `SECRET_KEY` | Cryptographic signature key | Stored as Fly Secret |
| `ALLOWED_HOSTS` | Allowed HTTP Host headers | `easypark-backend.fly.dev,.fly.dev,*` |
| `DB_NAME` | PostGIS database name | `postgres` |
| `DB_USER` | Supabase username | `postgres.tsgfeycwhkkxxzqaorra` |
| `DB_PASSWORD` | Supabase connection password | Stored as Fly Secret |
| `DB_HOST` | Supabase pooler host | `aws-0-eu-west-1.pooler.supabase.com` |
| `DB_PORT` | Connection port | `5432` |
| `REDIS_URL` | Upstash Redis connection string | Stored as Fly Secret |
| `GDAL_LIBRARY_PATH` | Path to GDAL shared library | `/usr/lib/x86_64-linux-gnu/libgdal.so` |
| `GEOS_LIBRARY_PATH` | Path to GEOS shared library | `/usr/lib/x86_64-linux-gnu/libgeos_c.so` |

---

## 🗄️ Database Schemas & Models

### 1. User (`apps.accounts.models.User`)
Custom user model extending `AbstractBaseUser` for role-based authentication.
* **Fields:**
  * `id`: UUID (Primary Key)
  * `email`: EmailField (Unique)
  * `role`: CharField (Choices: `DRIVER`, `MARSHAL`, `ADMIN`)
  * `is_active`: BooleanField
  * `is_staff` / `is_superuser`: BooleanField

### 2. Zone (`apps.parking.models.Zone`)
Represents geographical regions in which parking is managed.
* **Fields:**
  * `id`: UUID (Primary Key)
  * `name`: CharField
  * `city`: CharField
  * `billing_rate_hour`: DecimalField
  * `center`: PointField (`srid=4326`, `geography=True`)
  * `boundary`: PolygonField (`srid=4326`, `geography=True`)

### 3. ParkingSlot (`apps.parking.models.ParkingSlot`)
Represents an individual physical parking space.
* **Fields:**
  * `id`: UUID (Primary Key)
  * `zone`: ForeignKey to `Zone`
  * `slot_code`: CharField (Unique)
  * `coordinate`: PointField (`srid=4326`, `geography=True`)
  * `current_status`: CharField (Choices: `FREE`, `OCCUPIED`)
  * `confidence_score`: DecimalField (Default: `1.00`)
  * `last_updated`: DateTimeField (Auto-updated)
* **Spatial Indexing:**
  * Configured with a `GiST` spatial index on the `coordinate` field for rapid distance-based queries.

### 4. UpdateLog (`apps.logs.models.UpdateLog`)
Enforces database-level idempotency and logs synchronization updates.
* **Fields:**
  * `id`: UUID (Primary Key)
  * `slot`: ForeignKey to `ParkingSlot`
  * `idempotency_key`: CharField (Unique index enforced)
  * `action`: CharField (e.g. `STATUS_OVERRIDE`)
  * `payload`: JSONField
  * `original_timestamp`: DateTimeField
  * `created_at`: DateTimeField

---

## 🛡️ Business Logic & Algorithms

### 1. Spatial Geofencing
Enforced when a driver checks in. Uses the PostGIS `ST_DWithin` geographic calculation.
* **Geofence Radius:** `15 meters` (defined as `django.contrib.gis.measure.D(m=15)`).
* **Formula:** The driver's location `Point(lng, lat)` must be within the geofence radius of the parking slot coordinate.

### 2. Conflict Resolution
Calculates the `confidence_score` and `current_status` of a slot when inputs conflict:
* **Driver Input Weight:** `0.40`
* **Marshal/Admin Input Weight:** `1.00`
* **Resolution Rule:** When a new update arrives, the status with the higher weight overwrites the previous status. A Marshal override always resets the slot's confidence to `1.00` and immediately applies the overridden status.

### 3. Cache Policy
* Proximity queries (`/api/v1/slots/map-grid/`) are cached in Redis with a TTL of **10 seconds** to offload database reads.
