import time
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, IntegrityError

from apps.accounts.permissions import IsDriver
from apps.parking.models import ParkingSlot
from apps.parking.serializers import CheckinSerializer, MapGridQuerySerializer
from apps.parking.geofence import validate_checkin_coordinates
from apps.parking.velocity import check_velocity
from apps.logs.models import UpdateLog
from apps.logs.conflict import get_source_weight
from config.constants import DRIVER_SOURCE_WEIGHT, MAP_GRID_CACHE_TTL
from django.core.cache import cache
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

class CheckinView(APIView):
    """
    Handles user check-ins to parking slots. Requires driver role.
    """
    permission_classes = [IsAuthenticated, IsDriver]

    def post(self, request, id):
        slot_id = str(id)
        
        # 1. Deserialize + validate input
        serializer = CheckinSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Validation failed", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        lat = serializer.validated_data["latitude"]
        lng = serializer.validated_data["longitude"]

        # 2. Velocity validation
        res_vel = check_velocity(str(request.user.id), lat, lng)
        if not res_vel["valid"]:
            return Response(
                {"error": "GPS velocity anomaly detected", "detail": res_vel["reason"]},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Geofence validation
        res_geo = validate_checkin_coordinates(slot_id, lat, lng)
        if not res_geo["valid"]:
            if res_geo["reason"] == "Slot not found":
                return Response(
                    {"error": "Slot not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {"error": "Geofence validation failed", "detail": res_geo["reason"]},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Fetch the slot
        try:
            slot = ParkingSlot.objects.get(id=slot_id)
        except ParkingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 5. Database transaction updates and idempotency
        minute_ts = int(time.time() / 60)
        idempotency_key = f"checkin:{slot_id}:{request.user.id}:{minute_ts}"

        try:
            with transaction.atomic():
                # Acquire slot lock
                slot = ParkingSlot.objects.select_for_update().get(id=slot_id)
                
                # Check status
                if slot.current_status == 'OCCUPIED':
                    # If already occupied, check if it was due to this identical request
                    log_exists = UpdateLog.objects.filter(idempotency_key=idempotency_key).exists()
                    if log_exists:
                        return Response({
                            "id": str(slot.id),
                            "slot_code": slot.slot_code,
                            "current_status": slot.current_status
                        }, status=status.HTTP_200_OK)
                    else:
                        return Response(
                            {"error": "Slot already occupied"},
                            status=status.HTTP_409_CONFLICT
                        )

                # Update slot
                slot.current_status = 'OCCUPIED'
                slot.confidence_score = DRIVER_SOURCE_WEIGHT
                slot.save()

                # Create update log entry.
                # The minute-resolution key prevents duplicate log entries within the same minute
                # while allowing a new entry each new minute.
                UpdateLog.objects.create(
                    slot=slot,
                    user=request.user,
                    reported_status='OCCUPIED',
                    source_weight=get_source_weight(request.user.role),
                    idempotency_key=idempotency_key
                )
        except IntegrityError:
            # Handle concurrent race condition on idempotency key
            slot = ParkingSlot.objects.get(id=slot_id)
            return Response({
                "id": str(slot.id),
                "slot_code": slot.slot_code,
                "current_status": slot.current_status
            }, status=status.HTTP_200_OK)

        return Response({
            "id": str(slot.id),
            "slot_code": slot.slot_code,
            "current_status": slot.current_status
        }, status=status.HTTP_200_OK)

class MapGridView(APIView):
    """
    Returns a grid of parking slots within the requested radius of coordinates.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Validate query params with MapGridQuerySerializer
        serializer = MapGridQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Extract validated values
        lat = serializer.validated_data['lat']
        lng = serializer.validated_data['lng']
        radius = serializer.validated_data['radius']

        # 3. Build cache key
        # Truncating coordinates to 4 decimal places (~11m precision) groups nearby requests
        # into the same cache bucket to optimize hit rates.
        cache_key = f"map_grid:{lat:.4f}:{lng:.4f}:{int(radius)}"

        # 4. Check cache
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=status.HTTP_200_OK)

        # 5. Build spatial query
        origin = Point(lng, lat, srid=4326)
        slots = ParkingSlot.objects.filter(
            coordinate__dwithin=(origin, D(m=radius))
        ).values(
            'id', 'slot_code', 'current_status', 'coordinate'
        )

        # 6. Serialize payload (full field names; ~760 B for 8 slots, well within NFR-1 < 5 KB)
        payload = []
        for s in slots:
            payload.append({
                'id':             str(s['id']),
                'slot_code':      s['slot_code'],
                'current_status': s['current_status'],
                'latitude':       s['coordinate'].y,
                'longitude':      s['coordinate'].x,
            })

        # 7. Cache the result
        cache.set(cache_key, payload, timeout=MAP_GRID_CACHE_TTL)

        # 8. Return Response
        return Response(payload, status=status.HTTP_200_OK)
