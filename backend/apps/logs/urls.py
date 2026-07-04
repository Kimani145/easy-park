from django.urls import path
from apps.logs.views import MarshalOverrideView, BulkSyncView

app_name = 'logs'

urlpatterns = [
    path('slots/<uuid:slot_id>/override/',
         MarshalOverrideView.as_view(), name='marshal-override'),
    path('sync/bulk/', BulkSyncView.as_view(), name='bulk-sync'),
]
