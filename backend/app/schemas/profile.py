from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class CustomerProfileBase(BaseModel):
    age: int = Field(..., ge=18, le=100, description="Age must be between 18 and 100")
    pan_number: Optional[str] = Field(None, description="PAN Card number for CIBIL checks")
    employment_type: str = Field(..., description="Employment type must be Salaried, Self-Employed, or Business")
    monthly_income: float = Field(..., gt=0, description="Monthly income must be greater than 0")
    monthly_expenses: float = Field(..., ge=0, description="Monthly expenses must be 0 or more")
    existing_emis: float = Field(default=0.0, ge=0, description="Existing EMIs must be 0 or more")
    credit_score: int = Field(..., ge=300, le=900, description="Credit score must be between 300 and 900")
    loan_purpose: str = Field(..., description="Loan purpose must be Home, Personal, Education, Auto, or Business")
    required_loan_amount: float = Field(..., gt=0, description="Required loan amount must be greater than 0")
    preferred_loan_tenure_months: int = Field(..., gt=0, description="Tenure must be greater than 0 months")

class CustomerProfileCreate(CustomerProfileBase):
    full_name: Optional[str] = Field(None, description="Full Name of the customer")

class CustomerProfileOut(CustomerProfileBase):
    id: int
    user_id: int
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
