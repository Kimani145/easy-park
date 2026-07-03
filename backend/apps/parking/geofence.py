"""
Geofence Validation Service

This module handles spatial validation checks to ensure that a driver or marshal
performing a check-in is physically located within the allowed radius of the
designated parking slot.

Coordinate Convention:
- Point objects in GEOS/GIS take coordinates in the (longitude, latitude) order.
- This follows the standard mathematical (x, y) Cartesian coordinate mapping where
  longitude represents the horizontal x-axis and latitude represents the vertical y-axis.
- Reversing this to (lat, lng) would map the point to the wrong geographic location
  without throwing any errors or exceptions.

Measure Wrapper:
- In GeoDjango, geographic/spatial distance lookups (like __dwithin) on geography=True
  fields require a Distance object wrapper D(m=...) to specify the unit of measurement.
- Passing a raw integer is disallowed for geography-type lookups and would result
  in evaluation errors.
"""

from config.constants import GEOFENCE_RADIUS_METERS
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point
from apps.parking.models import ParkingSlot

def validate_checkin_coordinates(
    slot_id: str,
    user_lat: float,
    user_lng: float
) -> dict:
    """
    Validates if the provided user coordinates (lat, lng) are within the geofence boundary
    of the specified parking slot.
    """
    try:
        slot = ParkingSlot.objects.get(id=slot_id)
    except ParkingSlot.DoesNotExist:
        return {"valid": False, "reason": "Slot not found"}

    # Construct point using GEOS format: Point(longitude, latitude)
    user_point = Point(user_lng, user_lat, srid=4326)

    # Perform geofence boundary check using Distance measure object D(m=...)
    in_range = ParkingSlot.objects.filter(
        id=slot_id,
        coordinate__dwithin=(user_point, D(m=GEOFENCE_RADIUS_METERS))
    ).exists()

    if not in_range:
        return {"valid": False, "reason": "Outside geofence boundary"}

    return {"valid": True}
