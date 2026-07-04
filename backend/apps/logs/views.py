import time
from django.db import transaction, IntegrityError
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

import logging
from apps.logs.serializers import BulkSyncSerializer

logger = logging.getLogger(__name__)

class BulkSyncView(APIView):
    """
    Endpoint for marshals to synchronize bulk offline update actions idempotently.
    """
    permission_classes = [IsAuthenticated, IsMarshal]

    def post(self, request):
        # 1. Deserialize input
        serializer = BulkSyncSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Extract queued_actions and sort by original_timestamp ascending
        # Chronological replay matches the SRS requirement in Section 6.1 (older updates processed first).
        actions = sorted(
            serializer.validated_data['queued_actions'],
            key=lambda a: a['original_timestamp']
        )

        # 3. Initialize counters
        processed = 0
        skipped_duplicate = 0
        skipped_invalid = 0

        # 4. Process each action individually inside a per-action try/except.
        # Do NOT wrap the entire loop in one transaction so that a single bad action
        # does not roll back preceding valid actions.
        for action in actions:
            try:
                # a. Validate action type
                if action['action'] != 'STATUS_OVERRIDE':
                    skipped_invalid += 1
                    logger.warning(f"Unknown action type: {action['action']}")
                    continue

                # b. Fetch the slot
                try:
                    slot = ParkingSlot.objects.get(id=action['slot_id'])
                except ParkingSlot.DoesNotExist:
                    skipped_invalid += 1
                    logger.warning(f"Slot not found: {action['slot_id']}")
                    continue

                # c. Attempt idempotent log creation
                # We wrap this in an atomic transaction to ensure log creation
                # and get_or_create database queries behave correctly.
                with transaction.atomic():
                    # Acquire row lock during check to prevent race conditions
                    log, created = UpdateLog.objects.select_for_update().get_or_create(
                        idempotency_key=action['idempotency_key'],
                        defaults={
                            'slot': slot,
                            'user': request.user,
                            'reported_status': action['payload']['status'],
                            'source_weight': get_source_weight(request.user.role),
                            'logged_at': action['original_timestamp'],
                        }
                    )

                if not created:
                    skipped_duplicate += 1
                    continue

                # d. If created=True, resolve and update slot
                with transaction.atomic():
                    # Lock slot row for update
                    slot = ParkingSlot.objects.select_for_update().get(id=slot.id)
                    resolved = resolve_slot_status(slot)
                    slot.current_status = resolved
                    slot.confidence_score = get_source_weight(request.user.role)
                    slot.last_updated = timezone.now()
                    slot.save(update_fields=[
                        'current_status', 'confidence_score', 'last_updated'
                    ])
                processed += 1

            except IntegrityError:
                # Race condition: another request created the same idempotency_key
                # between get and create. Treat as duplicate — safe to skip.
                skipped_duplicate += 1
                continue

        # 5. Return success counters
        return Response({
            "processed": processed,
            "skipped_duplicate": skipped_duplicate,
            "skipped_invalid": skipped_invalid,
            "sync_batch_id": serializer.validated_data['sync_batch_id']
        }, status=status.HTTP_200_OK)
