from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from fastapi import Request
from typing import Any, Dict, Optional

def log_event(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    request: Optional[Request] = None,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Helper function to record system audit logs."""
    ip_address = None
    if request and request.client:
        ip_address = request.client.host
        
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        details=details
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
