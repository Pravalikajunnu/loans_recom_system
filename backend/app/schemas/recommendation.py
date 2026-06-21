from datetime import datetime
from pydantic import BaseModel
from typing import Any, Dict, List

class RecommendationHistoryOut(BaseModel):
    id: int
    user_id: int
    profile_snapshot: Dict[str, Any]
    matched_loans: List[Dict[str, Any]]
    ai_response: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
