'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, formatFirebaseAuthError } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/browse';
  const urlError = searchParams.get('error');
  
  const { signup, loginWithGoogle, user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace(returnUrl);
    }
  }, [isAuthenticated, authLoading, user, router, returnUrl]);

  useEffect(() => {
    if (urlError === 'google_auth_failed' || urlError === 'google_auth_error') {
      setError('Google Sign-In failed or was cancelled. Please try again.');
    }
  }, [urlError]);

  const validatePassword = (pw: string) => {
    if (pw.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }

    setLoading(true);
    setError('');
    try {
      await signup(email.trim(), password, name.trim());
      toast.success('Account created! Welcome to V19Plus 🎉');
      router.push(returnUrl);
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google! 🚀');
      router.push(returnUrl);
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-[#FF5C00] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col bg-black select-none">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src="https://assets.nflxext.com/ffe/siteui/vlv3/a73c4363-1dcd-4719-b3b1-3725418fd91d/fe1147dd-78be-44aa-a0e5-2d2994305a13/IN-en-20231016-popsignuptwoweeks-perspective_alpha_website_large.jpg"
          alt="V19Plus background"
          className="w-full h-full object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
      </div>

      {/* Header */}
      <header className="px-8 sm:px-16 pt-6 pb-4">
        <Link href="/" aria-label="V19Plus home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#D44900] p-0.5 shadow-[0_0_20px_rgba(255,92,0,0.45)] group-hover:scale-105 transition-transform overflow-hidden">
            <img
              src="/logo-icon.png"
              alt="V19Plus Logo"
              className="w-full h-full object-cover rounded-[10px]"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-[#FF5C00] font-black text-3xl sm:text-4xl tracking-tight drop-shadow-lg">
            V19PLUS
          </span>
        </Link>
      </header>

      <div className="flex-1 flex justify-center items-center px-4 py-8">
        <div className="w-full max-w-[440px] bg-black/85 backdrop-blur-md rounded-2xl p-8 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/80">
          <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">Create Account</h1>
          <p className="text-white/40 text-sm mb-6">Join V19Plus and stream unlimited entertainment</p>

          {/* Error Banner */}
          {error && (
            <div className="bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-white p-3.5 rounded-lg text-sm mb-5 flex items-start gap-2.5 animate-fade-in">
              <svg className="w-4 h-4 text-[#FF5C00] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Name */}
            <div className="relative">
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setError(''); }}
                className="w-full bg-[#242424] hover:bg-[#2e2e2e] focus:bg-[#2e2e2e] text-white rounded-md px-4 pt-6 pb-2 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60 transition-all peer text-base border border-white/5"
                placeholder=" "
                autoComplete="name"
              />
              <label
                htmlFor="signup-name"
                className="absolute left-4 top-4 text-[#8c8c8c] text-base transition-all duration-150 peer-focus:text-xs peer-focus:top-1.5 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:top-1.5 pointer-events-none"
              >
                Your Name
              </label>
            </div>

            {/* Email */}
            <div className="relative">
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(''); }}
                className="w-full bg-[#242424] hover:bg-[#2e2e2e] focus:bg-[#2e2e2e] text-white rounded-md px-4 pt-6 pb-2 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60 transition-all peer text-base border border-white/5"
                placeholder=" "
                autoComplete="email"
              />
              <label
                htmlFor="signup-email"
                className="absolute left-4 top-4 text-[#8c8c8c] text-base transition-all duration-150 peer-focus:text-xs peer-focus:top-1.5 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:top-1.5 pointer-events-none"
              >
                Email address
              </label>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-[#242424] hover:bg-[#2e2e2e] focus:bg-[#2e2e2e] text-white rounded-md px-4 pt-6 pb-2 pr-12 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60 transition-all peer text-base border border-white/5"
                placeholder=" "
                autoComplete="new-password"
              />
              <label
                htmlFor="signup-password"
                className="absolute left-4 top-4 text-[#8c8c8c] text-base transition-all duration-150 peer-focus:text-xs peer-focus:top-1.5 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:top-1.5 pointer-events-none"
              >
                Password (min. 6 characters)
              </label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v: boolean) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c8c8c] hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="flex gap-1 -mt-2">
                {[1,2,3,4].map((lvl: number) => (
                  <div
                    key={lvl}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= lvl * 3
                        ? password.length >= 10 ? 'bg-green-500' : password.length >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              id="signup-submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#FF5C00] hover:bg-[#c11119] text-white rounded-md font-bold py-3.5 mt-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account…
                </>
              ) : 'Get Started'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3 text-[#737373] text-sm">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-widest">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            id="google-signup"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full bg-white hover:bg-gray-100 text-[#1f1f1f] rounded-md font-semibold py-3.5 flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
          >
            {googleLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting to Google…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-8 text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/login" className="text-white/80 hover:text-white hover:underline font-semibold transition-colors">
              Sign in.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
