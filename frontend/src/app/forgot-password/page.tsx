"use client";

import React, { useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import { Mail, ArrowLeft, Loader2, CheckCircle, ExternalLink, Copy } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setDebugLink(null);
    setCopied(false);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      setSuccess(true);
      if (response.data && response.data.debug_reset_link) {
        setDebugLink(response.data.debug_reset_link);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.detail || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (debugLink) {
      navigator.clipboard.writeText(debugLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-950 overflow-hidden">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      {/* Forgot Password Card */}
      <div className="relative w-full max-w-md p-8 mx-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl">
        {!success ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">Forgot Password</h1>
              <p className="mt-3 text-sm text-slate-400 text-center">
                Enter your email address and we&apos;ll simulate sending you a link to reset your password.
              </p>
            </div>

            {error && (
              <div className="p-3.5 mb-6 text-sm text-red-400 rounded-lg bg-red-950/30 border border-red-900/50">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success View with simulated local inbox link */
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
              <CheckCircle className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">Check Your Inbox</h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              If an account exists for <span className="font-semibold text-indigo-400">{email}</span>, a password reset link has been generated.
            </p>

            {debugLink && (
              <div className="w-full p-4 mb-6 rounded-xl bg-slate-950 border border-slate-800/80 text-left">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  Simulated Dev Link (Local Demo)
                </span>
                <p className="text-xs text-slate-400 break-all mb-4 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {debugLink}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <Link
                    href={debugLink}
                    className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Reset Password
                  </Link>
                </div>
              </div>
            )}
            
            {!debugLink && (
              <p className="text-xs text-slate-500 text-center italic mb-4">
                No active debug link was returned. Check terminal stdout output for generated tokens.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
