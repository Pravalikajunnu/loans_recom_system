from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import User
from app.models.profile import CustomerProfile
from app.models.loan_product import LoanProduct
from app.models.recommendation import RecommendationHistory
from app.models.audit_log import AuditLog

# Configure cross-model relationships
User.profile = relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
User.recommendations = relationship("RecommendationHistory", back_populates="user", cascade="all, delete")
