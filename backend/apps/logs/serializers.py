from rest_framework import serializers
from apps.parking.models import SlotStatus

class OverrideSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SlotStatus.choices)
