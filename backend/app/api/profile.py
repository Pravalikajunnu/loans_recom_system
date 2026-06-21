from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import logging
import json
import google.generativeai as genai
from app.config import settings
from app.api import deps
from app.models.user import User
from app.models.profile import CustomerProfile
from app.schemas.profile import CustomerProfileCreate, CustomerProfileOut
from app.services.eligibility import analyze_eligibility
from app.services.audit import log_event

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=CustomerProfileOut)
def get_my_profile(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Retrieve the financial profile of the currently logged-in user."""
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial profile has not been created yet."
        )
    profile.full_name = current_user.full_name
    return profile

@router.post("", response_model=CustomerProfileOut)
def create_or_update_my_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: CustomerProfileCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request
):
    """Create a new financial profile or update the existing one for the current user."""
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == current_user.id).first()
    
    if profile_in.full_name:
        current_user.full_name = profile_in.full_name
        db.add(current_user)
        
    profile_data = profile_in.model_dump(exclude={"full_name"})
    
    if profile:
        # Update existing profile fields
        for field, value in profile_data.items():
            setattr(profile, field, value)
        action = "UPDATE_PROFILE"
    else:
        # Create new profile
        profile = CustomerProfile(**profile_data, user_id=current_user.id)
        db.add(profile)
        action = "CREATE_PROFILE"
        
    db.commit()
    db.refresh(profile)
    
    profile.full_name = current_user.full_name
    
    # Analyze eligibility to audit-log the status
    eligibility = analyze_eligibility(
        age=profile.age,
        employment_type=profile.employment_type,
        monthly_income=profile.monthly_income,
        monthly_expenses=profile.monthly_expenses,
        existing_emis=profile.existing_emis,
        credit_score=profile.credit_score,
        required_loan_amount=profile.required_loan_amount,
        preferred_loan_tenure_months=profile.preferred_loan_tenure_months
    )
    
    # Audit log
    log_event(
        db=db,
        action=action,
        user_id=current_user.id,
        request=request,
        details={
            "monthly_income": profile.monthly_income,
            "credit_score": profile.credit_score,
            "required_loan_amount": profile.required_loan_amount,
            "eligibility_status": eligibility["status"]
        }
    )
    
    return profile

class CibilCheckRequest(BaseModel):
    pan_number: str = Field(..., min_length=10, max_length=10, description="10-digit PAN Card Number")

@router.post("/fetch-cibil-score")
def fetch_cibil_score(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    request_data: CibilCheckRequest,
    request: Request
):
    """Simulate fetching CIBIL score from credit bureau based on PAN Card."""
    pan = request_data.pan_number.upper().strip()
    
    # Generate a deterministic mock score between 600 and 850 based on PAN hashing
    char_sum = sum(ord(c) for c in pan)
    score_range = 850 - 600
    mock_score = 600 + (char_sum % score_range)
    
    # Ensure it's a realistic CIBIL score
    mock_score = int(mock_score)
    
    # Log audit event
    log_event(
        db=db,
        action="FETCH_CIBIL_SCORE",
        user_id=current_user.id,
        request=request,
        details={"pan_hash": f"***{pan[-4:]}" if len(pan) >= 4 else "***", "fetched_score": mock_score}
    )
    
    return {"pan_number": pan, "credit_score": mock_score, "rating": "Good" if mock_score >= 700 else "Average"}

@router.post("/ocr")
async def ocr_extract_financials(
    *,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user)
):
    """Analyze uploaded paystubs or bank statements to extract income, expenses, and employment type."""
    filename = file.filename.lower()
    
    # 1. Real Gemini OCR analysis
    if settings.GEMINI_API_KEY:
        try:
            # Read bytes
            file_bytes = await file.read()
            
            prompt = """
            You are an expert financial auditor OCR system. 
            Analyze this uploaded document (which is a payslip, bank statement, or financial report).
            Extract the following parameters and return them as a clean JSON object.
            Ensure you output ONLY a raw JSON string conforming to this structure:
            {
              "monthly_income": 75000.0,
              "monthly_expenses": 20000.0,
              "existing_emis": 5000.0,
              "employment_type": "Salaried"
            }
            Rules:
            - monthly_income: must be a float (monthly salary, credits, or earnings). If not found, default to 0.0.
            - monthly_expenses: must be a float (recurrent expenses, debit averages). If not found, default to 0.0.
            - existing_emis: must be a float (any EMI, loan payments, card finance charges). If not found, default to 0.0.
            - employment_type: must be one of: "Salaried", "Self-Employed", "Business".
            Ensure that you return ONLY the raw JSON object. Do not wrap the JSON output in markdown fences (e.g., do not use ```json ... ```).
            """
            
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content([
                {
                    "mime_type": file.content_type,
                    "data": file_bytes
                },
                prompt
            ])
            
            cleaned_text = response.text.strip()
            # Remove possible markdown wrapper if model ignored instructions
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text.split("\n", 1)[1]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text.rsplit("\n", 1)[0]
                cleaned_text = cleaned_text.replace("json", "").strip()
                
            data = json.loads(cleaned_text)
            return {
                "success": True,
                "message": "AI successfully parsed the document.",
                "data": {
                    "monthly_income": float(data.get("monthly_income") or 0.0),
                    "monthly_expenses": float(data.get("monthly_expenses") or 0.0),
                    "existing_emis": float(data.get("existing_emis") or 0.0),
                    "employment_type": data.get("employment_type") or "Salaried"
                }
            }
        except Exception as e:
            logger.error(f"Failed to extract document content via Gemini: {str(e)}")
            # Fall back to mock
            
    # 2. High-fidelity Mock Response (if API key missing or call fails)
    # Check filename for keywords to return different mock profiles
    if "business" in filename or "corp" in filename:
        mock_data = {
            "monthly_income": 145000.0,
            "monthly_expenses": 45000.0,
            "existing_emis": 15000.0,
            "employment_type": "Business"
        }
    elif "self" in filename or "freelance" in filename:
        mock_data = {
            "monthly_income": 95000.0,
            "monthly_expenses": 28000.0,
            "existing_emis": 7500.0,
            "employment_type": "Self-Employed"
        }
    else:
        mock_data = {
            "monthly_income": 65000.0,
            "monthly_expenses": 18000.0,
            "existing_emis": 4000.0,
            "employment_type": "Salaried"
        }
        
    return {
        "success": True,
        "message": f"Parsed {file.filename} (Simulation Mode).",
        "data": mock_data
    }
