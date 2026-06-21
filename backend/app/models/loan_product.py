from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class LoanProduct(Base):
    __tablename__ = "loan_products"
    
    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String, nullable=False)
    loan_type = Column(String, nullable=False)  # Home, Personal, Education, Auto, Business
    interest_rate = Column(Float, nullable=False)  # e.g., 7.5 for 7.5%
    processing_fee_percent = Column(Float, default=1.0, nullable=False)  # e.g., 1.0 for 1%
    min_credit_score = Column(Integer, default=600, nullable=False)
    max_loan_amount = Column(Float, nullable=False)
    min_income_requirement = Column(Float, nullable=False)
    tenure_options_months = Column(JSON, nullable=False)  # List of numbers, e.g., [12, 24, 36, 48, 60]
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
