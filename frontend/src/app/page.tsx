"use client";

import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  BarChart, 
  ArrowRight,
  CreditCard
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />

      {/* Navbar Header */}
      <header className="relative z-10 flex h-20 items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            LoanAgent AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="flex items-center justify-center py-2.5 px-5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20 text-center flex flex-col items-center">
        {/* Banner Tag */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Powered by Gemini API
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Find Your Perfect Loan with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
            AI Precision
          </span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Input your financial credentials once. Get instant affordability analyses, 
          compare matched loan offerings from multiple lenders, and read customized recommendations powered by AI.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/register"
            className="flex items-center justify-center px-8 py-4 rounded-xl text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all duration-200"
          >
            Compare Loans Now <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center px-8 py-4 rounded-xl text-base font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 active:bg-slate-850 border border-slate-800 transition-all duration-200"
          >
            Access Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <div className="flex flex-col items-start p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Comprehensive Profile</h3>
            <p className="mt-2 text-sm text-slate-400 text-left leading-relaxed">
              Consolidate age, employment type, monthly expenses, existing EMIs, and credit score to form a single financial identity.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Match Filters</h3>
            <p className="mt-2 text-sm text-slate-400 text-left leading-relaxed">
              Automatically evaluate DTI ratios, verify minimum credit scores, check income criteria, and rank results based on affordability.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <BarChart className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Advice & Advice</h3>
            <p className="mt-2 text-sm text-slate-400 text-left leading-relaxed">
              Understand the pros, cons, and risk levels of each option. Learn how to increase your credit score and lower borrowing costs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
