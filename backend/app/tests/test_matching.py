from app.services.matching import match_loans
from app.models.profile import CustomerProfile
from app.models.loan_product import LoanProduct

def test_match_loans_empty_db(db_session):
    profile = CustomerProfile(
        age=30,
        employment_type="Salaried",
        monthly_income=5000.0,
        monthly_expenses=1500.0,
        existing_emis=0.0,
        credit_score=750,
        loan_purpose="Personal",
        required_loan_amount=20000.0,
        preferred_loan_tenure_months=24
    )
    res = match_loans(db_session, profile)
    assert len(res) == 0

def test_match_loans_filtering_and_ranking(db_session):
    # Add dummy products
    p1 = LoanProduct(
        bank_name="Bank A",
        loan_type="Personal",
        interest_rate=10.0,
        processing_fee_percent=1.0,
        min_credit_score=600,
        max_loan_amount=50000.0,
        min_income_requirement=2000.0,
        tenure_options_months=[12, 24, 36]
    )
    p2 = LoanProduct(
        bank_name="Bank B",
        loan_type="Personal",
        interest_rate=7.5, # Cheaper rate than Bank A
        processing_fee_percent=2.0,
        min_credit_score=700, # Higher credit requirement
        max_loan_amount=100000.0,
        min_income_requirement=3500.0,
        tenure_options_months=[12, 24, 36, 48]
    )
    p3 = LoanProduct(
        bank_name="Bank C",
        loan_type="Home", # Different loan type than requested
        interest_rate=6.0,
        processing_fee_percent=1.0,
        min_credit_score=600,
        max_loan_amount=500000.0,
        min_income_requirement=4000.0,
        tenure_options_months=[120, 240, 360]
    )
    db_session.add_all([p1, p2, p3])
    db_session.commit()

    # User profile that qualifies for Bank A and Bank B, but seeks Personal loan
    profile = CustomerProfile(
        age=30,
        employment_type="Salaried",
        monthly_income=4000.0,
        monthly_expenses=1500.0,
        existing_emis=0.0,
        credit_score=710, # Meet both 600 and 700 minimums
        loan_purpose="Personal",
        required_loan_amount=30000.0,
        preferred_loan_tenure_months=24
    )

    matches = match_loans(db_session, profile)

    # Should match Bank A and Bank B, but filter out Bank C (different loan type)
    assert len(matches) == 2
    
    # Should rank Bank B first because of its lower interest rate
    assert matches[0]["bank_name"] == "Bank B"
    assert matches[1]["bank_name"] == "Bank A"
    
    # Verify calculated fees
    assert matches[0]["processing_fee_amount"] == 600.0  # 30000 * 2%
    assert matches[1]["processing_fee_amount"] == 300.0  # 30000 * 1%
    
    # Verify EMIs are calculated
    assert matches[0]["emi"] > 0
    assert matches[1]["emi"] > 0
