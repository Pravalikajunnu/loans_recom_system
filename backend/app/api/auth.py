from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.api import deps
from app.core import security
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token
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
