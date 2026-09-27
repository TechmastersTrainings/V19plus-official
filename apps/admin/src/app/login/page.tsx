'use client';

import { useState, useId, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { FirebaseSignInButton } from '../../components/auth/FirebaseSignInButton';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <motion.p
      className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </motion.p>
  );
}

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
}

export default function Login() {
  const { adminLogin, isAuthenticated } = useAdminAuthStore();
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const errors = validate(email, password);

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const validationErrors = validate(email, password);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Welcome back, admin!');
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Login failed. Check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f0f] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/3 blur-[100px] rounded-full" />
      </div>

      <motion.div
        className="w-full max-w-sm relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3" aria-label="Go to homepage">
            <img src="/logo.png" alt="V19Plus" className="w-16 h-16 rounded-2xl shadow-xl shadow-[#FF5C00]/20 object-contain mx-auto" />
            <span className="text-4xl font-black tracking-tight text-white">
              V19Plus
            </span>
          </Link>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Admin
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed">
            Sign in to manage content, users, and settings.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor={emailId} className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: validate(e.target.value, password).email,
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder="admin@example.com"
                  aria-invalid={!!(touched.email && fieldErrors.email)}
                  className={`w-full px-4 py-3 bg-[#0f0f0f] border rounded-xl text-white placeholder:text-gray-600 text-sm transition-all duration-200 outline-none
                    focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60
                    ${touched.email && fieldErrors.email
                      ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500/60'
                      : 'border-[#333] hover:border-[#444]'
                    }`}
                />
                {/* Valid indicator */}
                {touched.email && !fieldErrors.email && email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
              <AnimatePresence>
                {touched.email && fieldErrors.email && (
                  <div id={`${emailId}-error`}>
                    <FieldError message={fieldErrors.email} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <label htmlFor={passwordId} className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: validate(email, e.target.value).password,
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  aria-invalid={!!(touched.password && fieldErrors.password)}
                  className={`w-full px-4 py-3 pr-12 bg-[#0f0f0f] border rounded-xl text-white placeholder:text-gray-600 text-sm transition-all duration-200 outline-none
                    focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60
                    ${touched.password && fieldErrors.password
                      ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500/60'
                      : 'border-[#333] hover:border-[#444]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-0.5 rounded"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <AnimatePresence>
                {touched.password && fieldErrors.password && (
                  <div id={`${passwordId}-error`}>
                    <FieldError message={fieldErrors.password} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm mt-2 shadow-lg shadow-red-600/20 hover:shadow-red-600/30"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                  </svg>
                  Sign in to Admin Panel
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-2xs text-gray-500 font-semibold uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Firebase SignIn */}
          <FirebaseSignInButton />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to app
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
