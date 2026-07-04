from django.urls import path
from .views import AdminStatsView

app_name = 'admin_panel'
urlpatterns = [
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
]
