from app.services.eligibility import calculate_emi, calculate_dti, evaluate_credit_score, analyze_eligibility

def test_calculate_emi():
    # EMI for 10,000 at 12% annual interest for 12 months should be around 888.49
    assert calculate_emi(10000, 12.0, 12) == 888.49
    # Zero interest case (rare but good edge case)
    assert calculate_emi(100000, 0, 10) == 10000.0

def test_calculate_dti():
    # Existing EMI: 500, Proposed EMI: 500, Income: 4000 -> 25% DTI
    assert calculate_dti(500.0, 500.0, 4000.0) == 25.0
    # Zero income edge case
    assert calculate_dti(500.0, 500.0, 0.0) == 100.0

def test_evaluate_credit_score():
    assert evaluate_credit_score(800)["rating"] == "Excellent"
    assert evaluate_credit_score(720)["rating"] == "Good"
    assert evaluate_credit_score(670)["rating"] == "Average"
    assert evaluate_credit_score(610)["rating"] == "Fair"
    assert evaluate_credit_score(500)["rating"] == "Poor"

def test_analyze_eligibility():
    # Strong eligible customer profile
    res = analyze_eligibility(
        age=30,
        employment_type="Salaried",
        monthly_income=6000.0,
        monthly_expenses=2000.0,
        existing_emis=500.0,
        credit_score=750,
        required_loan_amount=20000.0,
        preferred_loan_tenure_months=24,
        baseline_interest_rate=10.0
    )
    assert res["status"] == "Eligible"
    assert res["credit_rating"] == "Excellent"
    assert res["dti_ratio"] < 40.0
    
    # Ineligible customer profile due to low credit score
    res_poor_credit = analyze_eligibility(
        age=35,
        employment_type="Salaried",
        monthly_income=6000.0,
        monthly_expenses=2000.0,
        existing_emis=500.0,
        credit_score=550,  # Below 600
        required_loan_amount=20000.0,
        preferred_loan_tenure_months=24
    )
    assert res_poor_credit["status"] == "Ineligible"
    assert any("Credit score" in r for r in res_poor_credit["reasons"])

    # Ineligible customer profile due to high expenses and EMI exceeding disposable income
    res_high_emi = analyze_eligibility(
        age=40,
        employment_type="Business",
        monthly_income=3000.0,
        monthly_expenses=2500.0,
        existing_emis=400.0,
        credit_score=700,
        required_loan_amount=50000.0, # Proposed EMI will be ~2300, which exceeds income
        preferred_loan_tenure_months=24
    )
    assert res_high_emi["status"] == "Ineligible"
