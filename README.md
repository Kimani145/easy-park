# EasyPark

A comprehensive, production-grade parking management platform. EasyPark features a modern frontend interface for drivers, marshals, and administrators, backed by a high-performance Django REST Framework API with robust spatial geofencing (PostGIS), Redis-backed caching, and JWT-based Role-Based Access Control (RBAC).

---

## 🏗️ Architecture & Core Modules

The system is organized into two primary components:

### 1. Frontend (`/frontend`)
A responsive Single Page Application (SPA) built to deliver a seamless user experience across devices.
- **Driver Interface**: Real-time slot availability, geofenced check-in/out, and parking history.
- **Marshal Interface**: On-ground slot verification, conflict resolution, and offline bulk sync capabilities.
- **Admin Dashboard**: System-wide statistics, user management, and zone configuration.

### 2. Backend API (`/backend/apps`)
Modular Django applications driving the business logic:
- **`apps.accounts`**: Manages user lifecycles, role-based authentication, and JWT token generation containing role claims.
- **`apps.parking`**: Core parking domain model. Utilizes GeoDjango and PostGIS to handle spatial database operations, coordinate validations, and proximity searches.
- **`apps.logs`**: Log ingestion and synchronization tracking. Implements database-level idempotency key checks and conflict resolution algorithms.
- **`apps.admin_panel`**: Administrative interfaces and monitoring endpoints.

---

## 🛠️ Tech Stack & Infrastructure

### Frontend
- **Framework**: React, Vite
- **Styling**: Tailwind CSS, Shadcn UI
- **Routing**: React Router
- **Package Manager**: pnpm

### Backend
- **Framework**: Django 4.2 & Django REST Framework (DRF)
- **Database**: Supabase PostgreSQL with PostGIS extension
- **Cache & Session Store**: Upstash Redis (via `django-redis` over TLS)
- **Security & Auth**: JWT (SimpleJWT), BCrypt password hashing

### Infrastructure
- **Backend Hosting**: Fly.io (shared-1x, 512MB RAM)
- **Frontend Hosting**: Vercel (https://easy-park-pi.vercel.app)
- **CI/CD**: GitHub Actions

---

## 📁 Repository Structure

```text
EasyPark/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions CI/CD workflow
├── frontend/                # React SPA Application
│   ├── src/                 # Application source code (components, contexts, hooks)
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite build configuration
├── backend/                 # Django REST API
│   ├── apps/                # Core domain apps (accounts, parking, logs, admin)
│   ├── config/              # Django settings & main URL routing
│   ├── nginx/               # Nginx gateway configurations
│   ├── requirements.txt     # Python dependencies
│   └── manage.py            # Django management utility
├── docs/                    # Project Documentation
│   ├── openapi-schema.yaml  # API OpenAPI definitions
│   ├── UAT_RESULTS.md       # Live production verification test results
│   └── ...                  # API specifications and handbooks
└── README.md                # Project documentation (this file)
```

---

## 🚀 Development Setup

### Prerequisites
* **Backend**: Python 3.10+, PostgreSQL + PostGIS, Redis Server, Conda (optional)
* **Frontend**: Node.js 18+, pnpm

### Backend Setup

1. **Activate Environment & Install Dependencies**
   ```bash
   cd backend
   conda activate easypark
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` and set up your PostGIS and Redis credentials.
   ```bash
   cp .env.example .env
   ```

3. **Run System Checks & Database Migrations**
   ```bash
   python manage.py check
   python manage.py migrate
   ```

4. **Start Development Server**
   ```bash
   python manage.py runserver
   ```
   *The API will be accessible at `http://127.0.0.1:8000/`.*

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   pnpm install
   ```

2. **Start Development Server**
   ```bash
   pnpm run dev
   ```
   *The frontend will be accessible locally on the port provided by Vite (usually `http://localhost:5173`).*

---

## 📚 API Documentation (Swagger & ReDoc)

Interactive API documentation is automatically generated via `drf-spectacular`. When the backend is running, access:
- **Swagger UI**: `/api/docs/`
- **ReDoc**: `/api/redoc/`
- **Raw OpenAPI Schema**: `/api/schema/`

Postman collections and environments are available in the `docs/` directory for easy import.

---

## 🧪 Verification & Production Testing

To run the automated verification suite against the live production server:

```bash
cd backend
python manage.py test_production --base-url https://easypark-backend.fly.dev --settings=config.settings.development
```

---

## 📖 Handbooks & Documentation

* **[Frontend Integration Handbook](docs/frontend_handbook.md)**: API specifications for frontend developers.
* **[QA Test Handbook](docs/qa_handbook.md)**: Test scenarios and NFR verification details.
* **[Backend Reference](docs/backend_reference.md)**: Deep dive into schemas, models, and caching.
* **[UAT Test Results](docs/UAT_RESULTS.md)**: Latest tests verified against the live environment.
