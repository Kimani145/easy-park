from rest_framework import serializers
from apps.parking.models import SlotStatus

class OverrideSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SlotStatus.choices)

class ActionSerializer(serializers.Serializer):
    idempotency_key = serializers.CharField(max_length=255, required=True)
    slot_id = serializers.UUIDField(required=True)
    action = serializers.CharField(max_length=50, required=True)
    payload = serializers.DictField(required=True)
    original_timestamp = serializers.DateTimeField(required=True)

    def validate_payload(self, value):
        if 'status' not in value:
            raise serializers.ValidationError(
                {'payload': 'status must be FREE or OCCUPIED'}
            )
        if value['status'] not in ('FREE', 'OCCUPIED'):
            raise serializers.ValidationError(
                {'payload': 'status must be FREE or OCCUPIED'}
            )
        return value

class BulkSyncSerializer(serializers.Serializer):
    sync_batch_id = serializers.CharField(max_length=255, required=True)
    client_device_time = serializers.DateTimeField(required=True)
    # The max_length=100 limit on queued_actions prevents memory exhaustion
    # from excessively large bulk synchronization batches.
    queued_actions = serializers.ListField(
        child=ActionSerializer(),
        min_length=1,
        max_length=100
    )
