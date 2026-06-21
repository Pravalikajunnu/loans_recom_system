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
