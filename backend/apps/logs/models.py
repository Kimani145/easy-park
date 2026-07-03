import uuid
from django.db import models
from apps.parking.models import SlotStatus

class UpdateLog(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    slot = models.ForeignKey(
        'parking.ParkingSlot',
        on_delete=models.CASCADE,
        related_name='logs'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='logs'
    )
    reported_status = models.CharField(
        max_length=10,
        choices=SlotStatus.choices
    )
    source_weight = models.DecimalField(
        max_digits=3,
        decimal_places=2
    )
    idempotency_key = models.CharField(
        max_length=255,
        unique=True
    )
    logged_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = 'update_logs'
        indexes = [
            models.Index(fields=['slot', '-logged_at'],
                         name='idx_logs_slot_time')
        ]
