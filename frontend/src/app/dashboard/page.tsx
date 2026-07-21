"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { CustomerProfile, AnalysisResponse } from "@/types";
import { 
  UserCircle2, 
  AlertTriangle,
  BadgeAlert,
  ArrowRight,
  TrendingDown,
  Scale,
  Percent,
  Sparkles,
  Layers,
  Loader2,
  Download
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchDashboardData = async () => {
      try {
        const cached = sessionStorage.getItem("loan_analysis_cache");
        const cachedProfile = sessionStorage.getItem("loan_profile_cache");

        if (cached && cachedProfile) {
          setAnalysis(JSON.parse(cached));
          setProfile(JSON.parse(cachedProfile));
          setLoading(false);
        }

        // 1. Fetch user financial profile
        const profileRes = await api.get<CustomerProfile>("/profile");
        setProfile(profileRes.data);
        sessionStorage.setItem("loan_profile_cache", JSON.stringify(profileRes.data));
        
        // 2. Fetch matched recommendation details
        const matchingRes = await api.post<AnalysisResponse>("/matching/analyze");
        setAnalysis(matchingRes.data);
        sessionStorage.setItem("loan_analysis_cache", JSON.stringify(matchingRes.data));
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Profile doesn't exist yet, we handle this state in UI
          setProfile(null);
        } else {
          setError(err.response?.data?.detail || "Failed to load dashboard overview.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [authLoading, user]);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </Shell>
    );
  }

  // State: Profile not created yet
  if (!profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto text-center py-16 flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 text-indigo-400 mb-6">
            <UserCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Financial Profile Missing</h1>
          <p className="mt-3 text-slate-400 max-w-md leading-relaxed">
            Please fill in your personal, employment, and financial details first. 
            This enables us to calculate your DTI ratios and run matching criteria against banks.
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

  const eligibility = analysis?.eligibility;
  const bestLoan = analysis?.ai_recommendation?.best_loan;
  const matchesCount = analysis?.matched_loans?.length || 0;

  // Define Badge style based on eligibility status
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "Eligible":
        return { bg: "bg-emerald-950/45 border-emerald-800 text-emerald-300", label: "Eligible" };
      case "Conditionally Eligible":
        return { bg: "bg-amber-950/45 border-amber-800 text-amber-300", label: "Conditionally Eligible" };
      default:
        return { bg: "bg-red-950/45 border-red-800 text-red-300", label: "Ineligible" };
    }
  };

  const statusStyle = eligibility ? getStatusDetails(eligibility.status) : { bg: "bg-slate-900 border-slate-800 text-slate-400", label: "Unknown" };

  return (
    <Shell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Financial Overview Dashboard</h1>
            <p className="mt-1 text-slate-400">Welcome back. Here is a snapshot of your loan approval eligibility.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/profile"
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center"
            >
              Edit Profile Parameters <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <Link
              href="/recommend?print=true"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF Report
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Top Summaries Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Credit Rating</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{profile.credit_score}</span>
              <span className="text-xs font-medium text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-900">
                {eligibility?.credit_rating || "N/A"}
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Approval Odds: <span className="text-white font-semibold">{eligibility?.approval_probability || "N/A"}</span></p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Surplus</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">₹{(profile.monthly_income - profile.monthly_expenses).toLocaleString()}</span>
              <span className="text-xs text-slate-400">/mo</span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Disposable Income: <span className="text-white font-semibold">₹{eligibility?.disposable_income ? eligibility.disposable_income.toLocaleString() : "0"}</span></p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Requested Loan</p>
            <div className="mt-3">
              <span className="text-3xl font-bold text-white">₹{profile.required_loan_amount.toLocaleString()}</span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Tenure Requested: <span className="text-white font-semibold">{profile.preferred_loan_tenure_months} months</span></p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Matched Offers</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{matchesCount}</span>
              <span className="text-xs font-medium text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900">
                Banks
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Filtered from database library</p>
          </div>
        </div>

        {/* Eligibility Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Status Badge Card */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">Eligibility Status Check</p>
              <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${statusStyle.bg}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                <span className="text-sm font-bold">{statusStyle.label}</span>
              </div>
              
              <div className="mt-6 space-y-3">
                {eligibility?.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-slate-300 leading-relaxed">{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex gap-4">
              <Link
                href="/compare"
                className="flex items-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Compare Offers <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
              <Link
                href="/recommend"
                className="flex items-center py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                AI Deep Dive
              </Link>
            </div>
          </div>

          {/* DTI Gauge Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between items-center text-center">
            <div className="w-full">
              <p className="text-sm font-semibold text-slate-400">Debt-to-Income (DTI) Ratio</p>
              <p className="text-xs text-slate-500 mt-1">Sum of existing EMIs + proposed EMI divided by gross monthly income.</p>
            </div>

            <div className="relative my-6 flex items-center justify-center">
              {/* Circular Gauge Placeholder */}
              <div className="w-32 h-32 rounded-full border-8 border-slate-850 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{eligibility?.dti_ratio || 0}%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">DTI Ratio</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Monthly EMIs:</span>
                <span className="font-semibold text-white">
                  ₹{((profile.existing_emis) + (eligibility?.proposed_emi || 0)).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Proposed EMI:</span>
                <span className="font-semibold text-indigo-400">
                  ₹{eligibility?.proposed_emi ? eligibility.proposed_emi.toLocaleString(undefined, {maximumFractionDigits: 2}) : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Highlight Banner (When Match Found) */}
        {bestLoan && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/30 border border-indigo-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl -mr-20 -mt-20" />
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400">Top Match Picked By AI</span>
                <h3 className="text-lg font-bold text-white">{bestLoan.bank_name} - {bestLoan.interest_rate}% Interest Rate</h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">{bestLoan.reason}</p>
                <div className="pt-2 flex gap-4 text-xs font-semibold text-slate-400">
                  <span>Est. EMI: <strong className="text-white">₹{bestLoan.emi.toLocaleString()}</strong></span>
                  <span>Total Repay: <strong className="text-white">₹{bestLoan.total_repayment.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ineligibility Banner (When No Matches Found) */}
        {matchesCount === 0 && (
          <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-900/50 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-amber-200">No Matching Loans Found for Current Profile</h3>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  Your metrics (CIBIL score: {profile.credit_score}, DTI ratio: {eligibility?.dti_ratio || 0}%) do not currently qualify for bank offers. Review the calculated factors below to improve your profile.
                </p>
              </div>
            </div>

            {analysis?.ai_recommendation?.eligibility_factors && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Factors Blocking Eligibility:</p>
                <div className="space-y-1.5">
                  {analysis.ai_recommendation.eligibility_factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-200/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex flex-wrap gap-3">
              <Link
                href="/recommend"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                View Full Profile Improvement Guide →
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Update Profile Financials
              </Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
