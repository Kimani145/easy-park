FROM python:3.11-slim-bullseye

# GDAL requires system libraries installed via apt.
# python:3.11-slim does not include them.
# Do NOT use python:3.11-alpine — GDAL on Alpine requires
# compiling from source and will fail or take 45+ minutes.
# bullseye (Debian 11) ships GDAL 3.2 which is compatible
# with Django 4.2 GeoDjango.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    binutils \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL library paths explicitly.
# Without these ENV vars, Django's libgdal.py probes a hardcoded
# list of names ("gdal", "GDAL", "gdal3.6.0", ...) that do not
# match Debian's actual filename (libgdal.so).
# Setting explicit paths bypasses the probe entirely.
# These paths are correct for x86_64 Debian 11 (bullseye).
ENV GDAL_LIBRARY_PATH=/usr/lib/libgdal.so
ENV GEOS_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgeos_c.so
ENV DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Copy requirements first — separate layer, cached on rebuild
# if requirements.txt has not changed.
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project
COPY backend/ .

EXPOSE 8000

CMD ["/usr/local/bin/gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]

