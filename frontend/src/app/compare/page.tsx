"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { CustomerProfile, AnalysisResponse, MatchedLoan } from "@/types";
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  UserCircle2, 
  ArrowRight,
  TrendingDown,
  Info,
  Scale,
  Sparkles,
  BarChart3,
  Loader2,
  Calendar,
  Download,
  X
} from "lucide-react";

export default function ComparePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeAmortizationLoan, setActiveAmortizationLoan] = useState<MatchedLoan | null>(null);

  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  };

  const generateAmortizationSchedule = (principal: number, interestRate: number, tenureMonths: number) => {
    const monthlyRate = interestRate / 12 / 100;
    const emi = calculateEMI(principal, interestRate, tenureMonths);
    
    let balance = principal;
    const schedule = [];
    
    for (let month = 1; month <= tenureMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      const remainingBalance = Math.max(0, balance - principalPayment);
      
      schedule.push({
        month,
        beginningBalance: balance,
        emi,
        interestPayment,
        principalPayment,
        remainingBalance
      });
      
      balance = remainingBalance;
    }
    
    return schedule;
  };

  const downloadCsv = (loanName: string, schedule: any[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Beginning Balance,EMI,Interest Paid,Principal Paid,Remaining Balance\n";
    
    schedule.forEach((row) => {
      csvContent += `${row.month},${row.beginningBalance.toFixed(2)},${row.emi.toFixed(2)},${row.interestPayment.toFixed(2)},${row.principalPayment.toFixed(2)},${row.remainingBalance.toFixed(2)}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${loanName.replace(/\s+/g, "_")}_Amortization_Schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Set mounted on client to prevent SSR issues with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchCompareData = async () => {
      try {
        const profileRes = await api.get<CustomerProfile>("/profile");
        setProfile(profileRes.data);
        
        const matchingRes = await api.post<AnalysisResponse>("/matching/analyze");
        setAnalysis(matchingRes.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setProfile(null);
        } else {
          setError(err.response?.data?.detail || "Failed to load matching offers.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompareData();
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

  if (!profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto text-center py-16 flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 text-indigo-400 mb-6">
            <UserCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Financial Profile Missing</h1>
          <p className="mt-3 text-slate-400 max-w-md">
            Please fill in your financial metrics first to run matching models and generate comparisons.
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

  const loans: MatchedLoan[] = analysis?.matched_loans || [];

  // Setup Recharts Data Source
  const chartData = loans.map(loan => ({
    name: loan.bank_name,
    "Monthly EMI": Math.round(loan.emi),
    "Principal Amount": Math.round(profile.required_loan_amount),
    "Interest Cost": Math.round(loan.total_interest),
  }));

  const getProbabilityBadge = (prob: string) => {
    switch (prob) {
      case "High":
        return <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">High</span>;
      case "Medium-High":
        return <span className="px-2 py-1 rounded text-xs font-semibold bg-cyan-950/60 border border-cyan-800 text-cyan-400">Medium-High</span>;
      case "Medium":
        return <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-950/60 border border-amber-800 text-amber-400">Medium</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-950/60 border border-red-800 text-red-400">Low</span>;
    }
  };

  return (
    <Shell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white">Compare Matching Loan Products</h1>
          <p className="mt-1 text-slate-400">
            Below are the loan products matching your criteria, ranked by interest rates and DTI affordability.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
            <Info className="w-10 h-10 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No Matching Loans Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Your financial metrics (such as credit score or monthly income) did not meet the minimum requirements of any products. Try boosting your credit score or selecting a lower loan amount.
            </p>
          </div>
        ) : (
          <>
            {/* Charts Section */}
            {mounted && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* EMI Chart */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-6">
                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Monthly EMI Scale (₹)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }} />
                        <Bar dataKey="Monthly EMI" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Principal vs Interest Cost Stacked Chart */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-6">
                    <Scale className="w-4 h-4 text-teal-400" /> Repayment Cost Breakdown (₹)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Principal Amount" stackId="a" fill="#14b8a6" />
                        <Bar dataKey="Interest Cost" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Table */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              <h3 className="text-base font-bold text-white mb-6">Eligible Loan Product Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-4 px-4 font-semibold">Bank Name</th>
                      <th className="py-4 px-4 font-semibold">Interest Rate</th>
                      <th className="py-4 px-4 font-semibold">Processing Fee</th>
                      <th className="py-4 px-4 font-semibold">Estimated EMI</th>
                      <th className="py-4 px-4 font-semibold">Interest Cost</th>
                      <th className="py-4 px-4 font-semibold">Total Repayment</th>
                      <th className="py-4 px-4 font-semibold">Approval Odds</th>
                      <th className="py-4 px-4 font-semibold">Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/65 text-slate-300">
                    {loans.map((loan) => (
                      <tr key={loan.product_id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">{loan.bank_name}</td>
                        <td className="py-4 px-4 text-indigo-400 font-semibold">{loan.interest_rate}%</td>
                        <td className="py-4 px-4">
                          {loan.processing_fee_percent}% <span className="text-slate-500 text-xs">(₹{loan.processing_fee_amount})</span>
                        </td>
                        <td className="py-4 px-4 text-white font-semibold">₹{loan.emi.toLocaleString()}</td>
                        <td className="py-4 px-4 text-purple-400 font-semibold">₹{loan.total_interest.toLocaleString()}</td>
                        <td className="py-4 px-4 text-white font-bold">₹{loan.total_repayment.toLocaleString()}</td>
                        <td className="py-4 px-4">{getProbabilityBadge(loan.approval_probability)}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setActiveAmortizationLoan(loan)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Schedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amortization Modal */}
            {activeAmortizationLoan && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl">
                  <button
                    onClick={() => setActiveAmortizationLoan(null)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" /> {activeAmortizationLoan.bank_name} - Amortization Schedule
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Month-by-month payment breakdown for loan principal of ₹{profile.required_loan_amount.toLocaleString()} at {activeAmortizationLoan.interest_rate}% interest rate.
                    </p>
                  </div>

                  {/* Modal Content - Chart & Table */}
                  <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                    {/* Repayment Chart */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-850">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Balance Breakdown Over Time</h4>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={generateAmortizationSchedule(profile.required_loan_amount, activeAmortizationLoan.interest_rate, profile.preferred_loan_tenure_months)}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                          >
                            <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
                            <Area type="monotone" dataKey="remainingBalance" name="Outstanding Balance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-850 overflow-hidden">
                      <div className="overflow-x-auto max-h-[30vh]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0">
                            <tr className="border-b border-slate-850">
                              <th className="p-3">Month</th>
                              <th className="p-3">Beginning Bal</th>
                              <th className="p-3">EMI</th>
                              <th className="p-3 text-red-400">Interest Component</th>
                              <th className="p-3 text-emerald-400">Principal Component</th>
                              <th className="p-3">Remaining Bal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300 bg-slate-900/50">
                            {generateAmortizationSchedule(profile.required_loan_amount, activeAmortizationLoan.interest_rate, profile.preferred_loan_tenure_months).map((row) => (
                              <tr key={row.month} className="hover:bg-slate-850/30 transition-colors">
                                <td className="p-3 font-semibold text-white">Month {row.month}</td>
                                <td className="p-3">₹{row.beginningBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-3 font-semibold text-white">₹{row.emi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-3 text-red-300">₹{row.interestPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-3 text-emerald-300">₹{row.principalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-3">₹{row.remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button
                      onClick={() => downloadCsv(activeAmortizationLoan.bank_name, generateAmortizationSchedule(profile.required_loan_amount, activeAmortizationLoan.interest_rate, profile.preferred_loan_tenure_months))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <button
                      onClick={() => setActiveAmortizationLoan(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
