import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models

class SlotStatus(models.TextChoices):
    FREE = 'FREE', 'Free'
    OCCUPIED = 'OCCUPIED', 'Occupied'

class Zone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    billing_rate_hour = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    boundary_polygon = gis_models.PolygonField(geography=True, srid=4326)

    class Meta:
        db_table = 'zones'
        indexes = [
            gis_models.Index(fields=['boundary_polygon'], name='idx_zones_spatial')
        ]

    def __str__(self):
        return f"{self.name} ({self.city})"

class ParkingSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zone = models.ForeignKey(
        'parking.Zone',
        on_delete=models.CASCADE,
        related_name='slots'
    )
    slot_code = models.CharField(max_length=20)
    coordinate = gis_models.PointField(geography=True, srid=4326)
    current_status = models.CharField(
        max_length=10,
        choices=SlotStatus.choices,
        default=SlotStatus.FREE
    )
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parking_slots'
        unique_together = [('zone', 'slot_code')]
        indexes = [
            gis_models.Index(fields=['coordinate'], name='idx_slots_spatial')
        ]

    def __str__(self):
        return f"{self.zone.name} - {self.slot_code}"
