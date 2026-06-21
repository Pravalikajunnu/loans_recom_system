from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api import deps
from app.models.user import User
from app.models.loan_product import LoanProduct
from app.schemas.loan_product import LoanProductCreate, LoanProductOut
from app.services.audit import log_event

router = APIRouter()

@router.get("", response_model=List[LoanProductOut])
def get_all_loans(
    *,
    db: Session = Depends(deps.get_db),
    loan_type: Optional[str] = None
):
    """Retrieve all available loan products, optionally filtered by loan type."""
    query = db.query(LoanProduct)
    if loan_type:
        query = query.filter(LoanProduct.loan_type.ilike(loan_type))
    return query.all()

@router.post("", response_model=LoanProductOut, status_code=status.HTTP_201_CREATED)
def create_loan_product(
    *,
    db: Session = Depends(deps.get_db),
    loan_in: LoanProductCreate,
    current_admin: User = Depends(deps.get_current_active_admin),
    request: Request
):
    """Create a new loan product (Admin only)."""
    product = LoanProduct(**loan_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log_event(
        db=db,
        action="ADMIN_CREATE_LOAN",
        user_id=current_admin.id,
        request=request,
        details={
            "bank_name": product.bank_name,
            "loan_type": product.loan_type,
            "product_id": product.id
        }
    )
    return product

@router.put("/{id}", response_model=LoanProductOut)
def update_loan_product(
    id: int,
    *,
    db: Session = Depends(deps.get_db),
    loan_in: LoanProductCreate,
    current_admin: User = Depends(deps.get_current_active_admin),
    request: Request
):
    """Update details of an existing loan product (Admin only)."""
    product = db.query(LoanProduct).filter(LoanProduct.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan product not found"
        )
    for field, value in loan_in.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    
    log_event(
        db=db,
        action="ADMIN_UPDATE_LOAN",
        user_id=current_admin.id,
        request=request,
        details={
            "bank_name": product.bank_name,
            "loan_type": product.loan_type,
            "product_id": product.id
        }
    )
    return product

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan_product(
    id: int,
    *,
    db: Session = Depends(deps.get_db),
    current_admin: User = Depends(deps.get_current_active_admin),
    request: Request
):
    """Delete a loan product (Admin only)."""
    product = db.query(LoanProduct).filter(LoanProduct.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan product not found"
        )
    db.delete(product)
    db.commit()
    
    log_event(
        db=db,
        action="ADMIN_DELETE_LOAN",
        user_id=current_admin.id,
        request=request,
        details={
            "bank_name": product.bank_name,
            "loan_type": product.loan_type,
            "product_id": id
        }
    )
    return None
