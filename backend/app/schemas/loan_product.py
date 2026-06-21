from datetime import datetime
from pydantic import BaseModel, Field
from typing import List

class LoanProductBase(BaseModel):
    bank_name: str = Field(..., description="Name of the bank or NBFC")
    loan_type: str = Field(..., description="Type of loan: Home, Personal, Education, Auto, Business")
    interest_rate: float = Field(..., gt=0, le=100, description="Annual interest rate percentage")
    processing_fee_percent: float = Field(..., ge=0, le=100, description="Processing fee percentage of loan amount")
    min_credit_score: int = Field(..., ge=300, le=900, description="Minimum credit score required")
    max_loan_amount: float = Field(..., gt=0, description="Maximum amount that can be borrowed")
    min_income_requirement: float = Field(..., ge=0, description="Minimum monthly income requirement")
    tenure_options_months: List[int] = Field(..., description="List of available tenure options in months")

class LoanProductCreate(LoanProductBase):
    pass

class LoanProductOut(LoanProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
