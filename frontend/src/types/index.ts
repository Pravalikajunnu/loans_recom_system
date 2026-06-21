export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "customer" | "admin";
  created_at: string;
}

export interface CustomerProfile {
  full_name?: string;
  age: number;
  pan_number?: string;
  employment_type: string;
  monthly_income: number;
  monthly_expenses: number;
  existing_emis: number;
  credit_score: number;
  loan_purpose: string;
  required_loan_amount: number;
  preferred_loan_tenure_months: number;
}

export interface EligibilityReport {
  status: "Eligible" | "Conditionally Eligible" | "Ineligible";
  proposed_emi: number;
  dti_ratio: number;
  disposable_income: number;
  affordability_ratio: number;
  credit_rating: string;
  approval_probability: string;
  income_stability: string;
  reasons: string[];
}

export interface MatchedLoan {
  product_id: number;
  bank_name: string;
  loan_type: string;
  interest_rate: number;
  processing_fee_percent: number;
  processing_fee_amount: number;
  emi: number;
  total_repayment: number;
  total_interest: number;
  dti_with_loan: number;
  approval_probability: string;
}

export interface BestLoan {
  bank_name: string;
  interest_rate: number;
  emi: number;
  total_repayment: number;
  reason: string;
}

export interface AlternativeLoan {
  bank_name: string;
  interest_rate: number;
  reason: string;
}

export interface AIRecommendation {
  best_loan: BestLoan | null;
  alternatives: AlternativeLoan[];
  pros_and_cons: {
    pros: string[];
    cons: string[];
  };
  risk_assessment: {
    level: "Low" | "Medium" | "High";
    explanation: string;
  };
  eligibility_factors: string[];
  improvement_suggestions: string[];
}

export interface AnalysisResponse {
  id: number;
  eligibility: EligibilityReport;
  matched_loans: MatchedLoan[];
  ai_recommendation: AIRecommendation;
  created_at: string;
}

export interface RecommendationHistoryEntry {
  id: number;
  user_id: number;
  profile_snapshot: CustomerProfile;
  matched_loans: MatchedLoan[];
  ai_response: AIRecommendation;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  ip_address: string | null;
  details: Record<string, any> | null;
  created_at: string;
}
