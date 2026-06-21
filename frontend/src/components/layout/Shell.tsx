"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  LayoutDashboard, 
  UserCircle, 
  BarChart3, 
  Sparkles, 
  LogOut, 
  Menu, 
  X,
  CreditCard,
  MessageSquare,
  TrendingDown,
  Sun,
  Moon
} from "lucide-react";

interface ShellProps {
  children: ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Financial Profile", href: "/profile", icon: UserCircle },
    { name: "Loan Comparison", href: "/compare", icon: BarChart3 },
    { name: "AI Recommendation", href: "/recommend", icon: Sparkles },
    { name: "AI Advisor Chat", href: "/advisor", icon: MessageSquare },
    { name: "Refinancing Analyzer", href: "/refinance", icon: TrendingDown },
    ...(user?.role === "admin" ? [{ name: "Admin Analytics", href: "/admin/analytics", icon: BarChart3 }] : [])
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 border-r border-slate-800">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-slate-800 gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-indigo-600 bg-clip-text text-transparent">
              LoanAgent AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-400 hover:bg-slate-850 hover:text-slate-100"
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${active ? "text-white" : "text-slate-500"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle Button */}
          <div className="px-4 py-2 border-t border-slate-800">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-850 hover:text-slate-100 transition-all duration-200 cursor-pointer"
            >
              <span className="flex items-center">
                {theme === "light" ? (
                  <>
                    <Moon className="mr-3 h-5 w-5 text-slate-500" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="mr-3 h-5 w-5 text-amber-500" />
                    Light Mode
                  </>
                )}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {theme}
              </span>
            </button>
          </div>

          {/* User Session Info & Logout */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-850">
              <div className="truncate max-w-[150px]">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-400 capitalize truncate">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/30 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 flex h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 md:hidden justify-between items-center px-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-100">LoanAgent AI</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-850 text-slate-400 hover:text-slate-100 cursor-pointer"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-850 text-slate-400 hover:text-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-20 flex bg-slate-950/60 backdrop-blur-sm">
            <div className="flex flex-col w-full max-w-xs p-6 bg-slate-900 border-r border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <span className="font-bold text-lg text-slate-100">LoanAgent AI</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-slate-850 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="flex-1 mt-6 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                        active ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-850 hover:text-slate-100"
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <div className="truncate">
                  <p className="text-sm font-semibold text-slate-100 truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-850 hover:bg-red-950/30 hover:text-red-400 text-slate-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
