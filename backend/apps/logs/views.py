import time
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsMarshal, IsAdmin
from apps.parking.models import ParkingSlot
from apps.logs.serializers import OverrideSerializer
from apps.logs.models import UpdateLog
from apps.logs.conflict import get_source_weight, resolve_slot_status
from config.constants import MARSHAL_SOURCE_WEIGHT

class MarshalOverrideView(APIView):
    """
    Endpoint for marshals and admins to override slot status.
    """
    permission_classes = [IsAuthenticated, IsMarshal | IsAdmin]

    def patch(self, request, slot_id):
        # 1. Deserialize input
        serializer = OverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Validation failed", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        validated_status = serializer.validated_data["status"]

        # 2. Fetch ParkingSlot
        try:
            slot = ParkingSlot.objects.get(id=slot_id)
        except (ParkingSlot.DoesNotExist, ValidationError, ValueError):
            return Response(
                {"error": "Slot not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. DB transaction updates
        idem_key = f"override:{slot_id}:{request.user.id}:{int(time.time())}"

        with transaction.atomic():
            # Acquire slot lock to prevent concurrent modifications
            slot = ParkingSlot.objects.select_for_update().get(id=slot_id)

            # Create update log
            UpdateLog.objects.create(
                slot=slot,
                user=request.user,
                reported_status=validated_status,
                source_weight=get_source_weight(request.user.role),
                idempotency_key=idem_key
            )

            # Resolve status
            resolved_status = resolve_slot_status(slot)

            # Update slot
            slot.current_status = resolved_status
            slot.confidence_score = MARSHAL_SOURCE_WEIGHT
            slot.last_updated = timezone.now()
            slot.save(update_fields=['current_status', 'confidence_score', 'last_updated'])

        # 4. Return success response
        return Response({
            "id": str(slot.id),
            "slot_code": slot.slot_code,
            "current_status": slot.current_status,
            "overridden_by": str(request.user.id),
            "source_weight": f"{MARSHAL_SOURCE_WEIGHT:.2f}"
        }, status=status.HTTP_200_OK)
