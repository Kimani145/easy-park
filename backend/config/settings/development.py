"""
Django development settings for EasyPark project.

Extends base settings with development-specific configuration.
"""

from .base import *

# Development-specific overrides
DEBUG = True
ALLOWED_HOSTS = ['*']

# Disable HTTPS requirements in development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Allow all CORS origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Development logging — verbose output
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'

# Disable password validation hashers in development for faster testing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
