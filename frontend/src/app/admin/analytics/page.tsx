"use client";

import React, { useState, useEffect } from "react";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  UserCheck, 
  History, 
  ShieldAlert,
  Loader2,
  TrendingUp,
  Percent,
  Banknote,
  Activity
} from "lucide-react";
import { 
  BarChart as ReBarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend
} from "recharts";

interface AnalyticsSummary {
  total_users: number;
  total_profiles: number;
  total_recommendations: number;
  average_credit_score: number;
  average_monthly_income: number;
  average_requested_loan: number;
}

interface DistributionItem {
  name: string;
  value: number;
}

interface AnalyticsDistributions {
  loan_purpose_distribution: DistributionItem[];
  employment_type_distribution: DistributionItem[];
  bank_recommendations_distribution: DistributionItem[];
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [distributions, setDistributions] = useState<AnalyticsDistributions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    
    // Check role
    if (user.role !== "admin") {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const summaryRes = await api.get<AnalyticsSummary>("/admin/analytics/summary");
        setSummary(summaryRes.data);
        
        const distRes = await api.get<AnalyticsDistributions>("/admin/analytics/distributions");
        setDistributions(distRes.data);
      } catch (err: any) {
        setError("Failed to retrieve platform analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [authLoading, user]);

  const COLORS = ["#6366f1", "#14b8a6", "#a855f7", "#f59e0b", "#ec4899", "#3b82f6"];

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </Shell>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16 flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-950/40 rounded-2xl border border-red-900/50 text-red-400 mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-3 text-slate-400 max-w-sm leading-relaxed">
            You do not have the required administrative privileges to view platform metrics and user analytics.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white">Platform Analytics Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Monitor registered users, profile completeness, match frequencies, and aggregated credit metrics in real-time.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Users</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">{summary.total_users}</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Completed Profiles</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">{summary.total_profiles}</span>
                <UserCheck className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Recommendations</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">{summary.total_recommendations}</span>
                <History className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Credit Score</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">{summary.average_credit_score}</span>
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Monthly Income</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">${summary.average_monthly_income.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <Banknote className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Requested Loan</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white">${summary.average_requested_loan.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Charts Panel */}
        {mounted && distributions && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bank Match Popularity Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-6">Bank Recommendations Frequency</h3>
              <div className="h-64">
                {distributions.bank_recommendations_distribution.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    No recommendations logged yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={distributions.bank_recommendations_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                      <Bar dataKey="value" name="Recommendations Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Demographics / Loan Purpose Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-6">Loan Purpose Distribution</h3>
              <div className="h-64 flex flex-col md:flex-row items-center justify-center">
                {distributions.loan_purpose_distribution.length === 0 ? (
                  <div className="text-slate-500 text-xs">
                    No profile metrics captured yet.
                  </div>
                ) : (
                  <>
                    <div className="w-full md:w-2/3 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributions.loan_purpose_distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {distributions.loan_purpose_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/3 flex flex-col gap-2 font-sans text-xs">
                      {distributions.loan_purpose_distribution.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-slate-350">{entry.name}:</span>
                          <strong className="text-white ml-auto">{entry.value} ({Math.round(entry.value / summary!.total_profiles * 100)}%)</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Employment Type Distribution */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 lg:col-span-2">
              <h3 className="text-base font-bold text-white mb-6">Employment Type Distribution</h3>
              <div className="h-64 flex flex-col md:flex-row items-center justify-center max-w-2xl mx-auto">
                {distributions.employment_type_distribution.length === 0 ? (
                  <div className="text-slate-500 text-xs">
                    No employment data captured yet.
                  </div>
                ) : (
                  <>
                    <div className="w-full md:w-2/3 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributions.employment_type_distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {distributions.employment_type_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/3 flex flex-col gap-2.5 font-sans text-xs">
                      {distributions.employment_type_distribution.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                          <span className="text-slate-350">{entry.name}:</span>
                          <strong className="text-white ml-auto">{entry.value} ({Math.round(entry.value / summary!.total_profiles * 100)}%)</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
