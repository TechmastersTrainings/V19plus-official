'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { Play } from 'lucide-react';

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
      setError('Please fill in all fields.');
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
    <div className="min-h-screen relative flex flex-col justify-between bg-[#070605] text-white select-none overflow-x-hidden">
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#070605] via-[#070605]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070605] via-[#070605]/60 to-[#070605]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#FF5C00]/15 to-transparent blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 pt-6 pb-4">
        <Link href="/" aria-label="V19Plus home" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] shadow-[0_0_20px_rgba(255,92,0,0.5)] group-hover:scale-105 transition-transform flex items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            V19<span className="text-[#FF5C00]">Plus</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white border border-white/10 hover:border-white/30 transition-all backdrop-blur-md bg-white/5"
        >
          Sign In
        </Link>
      </header>

      {/* Main Registration Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="auth-wrapper">
          <div className="form-container">
            <p className="title">Create an account</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>{error}</span>
              </div>
            )}

            <form className="form" onSubmit={handleSubmit} autoComplete="off">
              <input
                type="text"
                className="input"
                placeholder="Full Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                required
                autoComplete="off"
              />
              <input
                type="email"
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                autoComplete="off"
              />
              <input
                type="password"
                className="input"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="form-btn"
              >
                {isSubmitting ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <p className="sign-up-label">
              Already have an account?
              <Link href="/login" className="sign-up-link">
                Log in
              </Link>
            </p>

            <div className="buttons-container">
              <div
                className="apple-login-button"
                onClick={() => handleSocialLogin('Apple')}
              >
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth={0}
                  className="apple-icon"
                  viewBox="0 0 1024 1024"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M747.4 535.7c-.4-68.2 30.5-119.6 92.9-157.5-34.9-50-87.7-77.5-157.3-82.8-65.9-5.2-138 38.4-164.4 38.4-27.9 0-91.7-36.6-141.9-36.6C273.1 298.8 163 379.8 163 544.6c0 48.7 8.9 99 26.7 150.8 23.8 68.2 109.6 235.3 199.1 232.6 46.8-1.1 79.9-33.2 140.8-33.2 59.1 0 89.7 33.2 141.9 33.2 90.3-1.3 167.9-153.2 190.5-221.6-121.1-57.1-114.6-167.2-114.6-170.7zm-105.1-305c50.7-60.2 46.1-115 44.6-134.7-44.8 2.6-96.6 30.5-126.1 64.8-32.5 36.8-51.6 82.3-47.5 133.6 48.4 3.7 92.6-21.2 129-63.7z" />
                </svg>
                <span>Sign up with Apple</span>
              </div>

              <div
                className="google-login-button"
                onClick={() => handleSocialLogin('Google')}
              >
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth={0}
                  version="1.1"
                  x="0px"
                  y="0px"
                  className="google-icon"
                  viewBox="0 0 48 48"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                <span>Sign up with Google</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Strip */}
      <footer className="relative z-10 text-center py-6 px-4 text-xs text-gray-500">
        <p>© 2026 V19Plus OTT Platform. All rights reserved. 4K Ultra HD & Dolby Atmos streaming.</p>
      </footer>
    </div>
  );
}
