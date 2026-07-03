from rest_framework import serializers

class CheckinSerializer(serializers.Serializer):
    latitude = serializers.FloatField(
        required=True,
        min_value=-90.0,
        max_value=90.0,
        error_messages={
            'min_value': 'Latitude must be between -90 and 90.',
            'max_value': 'Latitude must be between -90 and 90.',
        }
    )
    longitude = serializers.FloatField(
        required=True,
        min_value=-180.0,
        max_value=180.0,
        error_messages={
            'min_value': 'Longitude must be between -180 and 180.',
            'max_value': 'Longitude must be between -180 and 180.',
        }
    )

class MapGridQuerySerializer(serializers.Serializer):
    lat = serializers.FloatField(required=True)
    lng = serializers.FloatField(required=True)
    radius = serializers.FloatField(required=False, default=500.0)

    def validate_lat(self, value):
        if not (-90.0 <= value <= 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_lng(self, value):
        if not (-180.0 <= value <= 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate_radius(self, value):
        if value < 50.0:
            raise serializers.ValidationError("Radius must be at least 50 meters.")
        if value > 1000.0:
            raise serializers.ValidationError("Radius cannot exceed 1000 meters.")
        return value
