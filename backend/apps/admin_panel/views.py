import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.utils import timezone
from apps.accounts.models import User, Role
from apps.accounts.permissions import IsAdmin
from apps.parking.models import ParkingSlot, Zone, SlotStatus
from apps.logs.models import UpdateLog
from config.constants import ADMIN_STATS_CACHE_TTL

logger = logging.getLogger(__name__)

CACHE_KEY = 'admin_stats'
# A 30s stale window is acceptable for a dashboard that aggregates historical
# state, and avoids hammering 5 aggregate queries per dashboard refresh.
CACHE_TTL = ADMIN_STATS_CACHE_TTL

class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        # 1. Check cache
        try:
            cached = cache.get(CACHE_KEY)
            if cached is not None:
                return Response(cached)
        except Exception as e:
            # Log cache read failure but proceed to query database so service remains available
            logger.error("Failed to read from cache in AdminStatsView: %s", e)

        # 2. Build stats payload. Count at the DB level to avoid loading models into memory.
        total_users = User.objects.count()
        total_drivers = User.objects.filter(role=Role.DRIVER).count()
        total_marshals = User.objects.filter(role=Role.MARSHAL).count()
        total_slots = ParkingSlot.objects.count()
        occupied_slots = ParkingSlot.objects.filter(current_status=SlotStatus.OCCUPIED).count()
        free_slots = ParkingSlot.objects.filter(current_status=SlotStatus.FREE).count()
        total_zones = Zone.objects.count()
        total_logs = UpdateLog.objects.count()

        # 3. Build recent_activity (last 10 UpdateLog entries).
        # Use select_related to join at the DB level, preventing N+1 queries.
        recent_logs = (
            UpdateLog.objects
            .select_related('slot__zone', 'user')
            .order_by('-logged_at')[:10]
        )

        recent_activity_list = [
            {
                'id': str(log.id),
                'slot_code': log.slot.slot_code,
                'zone_name': log.slot.zone.name,
                'reported_status': log.reported_status,
                'source_weight': str(log.source_weight),
                'logged_at': log.logged_at.isoformat(),
                'actioned_by': log.user.email if log.user else 'system'
            }
            for log in recent_logs
        ]

        # 4. Assemble final payload
        payload = {
            'total_users': total_users,
            'total_drivers': total_drivers,
            'total_marshals': total_marshals,
            'total_slots': total_slots,
            'occupied_slots': occupied_slots,
            'free_slots': free_slots,
            'total_zones': total_zones,
            'total_logs': total_logs,
            'generated_at': timezone.now().isoformat(),
            'recent_activity': recent_activity_list,
        }

        # 5. Cache the payload
        try:
            cache.set(CACHE_KEY, payload, timeout=CACHE_TTL)
        except Exception as e:
            logger.error("Failed to write to cache in AdminStatsView: %s", e)

        # 6. Return Response
        return Response(payload)
