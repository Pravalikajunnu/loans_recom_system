from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="customer", nullable=False)  # customer or admin
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reset_token = Column(String, unique=True, index=True, nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

