'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { Play, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || d).join(', ');
  }
  if (error.message) return error.message;
  return 'Unable to create account. Please check your details.';
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const { signup, isAuthenticated, isLoading: authLoading, user } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace(returnUrl);
    }
  }, [isAuthenticated, authLoading, user, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signup(email.trim(), password, name.trim());
      toast.success('🎉 Account created! Welcome to V19Plus.');
      router.push(returnUrl);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast(`${provider} sign-in will be enabled with your production client key.`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070605] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#FF5C00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-[#070605] text-white selection:bg-[#FF5C00]/30 selection:text-white">
      {/* Cinematic Ambient Atmosphere Glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[500px] bg-gradient-to-b from-[#FF5C00]/15 via-[#FF5C00]/5 to-transparent blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#FF5C00]/5 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,92,0,0.03)_0,transparent_70%)]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 pt-6 pb-4">
        <Link href="/" aria-label="V19Plus home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#D94500] shadow-[0_0_25px_rgba(255,92,0,0.45)] group-hover:scale-105 transition-transform flex items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            V19<span className="text-[#FF5C00]">Plus</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white border border-white/10 hover:border-white/30 transition-all backdrop-blur-md bg-white/5 hover:bg-white/10 flex items-center gap-1.5"
        >
          <span>Sign In</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#FF5C00]" />
        </Link>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Card Frame */}
          <div className="relative rounded-3xl bg-[#120F0D]/95 border border-white/12 p-7 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_rgba(255,92,0,0.06)] backdrop-blur-2xl transition-all">
            {/* Top glowing orange brand pill */}
            <div className="w-12 h-1 bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] rounded-full mx-auto mb-6" />

            {/* Header Titles */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF8A00] text-[11px] font-bold tracking-wide uppercase mb-3">
                <Sparkles className="w-3 h-3" />
                <span>Unlimited Access</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Create Account
              </h1>
              <p className="text-xs sm:text-sm text-[#A8A095] mt-2">
                Join V19Plus to stream curated movies, original series, and masterclasses ad-free.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8478]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your name"
                    className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#787065] transition-all outline-none font-medium"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8478]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#787065] transition-all outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Password <span className="text-[11px] text-[#8C8478] font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8478]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Create a strong password"
                    className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-[#787065] transition-all outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C8478] hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms agreement note */}
              <p className="text-[11px] text-[#8C8478] leading-relaxed text-center pt-1">
                By creating an account, you agree to our{' '}
                <Link href="/legal/terms" className="text-[#B8B0A2] hover:text-white underline underline-offset-2">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-[#B8B0A2] hover:text-white underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF5C00] to-[#E04800] hover:from-[#FF6B1A] hover:to-[#EB5505] shadow-[0_4px_25px_rgba(255,92,0,0.35)] hover:shadow-[0_6px_30px_rgba(255,92,0,0.5)] transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#120F0D] px-3 text-xs text-[#8C8478] font-semibold uppercase tracking-wider">
                or register with
              </span>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="py-3 px-4 rounded-xl font-semibold text-xs text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.41 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.24C.45 8.17 0 9.95 0 12s.45 3.83 1.24 5.4l4.04-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.6l4.04 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                className="py-3 px-4 rounded-xl font-semibold text-xs text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.98-12.02-14.7-6.02-9.36-10.7-19.8-14.04-31.33-3.34-11.53-5.01-22.37-5.01-32.53 0-15.02 3.8-27.46 11.41-37.33 7.6-9.87 17.27-14.93 28.99-15.19 4.35 0 9.35 1.16 15.01 3.49 5.66 2.33 9.4 3.55 11.23 3.65 1.58-.1 5.37-1.32 11.37-3.65 6-2.33 11.09-3.38 15.28-3.17 11.37.53 20.73 4.64 28.09 12.35-9.87 6.01-14.69 14.35-14.46 25.01.21 8.24 3.36 15.19 9.46 20.85 6.1 5.66 13.41 8.87 21.93 9.63-1.9 5.66-4.13 11.41-6.69 17.25zM119.22 31.84c0-7.39 2.65-14.38 7.95-20.97 5.3-6.59 11.89-10.59 19.78-12.01.21 1.27.32 2.43.32 3.49 0 7.39-2.75 14.51-8.24 21.36-5.49 6.85-12.09 10.78-19.81 11.79z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Bottom Switch Link */}
            <p className="text-xs text-[#9E9689] text-center mt-7">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#FF8A00] hover:text-[#FFA333] font-bold underline-offset-4 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Strip */}
      <footer className="relative z-10 text-center py-6 px-4 text-xs text-[#70685E]">
        <p>© 2026 V19Plus Entertainment • Unlimited Entertainment on All Devices • Cancel Anytime</p>
      </footer>
    </div>
  );
}
