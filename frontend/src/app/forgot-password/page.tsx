"use client";

import React, { useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import { Mail, ArrowLeft, Loader2, CheckCircle, ShieldCheck, Lock, Copy, KeyRound, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"REQUEST_OTP" | "VERIFY_OTP" | "SUCCESS">("REQUEST_OTP");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      if (response.data && response.data.otp_code) {
        setGeneratedOtp(response.data.otp_code);
        setOtpCode(response.data.otp_code); // Pre-fill for ease of testing
      }
      setStep("VERIFY_OTP");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.detail || "Could not generate OTP. Please verify your email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", {
        email,
        otp_code: otpCode,
        password: newPassword,
      });
      setStep("SUCCESS");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.detail || "Failed to reset password. Please check the OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyOtpToClipboard = () => {
    if (generatedOtp) {
      navigator.clipboard.writeText(generatedOtp);
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
        {step === "REQUEST_OTP" && (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">Reset Password</h1>
              <p className="mt-3 text-sm text-slate-400 text-center">
                Enter your registered email address to receive a 6-digit OTP verification code.
              </p>
            </div>

            {error && (
              <div className="p-3.5 mb-6 text-sm text-red-400 rounded-lg bg-red-950/30 border border-red-900/50">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRequestOtp} className="space-y-5">
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
                  <>
                    Send 6-Digit OTP <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === "VERIFY_OTP" && (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">Verify OTP & Reset</h1>
              <p className="mt-2 text-xs text-slate-400 text-center">
                OTP sent to <span className="font-semibold text-indigo-400">{email}</span>
              </p>
            </div>

            {/* Generated OTP Callout Banner for real-time testing */}
            {generatedOtp && (
              <div className="w-full p-4 mb-6 rounded-xl bg-slate-950 border border-indigo-900/60 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Real-time OTP Code Generated
                </span>
                <div className="flex items-center justify-center space-x-3 my-2">
                  <span className="text-2xl font-mono font-extrabold tracking-widest text-teal-400 bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-800">
                    {generatedOtp}
                  </span>
                  <button
                    onClick={copyOtpToClipboard}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy OTP"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && <span className="text-[11px] text-teal-400">Copied to clipboard!</span>}
              </div>
            )}

            {error && (
              <div className="p-3.5 mb-6 text-sm text-red-400 rounded-lg bg-red-950/30 border border-red-900/50">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-mono tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/30 hover:shadow-teal-500/40 transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  "Confirm & Reset Password"
                )}
              </button>
            </form>
          </>
        )}

        {step === "SUCCESS" && (
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
              <CheckCircle className="w-6 h-6 animate-bounce" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">Password Reset Completed</h1>
            <p className="text-sm text-slate-400 mb-6">
              Your account password has been updated successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 text-center"
            >
              Sign In to Your Account
            </Link>
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
