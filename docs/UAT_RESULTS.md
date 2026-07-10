# EasyPark — UAT Results

**Date:** 2026-07-11
**Environment:** Production
**Base URL:** https://easypark-backend.fly.dev
**Database:** Supabase PostgreSQL + PostGIS
**Tested by:** Joseph Kimani Nyoike

## Results

| Test ID | Scenario | Result | HTTP Status | Notes |
|---------|----------|--------|-------------|-------|
| UAT-01 | Valid geofenced check-in (4m) | PASS | 200 | Slot set to OCCUPIED |
| UAT-02 | Geofence breach rejection (50m) | PASS | 400 | Slot unchanged |
| UAT-03 | Marshal conflict override | PASS | 200 | Weight 1.00 wins |
| UAT-04 | Offline bulk sync + idempotency | PASS | 200 | Duplicates skipped |
| UAT-05 | RBAC block (Driver → Marshal endpoint) | PASS | 403 | No state change |

## NFR Verification

| NFR | Requirement | Result | Evidence |
|-----|-------------|--------|----------|
| NFR-1 | Payload < 5KB | PASS | 888 bytes (8 slots) |
| NFR-3 | Spatial query < 100ms | PASS | 47.25ms (warmed DB) |

## Infrastructure

| Component | Technology | Details |
|-----------|-----------|---------|
| API Runtime | Fly.io (shared-1x, 512MB) | easypark-backend.fly.dev |
| Database | Supabase PostgreSQL + PostGIS | Direct connection, port 5432 |
| Cache | Fly.io Managed Redis | rediss:// TLS connection |
| CI/CD | GitHub Actions | Validate → Deploy on push to main |
| TLS | Fly Proxy (upstream) | SECURE_PROXY_SSL_HEADER configured |

## Phase 2 Remediation Items
- Restrict ALLOWED_HOSTS to specific domain in production hardening.
