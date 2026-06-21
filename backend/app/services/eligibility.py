def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """Calculate the Equated Monthly Installment (EMI) for a loan.
    Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    """
    r = (annual_rate / 12) / 100  # Monthly interest rate
    if r == 0:
        return principal / tenure_months
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    return round(emi, 2)

def calculate_dti(existing_emis: float, proposed_emi: float, monthly_income: float) -> float:
    """Calculate the Debt-to-Income (DTI) ratio as a percentage."""
    if monthly_income <= 0:
        return 100.0
    return round(((existing_emis + proposed_emi) / monthly_income) * 100, 2)

def evaluate_credit_score(score: int) -> dict:
    """Evaluate credit score and return rating and approval probability."""
    if score >= 750:
        return {"rating": "Excellent", "probability": "High", "score_factor": 1.0}
    elif score >= 700:
        return {"rating": "Good", "probability": "High", "score_factor": 0.85}
    elif score >= 650:
        return {"rating": "Average", "probability": "Medium", "score_factor": 0.60}
    elif score >= 600:
        return {"rating": "Fair", "probability": "Low", "score_factor": 0.35}
    else:
        return {"rating": "Poor", "probability": "Very Low", "score_factor": 0.0}

def analyze_eligibility(
    age: int,
    employment_type: str,
    monthly_income: float,
    monthly_expenses: float,
    existing_emis: float,
    credit_score: int,
    required_loan_amount: float,
    preferred_loan_tenure_months: int,
    baseline_interest_rate: float = 10.0  # Default baseline interest rate to check initial eligibility
) -> dict:
    """Perform a comprehensive eligibility analysis on the user's financial profile."""
    # 1. Estimate proposed EMI using baseline rate
    proposed_emi = calculate_emi(required_loan_amount, baseline_interest_rate, preferred_loan_tenure_months)
    
    # 2. DTI calculation
    dti = calculate_dti(existing_emis, proposed_emi, monthly_income)
    
    # 3. Disposable income check
    disposable_income = monthly_income - monthly_expenses - existing_emis
    affordability_ratio = (proposed_emi / disposable_income * 100) if disposable_income > 0 else 100.0
    
    # 4. Credit assessment
    credit_eval = evaluate_credit_score(credit_score)
    
    # 5. Income Stability
    stability = "High" if employment_type.lower() == "salaried" else "Medium"
    
    # 6. Status Determination
    status = "Eligible"
    reasons = []
    
    if age < 18 or age > 70:
        status = "Ineligible"
        reasons.append("Age must be between 18 and 70 years to be eligible for loans.")
        
    if credit_eval["rating"] == "Poor":
        status = "Ineligible"
        reasons.append(f"Credit score ({credit_score}) is below the minimum required threshold of 600.")
        
    if dti > 60.0:
        status = "Ineligible"
        reasons.append(f"Debt-to-Income (DTI) ratio ({dti}%) exceeds the absolute maximum threshold of 60%.")
    elif dti > 50.0:
        if status != "Ineligible":
            status = "Conditionally Eligible"
        reasons.append(f"DTI ({dti}%) is elevated (above 50%). Lower loan amounts are suggested.")

    if disposable_income <= 0:
        status = "Ineligible"
        reasons.append("Monthly expenses and existing EMIs exceed total monthly income. No disposable income remains.")
    elif proposed_emi > disposable_income:
        status = "Ineligible"
        reasons.append(f"Proposed monthly EMI ({proposed_emi}) exceeds available monthly disposable income ({disposable_income:.2f}).")
    elif proposed_emi > 0.60 * disposable_income:
        if status != "Ineligible":
            status = "Conditionally Eligible"
        reasons.append(f"Proposed monthly EMI ({proposed_emi}) consumes a large portion ({affordability_ratio:.1f}%) of disposable income.")

    if status == "Eligible":
        reasons.append("Financial profile fits initial eligibility parameters (Good DTI, stable disposable income, and healthy credit score).")
        
    return {
        "status": status,
        "proposed_emi": proposed_emi,
        "dti_ratio": dti,
        "disposable_income": max(0.0, disposable_income),
        "affordability_ratio": round(affordability_ratio, 2),
        "credit_rating": credit_eval["rating"],
        "approval_probability": credit_eval["probability"],
        "income_stability": stability,
        "reasons": reasons
    }
