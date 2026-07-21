"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { CustomerProfile, AnalysisResponse } from "@/types";
import { 
  Sparkles, 
  UserCircle2, 
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Loader2,
  Download
} from "lucide-react";

export default function RecommendPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchRecommendData = async () => {
      try {
        const cached = sessionStorage.getItem("loan_analysis_cache");
        const cachedProfile = sessionStorage.getItem("loan_profile_cache");

        if (cached && cachedProfile) {
          setAnalysis(JSON.parse(cached));
          setProfile(JSON.parse(cachedProfile));
          setLoading(false);
        }

        const profileRes = await api.get<CustomerProfile>("/profile");
        setProfile(profileRes.data);
        sessionStorage.setItem("loan_profile_cache", JSON.stringify(profileRes.data));

        const matchingRes = await api.post<AnalysisResponse>("/matching/analyze");
        setAnalysis(matchingRes.data);
        sessionStorage.setItem("loan_analysis_cache", JSON.stringify(matchingRes.data));
      } catch (err: any) {
        if (err.response?.status === 404) {
          setProfile(null);
        } else {
          setError(err.response?.data?.detail || "Failed to generate AI recommendations.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendData();
  }, [authLoading, user]);

  // Handle auto-printing when query parameter print=true is specified
  useEffect(() => {
    if (loading || !profile) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "true") {
      const timer = setTimeout(() => {
        window.print();
        // Clean the URL parameter so refresh doesn't trigger print dialog again
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 1000); // 1s buffer for layout stability and chart rendering

      return () => clearTimeout(timer);
    }
  }, [loading, profile]);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto text-center py-16 flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 text-indigo-400 mb-6">
            <UserCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Financial Profile Missing</h1>
          <p className="mt-3 text-slate-400 max-w-md">
            Please fill in your financial metrics first to generate AI loan matches and personalized breakdowns.
          </p>
          <Link
            href="/profile"
            className="mt-8 flex items-center justify-center py-3.5 px-8 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Create Financial Profile <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </Shell>
    );
  }

  const ai = analysis?.ai_recommendation;
  const best = ai?.best_loan;
  const alternatives = ai?.alternatives || [];
  const pros = ai?.pros_and_cons?.pros || [];
  const cons = ai?.pros_and_cons?.cons || [];
  const risk = ai?.risk_assessment;
  const factors = ai?.eligibility_factors || [];
  const suggestions = ai?.improvement_suggestions || [];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low":
        return "bg-emerald-950/40 border-emerald-900 text-emerald-400";
      case "Medium":
        return "bg-amber-950/40 border-amber-900 text-amber-400";
      default:
        return "bg-red-950/40 border-red-900 text-red-400";
    }
  };

  return (
    <Shell>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Print-only Header */}
        <div className="print-only hidden mb-8 pb-6 border-b border-slate-300">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Loan Assessment & Recommendation Report</h1>
              <p className="text-xs text-slate-500 mt-1">Generated by LoanAgent AI Matching System</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-600">LoanAgent AI</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-900/30 flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100">AI Personalized Loan Recommendations</h1>
              <p className="mt-1 text-slate-400">
                Interactive financial breakdown and explainability report generated by Gemini.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex-shrink-0"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>


        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!best ? (
          <div className="space-y-8">
            {/* Customer Profile Summary Header */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">{profile.full_name || user?.full_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CIBIL Score</span>
                <span className="text-sm font-bold text-amber-400 block mt-1">{profile.credit_score}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Income</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">₹{profile.monthly_income.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Requested Loan</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">₹{profile.required_loan_amount.toLocaleString()} ({profile.preferred_loan_tenure_months} mo)</span>
              </div>
            </div>

            {/* Ineligibility Warning Hero Banner */}
            <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-900/50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-900/40 text-amber-400 border border-amber-800/50 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-200">No Eligible Bank Products Matched Your Current Profile</h2>
                  <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                    Based on current bank criteria, your application was filtered out. Below are the exact calculated factors that blocked your eligibility, along with actionable steps to improve your profile and qualify.
                  </p>
                </div>
              </div>
            </div>

            {/* Specific Ineligibility Reasons */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <ThumbsDown className="w-4.5 h-4.5 text-red-400" /> Specific Reasons Why No Loans Were Matched
              </h3>
              <div className="space-y-3">
                {factors.map((factor, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-slate-950 border border-red-950/60 text-xs text-red-300 leading-relaxed flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Profile Improvement Guide */}
            {suggestions.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4.5 h-4.5 text-teal-400 animate-pulse" /> Profile Improvement Roadmap (How to Qualify)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-950 border border-teal-950/60 text-xs text-teal-300/90 leading-relaxed flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-teal-400 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI Advisor Call-To-Action */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Need Customized Financial Advice?</h3>
                <p className="text-xs text-slate-400 mt-1">Consult your personal AI Financial Advisor to discuss strategies for improving your CIBIL score or reducing monthly EMIs.</p>
              </div>
              <Link
                href="/advisor"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex-shrink-0"
              >
                Chat with AI Advisor →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Customer Profile Summary Header (Printed & Visual) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">{profile.full_name || user?.full_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CIBIL Score</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">{profile.credit_score}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Income</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">₹{profile.monthly_income.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Requested Loan</span>
                <span className="text-sm font-bold text-slate-100 block mt-1">₹{profile.required_loan_amount.toLocaleString()} ({profile.preferred_loan_tenure_months} mo)</span>
              </div>
            </div>

            {/* Best Loan Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 to-purple-950/30 border border-indigo-900/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Best Recommended Match
              </span>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{best.bank_name}</h2>
                  <p className="text-slate-400 text-sm mt-1">Loan Type: <span className="text-white font-medium">{profile.loan_purpose} Loan</span></p>
                </div>
                
                <div className="flex flex-wrap gap-6 text-sm bg-slate-900/60 border border-slate-850 p-4 rounded-xl backdrop-blur-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Interest Rate</p>
                    <p className="text-lg font-extrabold text-indigo-400">{best.interest_rate}%</p>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div>
                    <p className="text-slate-500 text-xs">Monthly EMI</p>
                    <p className="text-lg font-extrabold text-white">₹{best.emi.toLocaleString()}</p>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div>
                    <p className="text-slate-500 text-xs">Total Repayment</p>
                    <p className="text-lg font-extrabold text-white">₹{best.total_repayment.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800/80 pt-6">
                <p className="text-sm font-semibold text-slate-300">Justification Analysis:</p>
                <p className="text-sm text-slate-400 leading-relaxed mt-2">{best.reason}</p>
              </div>
            </div>

            {/* Pros and Cons Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-850">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-4.5 h-4.5 text-emerald-400" /> Key Benefits (Pros)
                </h3>
                <ul className="space-y-3">
                  {pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-350 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-850">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <ThumbsDown className="w-4.5 h-4.5 text-red-400" /> Drawbacks & Limits (Cons)
                </h3>
                <ul className="space-y-3">
                  {cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-350 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Risk Assessment & Factors Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Risk Gauge */}
              {risk && (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-850 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-4">Risk & Affordability</h3>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border ${getRiskColor(risk.level)}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{risk.level} Risk</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">{risk.explanation}</p>
                  </div>
                </div>
              )}

              {/* Eligibility Factors */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-850">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" /> Core Qualification Factors
                </h3>
                <div className="space-y-3">
                  {factors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2.5 text-xs text-slate-350 leading-relaxed">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Improvement Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-850">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4.5 h-4.5 text-teal-400 animate-pulse" /> Action Steps to Lower Borrowing Costs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Loan Matches list */}
            {alternatives.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-850">
                <h3 className="text-sm font-bold text-white mb-4">Top Loan Alternatives</h3>
                <div className="divide-y divide-slate-800/60">
                  {alternatives.map((alt, index) => (
                    <div key={index} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">{alt.bank_name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{alt.reason}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Interest Rate:</span>
                        <span className="text-sm font-bold text-indigo-400">{alt.interest_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
