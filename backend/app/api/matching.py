from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.api import deps
from app.models.user import User
from app.models.profile import CustomerProfile
from app.models.loan_product import LoanProduct
from app.models.recommendation import RecommendationHistory
from app.schemas.recommendation import RecommendationHistoryOut
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import eligibility, matching, gemini_agent, audit

router = APIRouter()

@router.post("/analyze", response_model=Dict[str, Any])
def analyze_and_recommend(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    request: Request
):
    """Run eligibility analysis, match loan products, and generate Gemini recommendations."""
    # 1. Fetch user profile
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Financial profile is missing. Please complete the intake form first."
        )
        
    # 2. Run eligibility analysis
    eligibility_report = eligibility.analyze_eligibility(
        age=profile.age,
        employment_type=profile.employment_type,
        monthly_income=profile.monthly_income,
        monthly_expenses=profile.monthly_expenses,
        existing_emis=profile.existing_emis,
        credit_score=profile.credit_score,
        required_loan_amount=profile.required_loan_amount,
        preferred_loan_tenure_months=profile.preferred_loan_tenure_months
    )
    
    # 3. Match against loan products in DB
    matched_loans = matching.match_loans(db, profile)
    
    # Fetch all loan products in DB for prompt reference
    all_loans = db.query(LoanProduct).all()
    
    # 4. Generate Gemini Recommendation
    profile_dict = {
        "age": profile.age,
        "employment_type": profile.employment_type,
        "monthly_income": profile.monthly_income,
        "monthly_expenses": profile.monthly_expenses,
        "existing_emis": profile.existing_emis,
        "credit_score": profile.credit_score,
        "loan_purpose": profile.loan_purpose,
        "required_loan_amount": profile.required_loan_amount,
        "preferred_loan_tenure_months": profile.preferred_loan_tenure_months
    }
    
    ai_recommendation = gemini_agent.generate_loan_recommendations(
        profile_dict=profile_dict,
        matched_loans=matched_loans,
        all_loans=all_loans
    )
    
    # 5. Save recommendation to database history
    history_entry = RecommendationHistory(
        user_id=current_user.id,
        profile_snapshot=profile_dict,
        matched_loans=matched_loans,
        ai_response=ai_recommendation
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    # 6. Write Audit Log
    audit.log_event(
        db=db,
        action="GENERATE_RECOMMENDATION",
        user_id=current_user.id,
        request=request,
        details={
            "matched_loans_count": len(matched_loans),
            "best_loan_selected": (ai_recommendation.get("best_loan") or {}).get("bank_name") if ai_recommendation else None,
            "recommendation_id": history_entry.id
        }
    )
    
    return {
        "id": history_entry.id,
        "eligibility": eligibility_report,
        "matched_loans": matched_loans,
        "ai_recommendation": ai_recommendation,
        "created_at": history_entry.created_at
    }

@router.get("/history", response_model=List[RecommendationHistoryOut])
def get_recommendation_history(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Retrieve historical recommendation reports for the current user."""
    history = (
        db.query(RecommendationHistory)
        .filter(RecommendationHistory.user_id == current_user.id)
        .order_by(RecommendationHistory.created_at.desc())
        .all()
    )
    return history

@router.post("/chat", response_model=ChatResponse)
def chat_with_advisor(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    payload: ChatRequest
):
    """Chat with the AI Financial Advisor based on the customer's current financial profile."""
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == current_user.id).first()
    if not profile:
        return ChatResponse(
            answer="Please complete your **Financial Profile** first so I can analyze your credit score, DTI ratio, and match you with eligible loans to provide accurate advisory services."
        )

    matched_loans = matching.match_loans(db, profile)
    history_list = [{"role": msg.role, "content": msg.content} for msg in payload.messages]

    profile_dict = {
        "age": profile.age,
        "employment_type": profile.employment_type,
        "monthly_income": profile.monthly_income,
        "monthly_expenses": profile.monthly_expenses,
        "existing_emis": profile.existing_emis,
        "credit_score": profile.credit_score,
        "loan_purpose": profile.loan_purpose,
        "required_loan_amount": profile.required_loan_amount,
        "preferred_loan_tenure_months": profile.preferred_loan_tenure_months
    }

    answer = gemini_agent.generate_chat_response(
        profile_dict=profile_dict,
        matched_loans=matched_loans,
        history=history_list,
        question=payload.question
    )

    return ChatResponse(answer=answer)
