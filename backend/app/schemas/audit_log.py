from datetime import datetime
from pydantic import BaseModel
from typing import Any, Dict, Optional

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    ip_address: Optional[str]
    details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
