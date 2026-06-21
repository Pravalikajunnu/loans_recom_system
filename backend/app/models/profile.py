from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age = Column(Integer, nullable=False)
    pan_number = Column(String, nullable=True)
    employment_type = Column(String, nullable=False)  # Salaried, Self-Employed, Business
    monthly_income = Column(Float, nullable=False)
    monthly_expenses = Column(Float, nullable=False)
    existing_emis = Column(Float, default=0.0, nullable=False)
    credit_score = Column(Integer, nullable=False)
    loan_purpose = Column(String, nullable=False)  # Home, Personal, Education, Auto, Business
    required_loan_amount = Column(Float, nullable=False)
    preferred_loan_tenure_months = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user = relationship("User", back_populates="profile")

# Update user.py relation later or do it directly
# We can add user relationship inside user.py: profile = relationship("CustomerProfile", back_populates="user", uselist=False)
