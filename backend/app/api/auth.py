from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import random
import secrets

from app.api import deps
from app.core import security
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest
from app.services.audit import log_event

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    request: Request
):
    """Register a new user with case-insensitive duplicate email check."""
    clean_email = user_in.email.strip().lower()
    
    # Case-insensitive duplicate check
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already registered. Please sign in instead or use a different email address."
        )
    
    # Make first user admin for system initialization
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "customer"

    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        email=clean_email,
        hashed_password=hashed_password,
        full_name=user_in.full_name.strip(),
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log the registration event
    log_event(
        db=db,
        action="REGISTER",
        user_id=db_user.id,
        request=request,
        details={"email": db_user.email, "role": db_user.role}
    )
    
    return db_user

@router.post("/token", response_model=Token)
def login_for_access_token(
    *,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request
):
    """Standard OAuth2 password flow with normalized email lookup."""
    clean_email = form_data.username.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = security.create_access_token(subject=user.email)
    
    # Log the login event
    log_event(
        db=db,
        action="LOGIN",
        user_id=user.id,
        request=request,
        details={"email": user.email}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_user_me(current_user: User = Depends(deps.get_current_user)):
    """Fetch profile details of the currently logged-in user."""
    return current_user

@router.post("/forgot-password")
def forgot_password(
    *,
    db: Session = Depends(deps.get_db),
    payload: ForgotPasswordRequest,
    request: Request
):
    """Initiate password recovery. Generates a 6-digit OTP code valid for 10 minutes."""
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please check your email or register."
        )
        
    # Generate 6-digit numeric OTP code
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    # Log audit event
    log_event(
        db=db,
        action="FORGOT_PASSWORD_REQUEST",
        user_id=user.id,
        request=request,
        details={"email": user.email, "otp_generated": True}
    )
    
    return {
        "message": f"A 6-digit OTP has been sent to {clean_email}.",
        "otp_code": otp_code,
        "email": clean_email,
        "expires_in": "10 minutes"
    }

@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(deps.get_db),
    payload: ResetPasswordRequest,
    request: Request
):
    """Reset password using 6-digit OTP code or reset token."""
    user = None
    
    if payload.otp_code and payload.email:
        clean_email = payload.email.strip().lower()
        user = db.query(User).filter(
            func.lower(User.email) == clean_email,
            User.otp_code == payload.otp_code.strip(),
            User.otp_expires_at > datetime.utcnow()
        ).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code. Please verify the code or request a new OTP."
            )
    elif payload.token:
        user = db.query(User).filter(
            User.reset_token == payload.token,
            User.reset_token_expires_at > datetime.utcnow()
        ).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The password reset token is invalid or has expired."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an OTP code or password reset token."
        )
        
    user.hashed_password = security.get_password_hash(payload.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    # Log audit event
    log_event(
        db=db,
        action="PASSWORD_RESET_SUCCESS",
        user_id=user.id,
        request=request,
        details={"email": user.email}
    )
    
    return {"message": "Password has been successfully updated. You can now log in."}

