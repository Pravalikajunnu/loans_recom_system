from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

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
    """Register a new user. The first registered user automatically becomes the Admin."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system."
        )
    
    # Make first user admin for system initialization
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "customer"

    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
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
    """Standard OAuth2 password flow. Expects username (email) and password."""
    user = db.query(User).filter(User.email == form_data.username).first()
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
    """Initiate password recovery. Generates token and prints a simulated email reset link."""
    import secrets
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If the email is registered in our system, a password reset link has been generated."}
        
    token = secrets.token_hex(16)
    user.reset_token = token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    print(f"\n=======================================================")
    print(f"PASSWORD RESET REQUEST FOR: {user.email}")
    print(f"RESET LINK: {reset_link}")
    print(f"=======================================================\n")
    
    # Log audit event
    log_event(
        db=db,
        action="FORGOT_PASSWORD_REQUEST",
        user_id=user.id,
        request=request,
        details={"email": user.email}
    )
    
    return {
        "message": "If the email is registered in our system, a password reset link has been generated.",
        "debug_reset_link": reset_link
    }

@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(deps.get_db),
    payload: ResetPasswordRequest,
    request: Request
):
    """Reset password using a valid, non-expired recovery token."""
    from datetime import datetime
    
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires_at > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset token is invalid or has expired."
        )
        
    user.hashed_password = security.get_password_hash(payload.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    
    # Log audit event
    log_event(
        db=db,
        action="PASSWORD_RESET_SUCCESS",
        user_id=user.id,
        request=request,
        details={"email": user.email}
    )
    
    return {"message": "Password has been successfully updated."}
