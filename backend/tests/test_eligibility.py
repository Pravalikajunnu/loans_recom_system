import pytest
from app.services.eligibility import calculate_emi, calculate_dti, evaluate_credit_score, analyze_eligibility

def test_calculate_emi():
    # Principal: 20000, Rate: 10%, Tenure: 24 months
    # Formula: 20000 * 0.008333 * (1.008333^24) / ((1.008333^24) - 1)
    emi = calculate_emi(20000, 10.0, 24)
    assert emi > 0
    # ~922.9
    assert 920 < emi < 925

def test_calculate_dti():
    dti = calculate_dti(500, 500, 5000)
    assert dti == 20.0
    
    dti_zero_income = calculate_dti(500, 500, 0)
    assert dti_zero_income == 100.0

def test_evaluate_credit_score():
    assert evaluate_credit_score(800)["rating"] == "Excellent"
    assert evaluate_credit_score(720)["rating"] == "Good"
    assert evaluate_credit_score(680)["rating"] == "Average"
    assert evaluate_credit_score(620)["rating"] == "Fair"
    assert evaluate_credit_score(550)["rating"] == "Poor"

def test_analyze_eligibility_excellent():
    result = analyze_eligibility(
        age=30,
        employment_type="Salaried",
        monthly_income=10000,
        monthly_expenses=3000,
        existing_emis=500,
        credit_score=780,
        required_loan_amount=20000,
        preferred_loan_tenure_months=24
    )
    assert result["status"] == "Eligible"
    assert result["credit_rating"] == "Excellent"
    assert result["income_stability"] == "High"
    assert result["dti_ratio"] < 20.0

def test_analyze_eligibility_poor_credit():
    result = analyze_eligibility(
        age=30,
        employment_type="Salaried",
        monthly_income=10000,
        monthly_expenses=3000,
        existing_emis=500,
        credit_score=550,
        required_loan_amount=20000,
        preferred_loan_tenure_months=24
    )
    assert result["status"] == "Ineligible"
    assert "Credit score" in str(result["reasons"])
