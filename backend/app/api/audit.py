from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogOut

router = APIRouter()

@router.get("", response_model=List[AuditLogOut])
def get_system_audit_logs(
    *,
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    """Retrieve system audit logs. Restricted to Administrative users."""
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(200)  # Limit to last 200 logs for performance
        .all()
    )
    return logs
