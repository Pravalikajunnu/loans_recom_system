import pytest
from app.models.profile import CustomerProfile
from app.models.loan_product import LoanProduct
from app.services.matching import match_loans
from unittest.mock import MagicMock

def test_match_loans_filters_correctly():
    # Mock DB session
    mock_db = MagicMock()
    
    # Mock products
    prod1 = LoanProduct(
        id=1,
        bank_name="Test Bank 1",
        loan_type="Personal",
        interest_rate=10.0,
        processing_fee_percent=1.0,
        min_credit_score=700,
        min_income_requirement=5000,
        max_loan_amount=50000,
        tenure_options_months=[12, 24, 36]
    )
    prod2 = LoanProduct(
        id=2,
        bank_name="Test Bank 2",
        loan_type="Personal",
        interest_rate=15.0,
        processing_fee_percent=2.0,
        min_credit_score=600,
        min_income_requirement=2000,
        max_loan_amount=20000,
        tenure_options_months=[12, 24]
    )
    
    # Setup mock query to return these products
    mock_query = MagicMock()
    mock_query.all.return_value = [prod1, prod2]
    mock_db.query.return_value = mock_query

    # Test case 1: Qualifies for both, but prod1 should rank higher (lower interest)
    profile1 = CustomerProfile(
        age=30,
        monthly_income=6000,
        existing_emis=0,
        credit_score=750,
        required_loan_amount=10000,
        preferred_loan_tenure_months=24
    )
    
    matches1 = match_loans(mock_db, profile1)
    assert len(matches1) == 2
    # prod1 should be ranked first due to lower interest
    assert matches1[0]["product_id"] == 1
    assert matches1[1]["product_id"] == 2
    
    # Test case 2: Qualifies only for prod2 (credit score too low for prod1)
    profile2 = CustomerProfile(
        age=30,
        monthly_income=6000,
        existing_emis=0,
        credit_score=650,
        required_loan_amount=10000,
        preferred_loan_tenure_months=24
    )
    
    matches2 = match_loans(mock_db, profile2)
    assert len(matches2) == 1
    assert matches2[0]["product_id"] == 2

    # Test case 3: Qualifies for none (loan amount too high for prod2, credit too low for prod1)
    profile3 = CustomerProfile(
        age=30,
        monthly_income=6000,
        existing_emis=0,
        credit_score=650,
        required_loan_amount=30000,
        preferred_loan_tenure_months=24
    )
    matches3 = match_loans(mock_db, profile3)
    assert len(matches3) == 0

