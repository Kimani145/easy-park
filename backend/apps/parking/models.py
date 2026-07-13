import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models

class SlotStatus(models.TextChoices):
    FREE = 'FREE', 'Free'
    OCCUPIED = 'OCCUPIED', 'Occupied'

class ParkingSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slot_code = models.CharField(max_length=50, unique=True)
    street_name = models.CharField(max_length=255)
    zone = models.CharField(max_length=50)
    parking_type = models.CharField(max_length=50)
    location = gis_models.PointField(geography=True, srid=4326)
    
    current_status = models.CharField(
        max_length=10,
        choices=SlotStatus.choices,
        default=SlotStatus.FREE
    )
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parking_slots'
        indexes = [
            gis_models.Index(fields=['location'], name='idx_slots_spatial')
        ]

    def __str__(self):
        return self.slot_code
