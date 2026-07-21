"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { CustomerProfile } from "@/types";
import { 
  UserCircle2, 
  Wallet, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Search,
  CheckCircle,
  Lightbulb,
  CreditCard,
  Sparkles,
  Download
} from "lucide-react";

export default function ProfileIntakePage() {
  const { user, loading: authLoading } = useAuth();
  
  // Use 'any' type locally to allow empty strings during active input typing
  const [profile, setProfile] = useState<any>({
    full_name: "",
    age: 30,
    pan_number: "",
    employment_type: "Salaried",
    monthly_income: 5000,
    monthly_expenses: 1500,
    existing_emis: 0,
    credit_score: "",
    loan_purpose: "Personal",
    required_loan_amount: 20000,
    preferred_loan_tenure_months: 24,
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // CIBIL check states
  const [fetchingCibil, setFetchingCibil] = useState(false);
  const [cibilSuccess, setCibilSuccess] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadProfile = async () => {
      try {
        const response = await api.get<CustomerProfile>("/profile");
        if (response.data) {
          setProfile(response.data);
          if (response.data.credit_score) {
            setCibilSuccess(true);
          }
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          setError("Failed to load your existing profile details.");
        }
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, [authLoading, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = [
      "age", 
      "monthly_income", 
      "monthly_expenses", 
      "existing_emis", 
      "credit_score", 
      "required_loan_amount", 
      "preferred_loan_tenure_months"
    ];

    // If a numeric field is cleared, store it as an empty string instead of converting to 0
    setProfile((prev: any) => ({
      ...prev,
      [name]: numericFields.includes(name) 
        ? (value === "" ? "" : Number(value)) 
        : value
    }));
  };

  const fetchCibil = async () => {
    if (!profile.pan_number || profile.pan_number.length !== 10) return;
    setFetchingCibil(true);
    setError(null);
    setCibilSuccess(false);

    try {
      const res = await api.post("/profile/fetch-cibil-score", {
        pan_number: profile.pan_number.toUpperCase().trim()
      });
      setProfile((prev: any) => ({
        ...prev,
        credit_score: res.data.credit_score
      }));
      setCibilSuccess(true);
      setSuccess(false); // clear profile save message
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch CIBIL score. Please ensure PAN card number format is correct.");
    } finally {
      setFetchingCibil(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrSuccess(false);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/profile/ocr", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data.success) {
        const extracted = res.data.data;
        setProfile((prev: any) => ({
          ...prev,
          monthly_income: extracted.monthly_income,
          monthly_expenses: extracted.monthly_expenses,
          existing_emis: extracted.existing_emis,
          employment_type: extracted.employment_type
        }));
        setOcrSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "AI document extraction failed. Please enter details manually or try another document.");
    } finally {
      setOcrLoading(false);
    }
  };

  const getCreditScoreRating = (score: number) => {
    if (!score) return null;
    if (score >= 750) return { label: "Excellent", color: "text-emerald-400 border-emerald-900 bg-emerald-950/30" };
    if (score >= 700) return { label: "Good", color: "text-indigo-400 border-indigo-900 bg-indigo-950/30" };
    if (score >= 650) return { label: "Average", color: "text-amber-400 border-amber-900 bg-amber-950/30" };
    return { label: "Poor", color: "text-red-400 border-red-900 bg-red-950/30" };
  };

  const rating = getCreditScoreRating(Number(profile.credit_score));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    // Sanitize any empty string values to default numbers before API transmission
    const sanitizedProfile = {
      ...profile,
      pan_number: profile.pan_number ? profile.pan_number.toUpperCase().trim() : null,
      age: profile.age === "" ? 18 : Number(profile.age),
      monthly_income: profile.monthly_income === "" ? 0 : Number(profile.monthly_income),
      monthly_expenses: profile.monthly_expenses === "" ? 0 : Number(profile.monthly_expenses),
      existing_emis: profile.existing_emis === "" ? 0 : Number(profile.existing_emis),
      credit_score: profile.credit_score === "" ? 0 : Number(profile.credit_score),
      required_loan_amount: profile.required_loan_amount === "" ? 0 : Number(profile.required_loan_amount),
      preferred_loan_tenure_months: profile.preferred_loan_tenure_months === "" ? 12 : Number(profile.preferred_loan_tenure_months),
    };

    // Validations
    if (!sanitizedProfile.credit_score) {
      setError("Please fetch your CIBIL score using your PAN Number first.");
      setLoading(false);
      return;
    }
    if (sanitizedProfile.age < 18 || sanitizedProfile.age > 75) {
      setError("Age must be between 18 and 75 years.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/profile", sanitizedProfile);
      sessionStorage.removeItem("loan_analysis_cache");
      sessionStorage.removeItem("loan_profile_cache");
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred while saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Financial Profile Intake</h1>
          <p className="mt-2 text-slate-400">
            Configure your financial standing. Access secure bureau check integration using your PAN details to query CIBIL scores.
          </p>
        </div>

        {/* Notifications */}
        {success && (
          <div className="flex items-start gap-3 p-4 mb-8 rounded-xl bg-emerald-950/30 border border-emerald-800 text-emerald-300">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-sm text-white">Profile Saved Successfully!</p>
              <p className="text-xs text-slate-400 mt-0.5">Your parameters have been updated. You can now download your financial assessment report as a PDF or view your dashboard.</p>
              <div className="mt-3.5 flex flex-wrap gap-3">
                <Link
                  href="/recommend?print=true"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF Report
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 mb-8 rounded-xl bg-red-950/30 border border-red-800 text-red-300">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-sm text-white">Action Required</p>
              <p className="text-xs text-slate-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Intake Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* AI Intake Assistant - OCR Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-900/30 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> AI Document Intake Assistant
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Upload your salary slip or bank statement (PDF, PNG, JPG). Our AI will scan the document to extract your monthly income, expenses, liabilities, and employment type automatically.
            </p>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-full">
                <input
                  type="file"
                  id="ocr-file-upload"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleOcrUpload}
                  disabled={ocrLoading}
                />
                <label
                  htmlFor="ocr-file-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors min-h-[120px] ${
                    ocrLoading
                      ? "border-slate-800 bg-slate-950/20 cursor-not-allowed"
                      : "border-slate-800 hover:border-indigo-500 bg-slate-950 hover:bg-slate-900"
                  }`}
                >
                  {ocrLoading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                      <span className="text-xs font-semibold">AI is analyzing document details...</span>
                    </div>
                  ) : ocrSuccess ? (
                    <div className="flex flex-col items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                      <span className="text-xs font-semibold">Financial metrics extracted successfully!</span>
                      <span className="text-[10px] text-slate-400">Values filled: Income, Expenses, Liabilities</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Wallet className="w-8 h-8 text-indigo-400" />
                      <span className="text-xs font-semibold">Click to select document or drag & drop</span>
                      <span className="text-[10px] text-slate-500">Supports PDF, PNG, JPG (Max 5MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Section 1: Demographics & Employment */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <UserCircle2 className="w-5 h-5 text-indigo-400" /> Personal & Employment Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. John Doe"
                  value={profile.full_name || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Age (Years)
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min="18"
                  max="100"
                  value={profile.age ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Employment Type
                </label>
                <select
                  name="employment_type"
                  value={profile.employment_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="Salaried">Salaried Employee</option>
                  <option value="Self-Employed">Self-Employed Professional</option>
                  <option value="Business">Business Owner</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: CIBIL Score Verification */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-purple-400" /> CIBIL Score Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Option A: Auto-Retrieve via PAN Card
                </label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    name="pan_number"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={profile.pan_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm uppercase tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    onClick={fetchCibil}
                    disabled={fetchingCibil || !profile.pan_number || profile.pan_number.length !== 10}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {fetchingCibil ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Retrieve
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Retrieves your official score based on your PAN number.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Option B: Manual CIBIL Score Entry
                  </label>
                  {rating && (
                    <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${rating.color}`}>
                      {rating.label}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="credit_score"
                  min="300"
                  max="900"
                  placeholder="Enter score (300 - 900)"
                  value={profile.credit_score ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  Type your CIBIL score directly if you wish to skip auto-retrieval.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Standing */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Wallet className="w-5 h-5 text-teal-400" /> Income & Expenses (Monthly)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Monthly Income (₹)
                </label>
                <input
                  type="number"
                  name="monthly_income"
                  required
                  min="0"
                  value={profile.monthly_income ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  name="monthly_expenses"
                  required
                  min="0"
                  value={profile.monthly_expenses ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Existing EMIs / Liabilities (₹)
                </label>
                <input
                  type="number"
                  name="existing_emis"
                  required
                  min="0"
                  value={profile.existing_emis ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Loan Request & Purpose */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-indigo-400" /> Loan Requirements
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Loan Purpose
                </label>
                <select
                  name="loan_purpose"
                  value={profile.loan_purpose}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="Personal">Personal Loan</option>
                  <option value="Home">Home Loan</option>
                  <option value="Education">Education Loan</option>
                  <option value="Auto">Car Loan</option>
                  <option value="Business">Business Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Required Loan Amount (₹)
                </label>
                <input
                  type="number"
                  name="required_loan_amount"
                  required
                  min="0"
                  value={profile.required_loan_amount ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Preferred Tenure (Months)
                </label>
                <input
                  type="number"
                  name="preferred_loan_tenure_months"
                  required
                  min="1"
                  value={profile.preferred_loan_tenure_months ?? ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center py-3.5 px-8 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Profile...
                </>
              ) : (
                "Save Profile & Analyze"
              )}
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
