"use client";

import React, { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";

import { CustomerProfile, AnalysisResponse, MatchedLoan } from "@/types";
import { 
  Calculator, 
  TrendingDown, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  PiggyBank
} from "lucide-react";

export default function RefinancingPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [currentPrincipal, setCurrentPrincipal] = useState<number | "">("");
  const [currentRate, setCurrentRate] = useState<number | "">("");
  const [remainingTenure, setRemainingTenure] = useState<number | "">("");
  const [foreclosureFeePercent, setForeclosureFeePercent] = useState<number>(2);
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileRes = await api.get<CustomerProfile>("/profile");
        setProfile(profileRes.data);
        
        const matchingRes = await api.post<AnalysisResponse>("/matching/analyze");
        setAnalysis(matchingRes.data);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err.response?.status === 404) {
          setProfile(null);
        } else {
          setError("Failed to fetch profile and matching offers.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Financial Profile Missing</h1>
          <p className="mt-3 text-slate-400 max-w-md leading-relaxed">
            Please fill in your Financial Profile intake form first. 
            The Refinancing Analyzer requires your profile details to fetch matched interest rates for comparison.
          </p>
        </div>
      </Shell>
    );
  }

  // Calculate current loan statistics
  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  };

  const currentEmi = currentPrincipal && currentRate && remainingTenure 
    ? calculateEMI(Number(currentPrincipal), Number(currentRate), Number(remainingTenure)) 
    : 0;

  const currentTotalPayout = currentEmi * Number(remainingTenure);

  // Map and calculate matched refinancing offers
  const getRefinanceOffers = () => {
    if (!analysis?.matched_loans || !currentPrincipal || !currentRate || !remainingTenure) return [];

    const P = Number(currentPrincipal);
    const N = Number(remainingTenure);
    
    // Total cost to close current loan: principal + foreclosure penalty
    const foreclosurePenalty = P * (foreclosureFeePercent / 100);
    const newPrincipalRequired = P + foreclosurePenalty;

    return analysis.matched_loans.map((loan: MatchedLoan) => {
      const newEmi = calculateEMI(newPrincipalRequired, loan.interest_rate, N);
      const processingFee = newPrincipalRequired * (loan.processing_fee_percent / 100);
      const newTotalPayout = (newEmi * N) + processingFee;
      
      const monthlySavings = currentEmi - newEmi;
      const totalSavings = currentTotalPayout - newTotalPayout;
      
      let recommendation = "Not Recommended";
      let badgeStyle = "text-red-400 border-red-900 bg-red-950/30";
      
      if (totalSavings > 30000) {
        recommendation = "Highly Recommended";
        badgeStyle = "text-emerald-400 border-emerald-900 bg-emerald-950/30";
      } else if (totalSavings > 0) {
        recommendation = "Moderate Savings";
        badgeStyle = "text-indigo-400 border-indigo-900 bg-indigo-950/30";
      }

      return {
        ...loan,
        newPrincipalRequired,
        newEmi,
        monthlySavings,
        totalSavings,
        processingFee,
        foreclosurePenalty,
        recommendation,
        badgeStyle
      };
    }).sort((a, b) => b.totalSavings - a.totalSavings);
  };

  const refinanceOffers = getRefinanceOffers();

  return (
    <Shell>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Smart Refinancing Analyzer</h1>
          <p className="mt-2 text-slate-400">
            Compare details of your existing liabilities to find lower interest rates and calculate potential EMI and total interest savings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 lg:col-span-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" /> Current Loan Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Outstanding Principal (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={currentPrincipal}
                  onChange={(e) => {
                    setCurrentPrincipal(e.target.value === "" ? "" : Number(e.target.value));
                    setCalculated(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Current Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12.5"
                  value={currentRate}
                  onChange={(e) => {
                    setCurrentRate(e.target.value === "" ? "" : Number(e.target.value));
                    setCalculated(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Remaining Tenure (Months)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 36"
                  value={remainingTenure}
                  onChange={(e) => {
                    setRemainingTenure(e.target.value === "" ? "" : Number(e.target.value));
                    setCalculated(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Foreclosure / Penalty Charges (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={foreclosureFeePercent}
                  onChange={(e) => {
                    setForeclosureFeePercent(Number(e.target.value));
                    setCalculated(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Fee bank charges to close the existing loan early. Added to new principal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCalculated(true)}
                disabled={!currentPrincipal || !currentRate || !remainingTenure}
                className="w-full flex items-center justify-center py-3 px-6 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Analyze Savings <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!calculated ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] border border-slate-800 rounded-2xl bg-slate-900/20 text-slate-500 p-8 text-center">
                <Calculator className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
                <h3 className="text-white font-bold text-base">Awaiting Calculation Details</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                  Enter your current outstanding loan balance, interest rate, and remaining months in the parameters sheet to calculate savings.
                </p>
              </div>
            ) : (
              <>
                {/* Current Loan Summary Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current EMI</span>
                    <p className="text-xl font-bold text-white mt-1">₹{currentEmi.toLocaleString(undefined, {maximumFractionDigits: 2})}/mo</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Payout</span>
                    <p className="text-xl font-bold text-white mt-1">₹{currentTotalPayout.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Months</span>
                    <p className="text-xl font-bold text-white mt-1">{remainingTenure} Months</p>
                  </div>
                </div>

                {/* Offer Results */}
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-teal-400" /> Refinancing Recommendations
                </h2>

                {refinanceOffers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                    <p className="text-sm text-slate-400">
                      No matching eligible rates found lower than your current rate. Keep checking as bank product listings update.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {refinanceOffers.map((offer: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                      const savingPositive = offer.totalSavings > 0;
                      return (
                        <div 
                          key={offer.product_id}
                          className={`p-6 rounded-2xl bg-slate-900/60 border transition-all ${
                            idx === 0 && savingPositive
                              ? "border-indigo-500 shadow-lg shadow-indigo-600/10" 
                              : "border-slate-800"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-white">{offer.bank_name}</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${offer.badgeStyle}`}>
                                  {offer.recommendation}
                                </span>
                                {idx === 0 && savingPositive && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/45 px-2 py-0.5 border border-indigo-900 rounded-full">
                                    <Sparkles className="w-3 h-3" /> Best Offer
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                New Rate: <strong className="text-white">{offer.interest_rate}%</strong> • Processing Fee: ₹{offer.processingFee.toLocaleString(undefined, {maximumFractionDigits: 0})}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Interest Savings</span>
                              <span className={`text-xl font-extrabold ${savingPositive ? "text-emerald-400" : "text-red-400"} flex items-center justify-end gap-1 mt-0.5`}>
                                {savingPositive ? <PiggyBank className="w-5 h-5" /> : null}
                                ₹{offer.totalSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-850 text-xs">
                            <div>
                              <span className="text-slate-500 block">New EMI:</span>
                              <strong className="text-white">₹{offer.newEmi.toLocaleString(undefined, {maximumFractionDigits: 2})}/mo</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Monthly Savings:</span>
                              <strong className={offer.monthlySavings > 0 ? "text-emerald-400" : "text-red-400"}>
                                ₹{offer.monthlySavings.toLocaleString(undefined, {maximumFractionDigits: 2})}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Foreclosure Penalty:</span>
                              <strong className="text-white">₹{offer.foreclosurePenalty.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Refinance Principal:</span>
                              <strong className="text-white">₹{offer.newPrincipalRequired.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
