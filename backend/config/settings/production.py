"""
Django production settings for EasyPark project.

Extends base settings with production-specific hardened configuration
for deployment on Azure Web Apps (PaaS).

TLS is terminated upstream by the Azure load balancer. This Django
instance runs behind Nginx, which receives plain HTTP from Azure.
Settings here are calibrated for that topology — see inline comments.
"""

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = False
# Never True in production. Exposes stack traces to clients.

SECRET_KEY = config('SECRET_KEY')
# Must come from environment. Never hardcoded.

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=lambda v: [
    s.strip() for s in v.split(',')
])
# Comma-separated list from env var.
# Example value: easypark.azurewebsites.net,localhost

# ---------------------------------------------------------------------------
# Azure Web Apps TLS Configuration
# ---------------------------------------------------------------------------
# Azure terminates TLS upstream. Django must trust the forwarded proto header
# to know the original request was HTTPS. Without this, Django generates
# http:// URLs in API responses even when the client used HTTPS.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Do NOT set SECURE_SSL_REDIRECT = True.
# Azure enforces HTTPS externally. Setting this causes a redirect loop:
# Azure sends HTTP to Nginx → Django redirects to HTTPS → Azure sends HTTP
# again → infinite loop. Django's --deploy check will warn about this being
# False; that warning is expected and correct for this Azure topology.
SECURE_SSL_REDIRECT = False

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ---------------------------------------------------------------------------
# Database (PostGIS / Azure Database for PostgreSQL)
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE':   'django.contrib.gis.db.backends.postgis',
        'NAME':     config('DB_NAME'),
        'USER':     config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST':     config('DB_HOST'),
        'PORT':     config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 60,
        # CONN_MAX_AGE: persistent connections.
        # Avoids reconnect overhead on every Gunicorn request.
        # 60 s matches typical Azure PostgreSQL idle timeout.
    }
}

# ---------------------------------------------------------------------------
# Redis Cache
# ---------------------------------------------------------------------------
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            # Fail fast on Redis unavailability rather than blocking
            # Gunicorn workers indefinitely.
        },
    }
}

# ---------------------------------------------------------------------------
# CORS — restrict to explicit origins in production
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS_RAW = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = [
    s.strip() for s in CORS_ALLOWED_ORIGINS_RAW.split(',') if s.strip()
] if CORS_ALLOWED_ORIGINS_RAW else []

# ---------------------------------------------------------------------------
# Logging — structured, console-only (Azure streams stdout to App Insights)
# ---------------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'production': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'production',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
