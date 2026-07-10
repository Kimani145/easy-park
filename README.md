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

## 🛠️ Tech Stack & Infrastructure

- **Framework**: Django 4.2 & Django REST Framework (DRF)
- **Database**: Supabase PostgreSQL with PostGIS extension (via GeoDjango)
- **Cache & Session Store**: Upstash Redis (via `django-redis` over TLS)
- **Security & Auth**: JWT (SimpleJWT), BCrypt password hashing
- **Hosting Platform**: Fly.io (shared-1x, 512MB RAM machines)
- **CI/CD**: GitHub Actions (runs automated validation and remote deployments)

---

## 📁 Repository Structure

```text
EasyPark/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions CI/CD workflow
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
│   └── easy-park-architect.agent.md  # Backend Developer Operating Doctrine
├── docs/
│   ├── UAT_RESULTS.md      # Live production verification test results
│   ├── frontend_handbook.md # API specifications for Frontend developers
│   ├── qa_handbook.md       # Test scenarios and NFR verification details
│   └── backend_reference.md # Database schemas and settings documentation
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
* **`REDIS_URL`**: Cache store address.
* **`JWT_SECRET_KEY`**: Secret key used to sign JSON Web Tokens.

---

## 🚀 Development Setup

### Prerequisites
Make sure you have the following installed on your machine:
* Python 3.10+
* PostgreSQL + PostGIS extension
* Redis Server
* Conda (optional, environment file included)

### Steps

1. **Clone the Repository & Navigate**
   ```bash
   cd EasyPark
   ```

2. **Activate Conda Environment**
   ```bash
   conda activate easypark
   ```

3. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Run System Checks & Database Migrations**
   ```bash
   python manage.py check
   python manage.py migrate
   ```

5. **Start Development Server**
   ```bash
   python manage.py runserver
   ```
   The API will be accessible locally at `http://127.0.0.1:8000/`.

---

## 🧪 Verification & Production Testing

To run the automated verification suite against the live production server:

```bash
cd backend
python manage.py test_production --base-url https://easypark-backend.fly.dev --settings=config.settings.development
```

---

## 📖 Handbooks & Documentation

* Refer to the [Frontend Integration Handbook](file:///home/kimani/Projects/EasyPark/docs/frontend_handbook.md) for endpoint mappings, role claims, and integration schemas.
* Refer to the [QA Test Handbook](file:///home/kimani/Projects/EasyPark/docs/qa_handbook.md) for UAT profile steps, NFR sizes/latencies, and manual checking instructions.
* Refer to the [Backend Reference](file:///home/kimani/Projects/EasyPark/docs/backend_reference.md) for a deep dive into schemas, models, and cache configuration.
* View the latest [UAT Test Results](file:///home/kimani/Projects/EasyPark/docs/UAT_RESULTS.md) verified against the live environment.
