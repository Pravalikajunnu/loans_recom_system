from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.api import deps
from app.models.user import User
from app.models.profile import CustomerProfile
from app.models.recommendation import RecommendationHistory

router = APIRouter()

@router.get("/summary", response_model=Dict[str, Any])
def get_analytics_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
):
    """Get high-level statistics summary for admin users."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_profiles = db.query(func.count(CustomerProfile.id)).scalar() or 0
    total_recommendations = db.query(func.count(RecommendationHistory.id)).scalar() or 0
    
    avg_credit = db.query(func.avg(CustomerProfile.credit_score)).scalar() or 0.0
    avg_income = db.query(func.avg(CustomerProfile.monthly_income)).scalar() or 0.0
    avg_loan = db.query(func.avg(CustomerProfile.required_loan_amount)).scalar() or 0.0
    
    return {
        "total_users": total_users,
        "total_profiles": total_profiles,
        "total_recommendations": total_recommendations,
        "average_credit_score": round(float(avg_credit), 1),
        "average_monthly_income": round(float(avg_income), 2),
        "average_requested_loan": round(float(avg_loan), 2)
    }

@router.get("/distributions", response_model=Dict[str, Any])
def get_analytics_distributions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
):
    """Get distribution breakdowns of loan purposes, employment types, and matching stats."""
    # 1. Purpose distribution
    purposes = (
        db.query(CustomerProfile.loan_purpose, func.count(CustomerProfile.id))
        .group_by(CustomerProfile.loan_purpose)
        .all()
    )
    purpose_dist = [{"name": p[0], "value": p[1]} for p in purposes]
    
    # 2. Employment type distribution
    employments = (
        db.query(CustomerProfile.employment_type, func.count(CustomerProfile.id))
        .group_by(CustomerProfile.employment_type)
        .all()
    )
    employment_dist = [{"name": e[0], "value": e[1]} for e in employments]
    
    # 3. Recommendations bank frequency
    recoms = db.query(RecommendationHistory.ai_response).limit(100).all()
    bank_counts = {}
    for r in recoms:
        ai_resp = r[0]
        if ai_resp and isinstance(ai_resp, dict):
            best_loan = ai_resp.get("best_loan")
            if best_loan and isinstance(best_loan, dict):
                bank_name = best_loan.get("bank_name")
                if bank_name:
                    bank_counts[bank_name] = bank_counts.get(bank_name, 0) + 1
                    
    bank_dist = [{"name": bank, "value": count} for bank, count in bank_counts.items()]
    
    return {
        "loan_purpose_distribution": purpose_dist,
        "employment_type_distribution": employment_dist,
        "bank_recommendations_distribution": bank_dist
    }
