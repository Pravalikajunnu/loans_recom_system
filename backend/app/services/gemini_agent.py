import os
import json
import logging
from typing import List, Dict, Any
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set. The application will use mock AI recommendations.")

def get_mock_recommendation(profile: Dict[str, Any], matched_loans: List[Dict[str, Any]], all_loans: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Fallback generator to return a realistic JSON payload when Gemini API is unavailable."""
    if not matched_loans:
        reasons = []
        suggestions = []
        
        income = profile.get("monthly_income", 0.0)
        expenses = profile.get("monthly_expenses", 0.0)
        emis = profile.get("existing_emis", 0.0)
        score = profile.get("credit_score", 0)
        required_amt = profile.get("required_loan_amount", 0.0)
        
        if all_loans:
            min_credit = min(l.min_credit_score for l in all_loans)
            max_amount = max(l.max_loan_amount for l in all_loans)
            min_income = min(l.min_income_requirement for l in all_loans)
            
            if score < min_credit:
                reasons.append(f"CIBIL Credit Score of {score} is below the minimum lender requirement of {min_credit}.")
                suggestions.append(f"Focus on boosting your CIBIL credit score from {score} to at least {min_credit}+ by making timely payments and keeping card utilization below 30%.")
                
            if income < min_income:
                reasons.append(f"Monthly income of ₹{income:,.2f} is below the minimum bank income requirement of ₹{min_income:,.2f}.")
                suggestions.append(f"Add a co-applicant (such as a spouse or parent) with verified income to satisfy minimum bank requirements.")
                
            if required_amt > max_amount:
                reasons.append(f"Requested loan amount of ₹{required_amt:,.2f} exceeds the maximum bank product limit of ₹{max_amount:,.2f}.")
                suggestions.append(f"Lower your requested loan amount to under ₹{max_amount:,.2f} or split the requirement into multiple loans.")
                
        dti = ((expenses + emis) / income * 100) if income > 0 else 100
        if dti > 45.0:
            reasons.append(f"Current Debt-to-Income (DTI) ratio is high at {dti:.1f}% (monthly obligations: ₹{expenses + emis:,.2f} out of ₹{income:,.2f} income).")
            suggestions.append(f"Pay off small active retail EMIs or trim monthly expenses to reduce your DTI ratio below 40% before reapplying.")
            
        if not reasons:
            reasons.append("Preferred loan tenure does not fit within bank offer ranges or credit risk limits.")
            suggestions.append("Try adjusting your loan tenure (e.g. 24, 36, 48, or 60 months) to find eligible offers.")

        return {
            "best_loan": None,
            "alternatives": [],
            "pros_and_cons": {
                "pros": ["No debt liability incurred."],
                "cons": ["Unable to obtain required funding for " + profile.get("loan_purpose", "loan") + " at this time."]
            },
            "risk_assessment": {
                "level": "High",
                "explanation": f"Profile poses high risk to lenders due to low CIBIL score ({score}) or elevated DTI ratio ({dti:.1f}%)."
            },
            "eligibility_factors": reasons,
            "improvement_suggestions": suggestions
        }

    # Extract primary recommendation
    best = matched_loans[0]
    
    # Extract alternatives
    alternatives = []
    for loan in matched_loans[1:4]:
        alternatives.append({
            "bank_name": loan["bank_name"],
            "interest_rate": loan["interest_rate"],
            "reason": f"Offers a competitive interest rate of {loan['interest_rate']}% with an EMI of {loan['emi']:.2f}. A great alternative if {best['bank_name']} processing is delayed."
        })
        
    # Analyze pros & cons
    pros = [
        f"Lowest interest rate ({best['interest_rate']}%) among all available matches.",
        f"Manageable EMI of {best['emi']:.2f} representing a reasonable DTI addition.",
        f"Offered by {best['bank_name']}, a reputable lender with stable approval probability ({best['approval_probability']})."
    ]
    cons = [
        f"Processing fee of {best['processing_fee_percent']}% will subtract {best['processing_fee_amount']:.2f} upfront.",
        f"Requires a commitment of {profile['preferred_loan_tenure_months']} months, costing a total interest of {best['total_interest']:.2f}."
    ]
    
    # Assess risk level
    dti = best["dti_with_loan"]
    if dti <= 35:
        risk_level = "Low"
        risk_exp = "DTI ratio remains well under the 40% safety margin. Highly affordable."
    elif dti <= 50:
        risk_level = "Medium"
        risk_exp = "DTI ratio is within manageable bounds (between 35% and 50%), but represents a significant portion of income. Spend carefully."
    else:
        risk_level = "High"
        risk_exp = "DTI ratio exceeds 50%. The monthly repayment poses high risk to overall monthly liquidity."
        
    # Compile suggestions
    suggestions = [
        "Check if you can make a down payment to reduce the required loan amount and secure better terms.",
        "Ensure credit utilization on credit cards is kept below 30% to boost your credit rating further."
    ]
    if dti > 45:
        suggestions.append("Try extending the loan tenure to reduce the EMI and lower your debt-to-income impact.")
        
    return {
        "best_loan": {
            "bank_name": best["bank_name"],
            "interest_rate": best["interest_rate"],
            "emi": best["emi"],
            "total_repayment": best["total_repayment"],
            "reason": f"Based on your profile, {best['bank_name']} offers the most cost-effective loan at {best['interest_rate']}% interest rate. The resulting monthly payment is highly competitive, and your credit score of {profile['credit_score']} puts you in a strong position for approval."
        },
        "alternatives": alternatives,
        "pros_and_cons": {
            "pros": pros,
            "cons": cons
        },
        "risk_assessment": {
            "level": risk_level,
            "explanation": risk_exp
        },
        "eligibility_factors": [
            f"Credit score of {profile['credit_score']} meets the lender's minimum threshold of {best.get('min_credit_score', 600)}.",
            f"Monthly income is sufficient to meet the minimum requirements of {best['bank_name']}."
        ],
        "improvement_suggestions": suggestions
    }

def generate_loan_recommendations(
    profile_dict: Dict[str, Any],
    matched_loans: List[Dict[str, Any]],
    all_loans: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Invoke Gemini API to generate personalized recommendations, falling back to mock details if unavailable."""
    if not settings.GEMINI_API_KEY:
        logger.info("Using mock recommendation system.")
        return get_mock_recommendation(profile_dict, matched_loans, all_loans)
        
    # format loans for prompt
    eligible_str = ""
    for idx, loan in enumerate(matched_loans[:5]):
        eligible_str += f"{idx+1}. {loan['bank_name']} | Rate: {loan['interest_rate']}% | EMI: {loan['emi']} | Repayment: {loan['total_repayment']} | Odds: {loan['approval_probability']}\n"
        
    all_str = ""
    for idx, loan in enumerate(all_loans):
        all_str += f"- {loan.bank_name} | Min Credit: {loan.min_credit_score} | Min Income: {loan.min_income_requirement} | Max Amount: {loan.max_loan_amount}\n"
        
    prompt = f"""
    You are an expert AI Financial Advisor. Analyze the customer profile below and their matched loan options. 
    Select the single absolute best loan, explain why, highlight alternative options, calculate risk, 
    detail eligibility factors, and suggest improvement options.

    CUSTOMER PROFILE:
    - Age: {profile_dict['age']}
    - Employment: {profile_dict['employment_type']}
    - Monthly Income: {profile_dict['monthly_income']}
    - Monthly Expenses: {profile_dict['monthly_expenses']}
    - Existing EMIs: {profile_dict['existing_emis']}
    - Credit Score: {profile_dict['credit_score']}
    - Loan Purpose: {profile_dict['loan_purpose']}
    - Required Loan Amount: {profile_dict['required_loan_amount']}
    - Preferred Tenure: {profile_dict['preferred_loan_tenure_months']} months

    MATCHED ELIGIBLE LOANS:
    {eligible_str if eligible_str else "No matched loans found."}

    ALL LOANS IN SYSTEM:
    {all_str}

    Return a JSON response adhering to this format:
    {{
      "best_loan": {{
        "bank_name": "Name of best bank",
        "interest_rate": 7.5,
        "emi": 1200.50,
        "total_repayment": 14400.00,
        "reason": "Detailed justification on why this is the best loan for the user's situation."
      }},
      "alternatives": [
        {{
          "bank_name": "Alternative Bank Name",
          "interest_rate": 8.0,
          "reason": "Short reason why this is a good secondary option."
        }}
      ],
      "pros_and_cons": {{
        "pros": ["Pro point 1", "Pro point 2"],
        "cons": ["Con point 1", "Con point 2"]
      }},
      "risk_assessment": {{
        "level": "Low | Medium | High",
        "explanation": "Clear explanation of risk and affordability metrics."
      }},
      "eligibility_factors": [
        "Key positive or negative factors influencing eligibility (e.g. credit score tier, DTI ratio)."
      ],
      "improvement_suggestions": [
        "Actionable advice on how they can improve credit health or loan terms."
      ]
    }}
    
    Ensure that you return ONLY the raw JSON object. Do not wrap the JSON output in markdown fences (e.g., do not use ```json ... ```).
    """
    
    try:
        import concurrent.futures

        def _call_gemini():
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(resp.text)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini)
            result_json = future.result(timeout=2.5)
            return result_json

    except Exception as e:
        logger.error(f"Gemini API timeout or exception: {str(e)}. Using fast mock engine.")
        return get_mock_recommendation(profile_dict, matched_loans, all_loans)

def get_mock_chat_response(profile_dict: Dict[str, Any], matched_loans: List[Dict[str, Any]], history: List[Dict[str, str]], question: str) -> str:
    """Generates a highly-relevant mock advisor response based on user profile and question keywords."""
    q_lower = question.lower()
    
    # Calculate DTI
    income = profile_dict.get("monthly_income", 1.0)
    expenses = profile_dict.get("monthly_expenses", 0.0)
    emis = profile_dict.get("existing_emis", 0.0)
    dti = ((expenses + emis) / income) * 100 if income > 0 else 0
    credit_score = profile_dict.get("credit_score", 300)
    loan_purpose = profile_dict.get("loan_purpose", "Home Loan")
    required_amount = profile_dict.get("required_loan_amount", 0.0)
    
    # Topic 1: What is CIBIL score / meaning
    if "cibil" in q_lower or "score" in q_lower or "credit score" in q_lower:
        msg = (
            f"A **CIBIL Score** is a 3-digit numeric summary of your credit history and credit profile, ranging from 300 to 900. "
            f"It is maintained by TransUnion CIBIL, India's leading credit bureau. Lenders check this to assess your credit risk.\n\n"
            f"Your current CIBIL Score is **{credit_score}**. Here is how CIBIL tiers work in India:\n"
            f"- **750+ (Excellent)**: High approval probability, eligible for lowest interest rates and processing fee waivers.\n"
            f"- **700-749 (Good)**: Clean profile, easy approval with normal bank interest rates.\n"
            f"- **650-699 (Fair)**: Moderate risk; some private banks and NBFCs will approve but with higher interest rates.\n"
            f"- **Below 650 (Poor/Low)**: High default risk; very difficult to secure prime bank loans.\n\n"
        )
        if credit_score >= 700:
            msg += "Since your score is healthy, you qualify for prime options. Keep up the good work by paying bills on time!"
        else:
            msg += "Since your score is below 700, focus on debt clearance, reducing card utilization, and avoiding multiple loan inquiries to boost your score."
        return msg
        
    # Topic 2: How to get loans (home, personal, etc.)
    elif "how to get" in q_lower or "get the loan" in q_lower or "how to apply" in q_lower or "eligibility criteria" in q_lower:
        return (
            "To qualify and successfully get a loan in India, you must satisfy these primary eligibility criteria:\n\n"
            "1. **Home Loans**: Requires a CIBIL score of **680+** (700+ preferred), a maximum DTI ratio of **45-50%**, stable employment history (2+ years), and clean property ownership documents. Banks finance up to 80-90% of property value.\n"
            "2. **Personal Loans**: Unsecured loans that depend heavily on your monthly income (minimum ₹20,000-30,000) and CIBIL score (650+). Rates are higher since there is no collateral.\n"
            "3. **Auto Loans**: Secured against the vehicle. Easier to get even with moderate CIBIL scores (600+), financing up to 90-100% of the ex-showroom price.\n"
            "4. **Business Loans**: Requires business vintage (usually 3+ years), profitable tax returns (ITR), and a healthy business credit score.\n\n"
            f"Your profile indicates a **{profile_dict['employment_type']}** status with monthly income of **₹{income:,.2f}** and required loan of **₹{required_amount:,.2f}** for **{loan_purpose}**."
        )

    # Topic 3: Bank interest rates comparison
    elif "interest rate" in q_lower or "bank rate" in q_lower or "rates" in q_lower or "charges" in q_lower:
        return (
            "Here is the list of active interest rates in our database for key Indian lenders:\n\n"
            "**🏠 Home Loans (Best to worst)**:\n"
            "- **Bank of Baroda**: 8.40% interest rate\n"
            "- **PNB**: 8.45% interest rate\n"
            "- **SBI**: 8.50% interest rate\n"
            "- **HDFC Bank**: 8.75% interest rate\n"
            "- **Kotak Mahindra**: 8.85% interest rate\n\n"
            "**💳 Personal Loans**:\n"
            "- **SBI**: 10.50% interest rate\n"
            "- **ICICI Bank**: 10.75% interest rate\n"
            "- **Kotak Mahindra**: 10.99% interest rate\n"
            "- **HDFC Bank**: 11.25% interest rate\n"
            "- **Axis Bank**: 11.49% interest rate\n"
            "- **Yes Bank**: 12.00% interest rate\n\n"
            "**🚗 Auto Loans**:\n"
            "- **ICICI Bank**: 8.75% | **Axis Bank**: 8.99% | **IDFC First**: 9.25%\n\n"
            "**🎓 Education Loans**:\n"
            "- **SBI**: 8.15% | **Bank of Baroda**: 8.25%\n\n"
            "**💼 Business Loans**:\n"
            "- **Yes Bank**: 14.50% interest rate"
        )

    # Topic 4: How to improve profile / score
    elif "improve" in q_lower or "increase" in q_lower or "better profile" in q_lower or "boost" in q_lower or "repair" in q_lower:
        return (
            f"With your current credit score of **{credit_score}** and DTI of **{dti:.1f}%**, here are the fastest actionable steps to improve your credit eligibility profile:\n\n"
            "1. **Never Miss a Due Date**: Late payments on credit card bills or existing EMIs are reported to CIBIL and drop your score instantly. Set up auto-debits.\n"
            "2. **Lower Credit Utilization Ratio (CUR)**: Keep credit card spend under **30%** of your total limit. If your limit is ₹1 Lakh, do not carry a balance of more than ₹30,000.\n"
            "3. **Reduce Debt-to-Income (DTI) Ratio**: Pay off smaller active consumer retail loans (like zero-cost EMIs on gadgets) to reduce your total monthly EMIs and free up disposable surplus.\n"
            "4. **Avoid Multiple Inquiries**: Every time you apply for a new loan, lenders perform a 'Hard Inquiry' on CIBIL, which temporarily lowers your score. Avoid applying to multiple banks simultaneously.\n"
            "5. **Maintain Credit Mix**: Having a healthy mix of secured loans (like car/home) and unsecured loans (like personal/credit card) shows you can manage different kinds of credit."
        )

    # Topic 5: Drawbacks / Risks / Disadvantages
    elif "drawback" in q_lower or "risk" in q_lower or "danger" in q_lower or "disadvantage" in q_lower or "con" in q_lower:
        return (
            "When borrowing from banks, you should be fully aware of these potential drawbacks and financial risks:\n\n"
            "1. **Debt Trap & DTI Strain**: If your Debt-to-Income (DTI) ratio exceeds 40-50%, you will have very little disposable surplus for emergencies, creating high monthly cash flow stress.\n"
            "2. **Foreclosure & Prepayment Fees**: If you want to pay off your loan early, some banks charge foreclosure fees (usually 2-4% of outstanding principal) which eats into your interest savings.\n"
            "3. **Collateral Repossession**: For secured loans (like Home and Auto), defaulting on payments gives the lender legal authority to seize and auction your home or vehicle to recover outstanding dues.\n"
            "4. **Impact of Processing Fees**: Upfront processing fees (0.5% to 2.5%) are deducted from the disbursed loan amount, meaning you receive less cash than the principal amount but pay interest on the full amount.\n"
            "5. **CIBIL Score Damage**: Even a single missed payment stays on your credit report for up to 7 years, impacting future credit approvals."
        )

    # Existing keyword mappings kept for compatibility
    elif "dti" in q_lower or "debt" in q_lower or "income" in q_lower or "ratio" in q_lower or "expense" in q_lower:
        msg = f"Your current Debt-to-Income (DTI) ratio is approximately **{dti:.1f}%** (based on monthly income of ₹{income:,.2f} and expenses/existing EMIs of ₹{expenses + emis:,.2f}). "
        if dti < 35:
            msg += "A DTI under 35% is **excellent** and indicates strong financial health. It means you have substantial disposable income, which makes you a very safe borrower for lenders."
        elif dti <= 50:
            msg += "Your DTI is in the **moderate** zone. Lenders will consider you, but adding a new high-EMI loan might stretch your monthly budget. Try to clear some existing EMIs or reduce expenses before taking on new debt."
        else:
            msg += "Your DTI is **high (above 50%)**. This is a major red flag for banks as it suggests most of your income goes towards expenses and debt. You should focus on reducing your monthly expenses or paying off smaller loans to bring this ratio down."
        return msg
        
    elif "refinance" in q_lower or "saving" in q_lower or "cheaper" in q_lower or "reduce" in q_lower:
        if matched_loans:
            best_loan = matched_loans[0]
            msg = f"Based on your profile, the best eligible rate we found is **{best_loan['interest_rate']}%** from **{best_loan['bank_name']}**. "
            msg += "If you have an existing loan with an interest rate higher than this, refinancing could save you thousands. "
            msg += f"For example, refinancing an outstanding loan from 11% to {best_loan['interest_rate']}% could reduce your monthly EMI and save significant interest over time."
        else:
            msg = "Refinancing allows you to replace an existing high-interest loan with a new one at a lower rate. Since there are currently no eligible loan matches for your profile, we recommend working on your credit score and DTI first to unlock lower rate options."
        return msg

    elif "emi" in q_lower or "tenure" in q_lower or "month" in q_lower:
        return f"For your requested loan amount of ₹{profile_dict.get('required_loan_amount', 0):,.2f}, a longer tenure will lower your monthly EMI but increase the total interest paid over the life of the loan. A shorter tenure does the opposite. If you can afford the higher EMI, a shorter tenure is always more cost-effective!"
        
    elif "hello" in q_lower or "hi" in q_lower or "hey" in q_lower or "greetings" in q_lower:
        return (
            "Hello! I am your AI Financial Advisor. I'm here to help you analyze your credit eligibility, "
            "evaluate matched loan offers, or optimize your monthly debt payments. How can I help you today?"
        )
        
    elif q_lower in ["ok", "okay", "thanks", "thank you", "fine", "got it"]:
        return (
            "You're welcome! Let me know if you want to explore credit score improvement, "
            "compare different EMIs, or see if refinancing makes sense for your situation."
        )
        
    elif "better" in q_lower or "take" in q_lower or "choose" in q_lower or "recommend" in q_lower or "should i" in q_lower:
        if matched_loans:
            best_loan = matched_loans[0]
            msg = f"Based on your profile, it is best to take the loan from **{best_loan['bank_name']}** because it offers the lowest interest rate of **{best_loan['interest_rate']}%** with a monthly EMI of **₹{best_loan['emi']:,.2f}**. "
            if dti <= 35:
                msg += f"Since your DTI ratio is **{dti:.1f}%** (which is well within the healthy range), taking this loan is financially viable for you."
            elif dti <= 50:
                msg += f"However, your DTI ratio will increase to **{best_loan['dti_with_loan']:.1f}%** after taking this loan. While this is within moderate limits, make sure the EMI fits comfortably in your budget."
            else:
                msg += f"However, your DTI ratio is already high (**{dti:.1f}%**). Taking this loan will push it to **{best_loan['dti_with_loan']:.1f}%**, which could strain your monthly cash flow. If possible, consider borrowing less or increasing tenure."
            return msg
        else:
            return (
                f"With a credit score of **{credit_score}** and a DTI of **{dti:.1f}%**, you currently do not meet the minimum criteria for our matched loan offers. "
                "Therefore, it is **not recommended** to take a loan right now. You should focus on improving your credit health first."
            )
            
    elif "how" in q_lower or "help" in q_lower:
        return (
            "I can assist you with:\n"
            "1. **Improving Credit Score**: Steps to boost your CIBIL rating.\n"
            "2. **Debt-to-Income (DTI) Analysis**: How your income covers your debt.\n"
            "3. **Refinancing**: Replacing existing high-rate loans with cheaper matched options.\n"
            "4. **Repayment Planning**: Simulating the effect of loan tenures and EMIs."
        )

    # Default fallback response if no keywords match (Answers any generic question with client financial status)
    return (
        f"I hear you. As your AI Advisor, I want to ensure you have the best information to make debt decisions. "
        f"Based on your profile, you have a credit score of **{credit_score}** and a DTI of **{dti:.1f}%**. "
        f"Could you elaborate further or ask specifically about interest rates, refinancing, DTI calculation, CIBIL scores, drawbacks of loans, or profile improvement?"
    )

def generate_chat_response(
    profile_dict: Dict[str, Any],
    matched_loans: List[Dict[str, Any]],
    history: List[Dict[str, str]],
    question: str
) -> str:
    """Generate financial advisor response using Gemini or fallback to mock responses."""
    if not settings.GEMINI_API_KEY:
        return get_mock_chat_response(profile_dict, matched_loans, history, question)
        
    # Format chat history for context
    history_str = ""
    for msg in history[-10:]:  # Keep last 10 messages for context size
        role_label = "Customer" if msg["role"] == "user" else "Advisor"
        history_str += f"{role_label}: {msg['content']}\n"
        
    # Format matched loans
    eligible_str = ""
    for idx, loan in enumerate(matched_loans[:3]):
        eligible_str += f"- {loan['bank_name']} | Rate: {loan['interest_rate']}% | EMI: {loan['emi']:.2f}\n"

    system_prompt = f"""
    You are LoanAgent AI, a premium, friendly, and highly professional AI Financial Advisor. 
    Your goal is to help the customer understand their eligibility, navigate the loan options, and give actionable financial advice.

    CUSTOMER FINANCIAL METRICS:
    - Age: {profile_dict['age']}
    - Employment Type: {profile_dict['employment_type']}
    - Monthly Income: {profile_dict['monthly_income']}
    - Monthly Expenses: {profile_dict['monthly_expenses']}
    - Existing EMIs: {profile_dict['existing_emis']}
    - Credit Score: {profile_dict['credit_score']}
    - Loan Purpose: {profile_dict['loan_purpose']}
    - Required Loan Amount: {profile_dict['required_loan_amount']}
    - Preferred Tenure: {profile_dict['preferred_loan_tenure_months']} months

    TOP MATCHED ELIGIBLE LOANS FOR THIS USER:
    {eligible_str if eligible_str else "No matched loans found."}

    ADVICE GUIDELINES:
    1. Be concise, precise, and encouraging.
    2. Focus on metrics like Debt-to-Income (DTI) ratio, credit health, and affordability.
    3. Use formatting (bolding, lists) to make recommendations readable.
    4. Provide specific advice, not just general templates.
    """
    
    full_prompt = f"{system_prompt}\n\nCHAT HISTORY:\n{history_str}\n\nCustomer's New Question: {question}\n\nAdvisor Response:"
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error in chat Gemini API call: {str(e)}")
        return get_mock_chat_response(profile_dict, matched_loans, history, question)

