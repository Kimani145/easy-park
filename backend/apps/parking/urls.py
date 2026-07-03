from django.urls import path
from apps.parking.views import CheckinView, MapGridView

app_name = 'parking'

urlpatterns = [
    path('<uuid:id>/checkin/', CheckinView.as_view(), name='checkin'),
    path('map-grid/', MapGridView.as_view(), name='map-grid'),
]
