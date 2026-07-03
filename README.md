# EasyPark Backend API

A production-grade, high-performance Django REST Framework API for parking management. The platform features robust spatial geofencing via PostGIS (GeoDjango), Redis-backed caching, JWT-based Role-Based Access Control (RBAC), and strict conflict-resolution log synchronization.

---

## 🏗️ Architecture & Core Modules

The system is organized into modular Django applications within the `backend/apps/` directory:

- **`apps.accounts`**: Manages user lifecycles, role-based authentication (Drivers, Marshals, Admins), and custom JWT token generation (`simplejwt`) containing role claims. Enforces secure, write-only password hashing using `BCryptSHA256PasswordHasher`.
- **`apps.parking`**: Core parking domain model. Utilizes GeoDjango and PostGIS to handle spatial database operations, coordinate validations, and proximity searches.
- **`apps.logs`**: Log ingestion and synchronization tracking. Implements database-level idempotency key checks (using `UNIQUE` constraints) and conflict resolution algorithms.
- **`apps.admin_panel`**: Administrative interfaces and monitoring dashboards.

---

## 🛠️ Tech Stack

- **Framework**: Django 4.2 & Django REST Framework (DRF)
- **Database**: PostgreSQL with PostGIS extension (via GeoDjango)
- **Cache & Session Store**: Redis (via `django-redis`)
- **Security & Auth**: JWT (SimpleJWT), BCrypt password hashing
- **Deployment & Gateway**: Nginx configuration included in `nginx/`

---

## 📁 Repository Structure

```text
EasyPark/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # User & Role management
│   │   ├── parking/        # Spatial parking logic
│   │   ├── logs/           # Conflict resolution & Sync logs
│   │   └── admin_panel/    # Admin panel configurations
│   ├── config/
│   │   ├── settings/       # Settings split (base, development, production)
│   │   ├── constants.py    # Single source of truth for project constants
│   │   └── urls.py         # Main API URL Routing
│   ├── nginx/              # Nginx gateway configurations
│   ├── manage.py           # Django management utility
│   ├── requirements.txt    # Python package dependencies
│   └── easy-park-architect.agent.md  # Backend Developer/Agent Operating Doctrine
├── .env.example            # Environment variables template
├── .gitignore              # Git ignored files & directories
└── README.md               # Project documentation (this file)
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file at the root or within the `backend/` directory by copying `.env.example`:

```bash
cp backend/.env.example .env
```

Key environment variables to configure:
* **`DEBUG`**: Toggle debug mode (`True` in development, `False` in production).
* **`DB_ENGINE`**: Geographic database engine (`django.contrib.gis.db.backends.postgis`).
* **`DB_NAME` / `DB_USER` / `DB_PASSWORD`**: PostGIS database credentials.
* **`REDIS_URL`**: Cache store address (default: `redis://127.0.0.1:6379/1`).
* **`JWT_SECRET_KEY`**: Secret key used to sign JSON Web Tokens.

---

## 🚀 Development Setup

### Prerequisites
Make sure you have the following installed on your machine:
* Python 3.10+
* PostgreSQL + PostGIS extension
* Redis Server

### Steps

1. **Clone the Repository & Navigate**
   ```bash
   cd EasyPark
   ```

2. **Set up Virtual Environment**
   ```bash
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Run System Checks & Database Migrations**
   ```bash
   python backend/manage.py check
   python backend/manage.py migrate
   ```

5. **Start Development Server**
   ```bash
   python backend/manage.py runserver
   ```
   The API will be accessible at `http://127.0.0.1:8000/`.

---

## 🛡️ Developer Operating Doctrine & Rules

Developers and coding agents MUST adhere to the following constraints laid out in the project doctrine:

### 1. Spatial Integrity
* Every spatial field representing real-world coordinates **MUST** use `geography=True, srid=4326`.
* Import spatial models from `django.contrib.gis.db import models as gis_models` (never from `django.db`).
* Geofence boundary checks (ST_DWithin) **MUST** use the `D(m=15)` measure class to prevent unit mismatch.

### 2. Authentication & RBAC
* All endpoints must specify explicit `permission_classes` (e.g., `IsDriver`, `IsMarshal`, or `IsAdmin`).
* JWT tokens must carry the user's `role` claim in the payload.

### 3. Idempotency & Conflict Resolution
* The bulk sync endpoint enforces database-level idempotency via a `UNIQUE` constraint on `update_logs.idempotency_key`. Always use `get_or_create` with this key.
* Magic numbers are strictly forbidden. Use configurations defined in `backend/config/constants.py`:
  - `GEOFENCE_RADIUS_METERS = 15`
  - `MAX_SPEED_MS = 55` (Spoofing threshold)
  - `DRIVER_SOURCE_WEIGHT = 0.40`
  - `MARSHAL_SOURCE_WEIGHT = 1.00`
