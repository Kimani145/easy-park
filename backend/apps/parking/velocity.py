"""
Velocity Validation Service

This module validates user movement to detect potential GPS spoofing attempts.
By checking the distance and time elapsed between consecutive location reports,
it calculates the user's velocity and rejects check-ins that exceed the
plausible speed threshold (MAX_SPEED_MS).
"""

import time
import math
import logging
from django.core.cache import cache
from config.constants import MAX_SPEED_MS, LOCATION_CACHE_TTL

logger = logging.getLogger(__name__)

def check_velocity(
    user_id: str,
    new_lat: float,
    new_lng: float
) -> dict:
    """
    Checks if the velocity of the user between their previous check-in location
    and the current check-in location is within physical limits.
    """
    cache_key = f"last_location:{user_id}"
    current_time = time.time()

    try:
        # Read the existing location from the cache
        prior = cache.get(cache_key)

        # Immediately write the new location to cache to prevent alternating spoof attacks
        cache.set(
            cache_key,
            {"lat": new_lat, "lng": new_lng, "ts": current_time},
            timeout=LOCATION_CACHE_TTL
        )
    except Exception as e:
        # Log the error and fail open: do not block check-ins if Redis is down
        logger.error(f"Redis cache access failed in velocity check: {e}")
        return {"valid": True}

    # First check-in for this user session has no prior data to validate against
    if prior is None:
        return {"valid": True}

    delta_t = current_time - prior["ts"]
    if delta_t <= 0:
        return {"valid": False, "reason": "Timestamp anomaly"}

    # Compute distance using the Haversine formula
    earth_radius_m = 6371000.0
    dlat = math.radians(new_lat - prior["lat"])
    dlng = math.radians(new_lng - prior["lng"])

    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(prior["lat"])) *
         math.cos(math.radians(new_lat)) *
         math.sin(dlng / 2.0) ** 2)

    dist_m = 2.0 * earth_radius_m * math.asin(math.sqrt(a))

    speed_ms = dist_m / delta_t
    if speed_ms > MAX_SPEED_MS:
        return {
            "valid": False,
            "reason": f"Implausible movement: {speed_ms:.1f} m/s ({speed_ms * 3.6:.1f} km/h)"
        }

    return {"valid": True}
