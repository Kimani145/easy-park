"""
Conflict Resolution Service for Parking Slot Status Updates

This module provides the core logic to resolve conflicting status reports for parking slots.

Why apply_decay_factor() was removed:
Per the project doctrine, apply_decay_factor() is out of scope. We do not decay weights over time;
instead, we rely on static authority weights mapped to user roles.

Static weight values:
- DRIVER_SOURCE_WEIGHT (0.40): Drivers have a lower authority score. Multiple driver reports do not aggregate
  to override higher-authority reports.
- MARSHAL_SOURCE_WEIGHT (1.00): Marshals and Admins have absolute authority (1.00).

Meaning of "authoritative" in resolve_slot_status:
A log entry is considered more authoritative if it has a higher source weight. In the event of a tie
in source weights (e.g., multiple driver updates or multiple marshal updates), the most recent update
(determined by the logged_at timestamp) takes precedence.
"""

from decimal import Decimal
from config.constants import DRIVER_SOURCE_WEIGHT, MARSHAL_SOURCE_WEIGHT
from apps.accounts.models import UserRole as Role
from apps.logs.models import UpdateLog

def get_source_weight(user_role: str) -> Decimal:
    """
    Returns the static authority weight for a given user role.
    """
    if user_role in (Role.MARSHAL, Role.ADMIN):
        return Decimal(str(MARSHAL_SOURCE_WEIGHT))
    elif user_role == Role.DRIVER:
        return Decimal(str(DRIVER_SOURCE_WEIGHT))
    return Decimal(str(DRIVER_SOURCE_WEIGHT))

def resolve_slot_status(slot) -> str:
    """
    Resolves the status of a parking slot by selecting the most authoritative
    reported status from its update logs. Ties are resolved by choosing the most recent log.
    """
    authoritative = (
        UpdateLog.objects
        .filter(slot=slot)
        .order_by('-source_weight', '-logged_at')
        .first()
    )
    return authoritative.reported_status if authoritative else slot.current_status
