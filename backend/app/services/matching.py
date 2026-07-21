from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.loan_product import LoanProduct
from app.models.profile import CustomerProfile
from app.services.eligibility import calculate_emi, calculate_dti, evaluate_credit_score

def match_loans(db: Session, profile: CustomerProfile) -> List[Dict[str, Any]]:
    """Query loan products from database, filter them, and enrich with repayment calculations."""
    # 1. Fetch all products
    products = db.query(LoanProduct).all()
    matched_results = []
    
    # 2. Filter products based on user profile
    for product in products:
        # Credit Score Check
        if profile.credit_score < product.min_credit_score:
            continue
            
        # Income Check
        if profile.monthly_income < product.min_income_requirement:
            continue
            
        # Max Amount Check
        if profile.required_loan_amount > product.max_loan_amount:
            continue
            
        # Tenure Option Check
        # Ensure the preferred tenure falls within the product's range (min/max of tenure_options_months list)
        tenure_options = product.tenure_options_months
        if isinstance(tenure_options, list) and len(tenure_options) > 0:
            min_tenure = min(tenure_options)
            max_tenure = max(tenure_options)
            if not (min_tenure <= profile.preferred_loan_tenure_months <= max_tenure):
                continue
        else:
            continue
            
        # 3. Calculate specific metrics for this loan product
        emi = calculate_emi(
            profile.required_loan_amount,
            product.interest_rate,
            profile.preferred_loan_tenure_months
        )
        total_repayment = round(emi * profile.preferred_loan_tenure_months, 2)
        total_interest = round(total_repayment - profile.required_loan_amount, 2)
        processing_fee = round(profile.required_loan_amount * (product.processing_fee_percent / 100), 2)
        
        # Recalculate DTI with this actual EMI
        dti = calculate_dti(profile.existing_emis, emi, profile.monthly_income)
        
        # Calculate Approval Probability
        credit_eval = evaluate_credit_score(profile.credit_score)
        
        # Margin over minimum credit score
        score_margin = profile.credit_score - product.min_credit_score
        
        if dti > 50.0 or credit_eval["rating"] == "Poor":
            approval_prob = "Low"
        elif score_margin >= 100 and dti <= 40.0:
            approval_prob = "High"
        elif score_margin >= 50 and dti <= 45.0:
            approval_prob = "Medium-High"
        else:
            approval_prob = "Medium"
            
        matched_results.append({
            "product_id": product.id,
            "bank_name": product.bank_name,
            "loan_type": product.loan_type,
            "interest_rate": product.interest_rate,
            "processing_fee_percent": product.processing_fee_percent,
            "processing_fee_amount": processing_fee,
            "emi": emi,
            "total_repayment": total_repayment,
            "total_interest": total_interest,
            "dti_with_loan": dti,
            "approval_probability": approval_prob,
            # Store score for ranking (lower DTI and lower interest rates are ranked higher)
            "score": round((product.interest_rate * 0.6) + (dti * 0.4), 2)
        })
        
    # 4. Rank matching products: order by score ascending (lower is better/cheaper)
    matched_results.sort(key=lambda x: x["score"])
    
    # Remove temporary score from output
    for item in matched_results:
        item.pop("score", None)
        
    return matched_results

def evaluate_ineligibility_reasons(db: Session, profile: CustomerProfile) -> Dict[str, Any]:
    """Analyze why a customer profile failed to match loan products and generate improvement steps."""
    products = db.query(LoanProduct).all()
    reasons = []
    suggestions = []

    if not products:
        return {
            "reasons": ["No loan products are currently seeded in the bank catalog."],
            "suggestions": ["Contact bank support or refresh catalog."]
        }

    # 1. Credit Score Analysis
    min_credit = min(p.min_credit_score for p in products)
    if profile.credit_score < min_credit:
        reasons.append(
            f"CIBIL Credit Score of {profile.credit_score} is below the minimum lender requirement of {min_credit}."
        )
        suggestions.append(
            f"Focus on boosting your CIBIL score from {profile.credit_score} to at least {min_credit}+ by paying bills on time, keeping credit card balances below 30%, and avoiding new loan inquiries."
        )

    # 2. Income Analysis
    min_income = min(p.min_income_requirement for p in products)
    if profile.monthly_income < min_income:
        reasons.append(
            f"Monthly income of ₹{profile.monthly_income:,.2f} is below the minimum eligibility threshold of ₹{min_income:,.2f}."
        )
        suggestions.append(
            f"Consider adding a co-applicant (such as a spouse or parent) with stable income to satisfy minimum bank income requirements."
        )

    # 3. Requested Amount Analysis
    max_amount = max(p.max_loan_amount for p in products)
    if profile.required_loan_amount > max_amount:
        reasons.append(
            f"Requested loan amount of ₹{profile.required_loan_amount:,.2f} exceeds the maximum bank limit of ₹{max_amount:,.2f}."
        )
        suggestions.append(
            f"Reduce your requested loan amount to under ₹{max_amount:,.2f} or split your funding requirement across multiple loan products."
        )

    # 4. DTI & Debt Load Analysis
    base_dti = ((profile.monthly_expenses + profile.existing_emis) / profile.monthly_income * 100) if profile.monthly_income > 0 else 100
    if base_dti > 45.0:
        reasons.append(
            f"Current Debt-to-Income (DTI) ratio is high at {base_dti:.1f}% (monthly obligations: ₹{profile.monthly_expenses + profile.existing_emis:,.2f} out of ₹{profile.monthly_income:,.2f} income)."
        )
        suggestions.append(
            f"Pay off active short-term retail EMIs or reduce non-essential expenses to bring your DTI ratio below 40% before applying."
        )

    # Fallback if no specific failure triggered
    if not reasons:
        reasons.append("Preferred loan tenure does not fit within bank offer ranges or risk limits.")
        suggestions.append("Adjust your preferred tenure (e.g. 24, 36, 48, or 60 months) to view matching options.")

    return {
        "reasons": reasons,
        "suggestions": suggestions
    }

