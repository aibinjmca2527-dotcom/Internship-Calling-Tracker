'use client';

import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { TEAM_MEMBERS } from '@/types';

function LoginContent() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both your name and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.message ||
            'Access denied. Enter your teammate name for both username and password (e.g., Aibin / Aibin).'
        );
        setIsLoading(false);
        return;
      }

      // Store local cache for offline/instant hydration
      localStorage.setItem('infopark_dev_member', data.member.displayName);
      localStorage.setItem('infopark_user_session', JSON.stringify(data.member));

      // Redirect to tracker
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      setErrorMessage('Network error during sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  // 1-Click Fast Login for any of the 5 students
  const handleQuickLogin = async (memberName: string) => {
    setIdentifier(memberName);
    setPassword(memberName);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: memberName, password: memberName }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('infopark_dev_member', data.member.displayName);
        localStorage.setItem('infopark_user_session', JSON.stringify(data.member));
        window.location.href = '/';
      } else {
        setErrorMessage('Could not sign in with this account.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Network error during quick sign-in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Infopark Internship Calling Tracker
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-600">
          Private internship outreach workspace &bull; Infopark Kochi Phase 1
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-5 sm:px-9 shadow-sm border border-slate-200 rounded-2xl">
          {/* Instructions Banner */}
          <div className="mb-5 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold text-blue-950 mb-0.5">Simple Teammate Sign In</p>
            <p className="text-blue-800">
              Both username and password are your name (e.g. <strong>Aibin</strong> / <strong>Aibin</strong>). No registration needed.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs font-semibold text-red-800 leading-snug">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Username / Name Input */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Teammate Name or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. Aibin, Milan, Edwin, Seba, Lakshmi"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-3.5 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password (Your Name)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your name as password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px] sm:min-h-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 sm:py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[46px] sm:min-h-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Access for the 5 students */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Or tap your name for 1-click access:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEAM_MEMBERS.map((member) => (
                <button
                  key={member}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(member)}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 rounded-xl border border-slate-200 transition-all min-h-[44px] cursor-pointer"
                >
                  <span>Sign in as <strong>{member}</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Infopark Kochi Phase 1 &bull; Saintgits MCA Outreach Team (Aibin, Milan, Edwin, Seba, Lakshmi)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
