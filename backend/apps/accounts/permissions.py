from rest_framework.permissions import BasePermission
from apps.accounts.models import UserRole

class IsDriver(BasePermission):
    """
    Allows access only to users with the DRIVER role.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.DRIVER
        )

class IsMarshal(BasePermission):
    """
    Allows access only to users with the MARSHAL role.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.MARSHAL
        )

class IsAdmin(BasePermission):
    """
    Allows access only to users with the ADMIN role.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )
