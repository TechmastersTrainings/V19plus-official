'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, formatFirebaseAuthError } from '../../../context/AuthContext';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../../../utils/firebase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  
  // Email/Password state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Phone OTP state
  const [phoneCountry, setPhoneCountry] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Forgot password state
  const [forgotModalOpen, setForgotModalOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // General state
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState<boolean>(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/browse';
  const urlError = searchParams.get('error');

  const { login, signup, loginWithGoogle, sendPhoneOtp, verifyOtp, sendPasswordReset, user, loading: authLoading, isAuthenticated } = useAuth();

  // Redirect if already authenticated
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

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any = null;
    if (otpStep === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev: number) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpStep, resendTimer]);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      if (typeof window !== 'undefined') {
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const initRecaptchaVerifier = async () => {
    if (typeof window === 'undefined') return null;

    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {}
      recaptchaVerifierRef.current = null;
    }
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
      (window as any).recaptchaVerifier = null;
    }
    
    // Ensure clean container exists
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }
    container.innerHTML = '';

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try requesting OTP again.');
      },
    });
    
    try {
      await verifier.render();
    } catch (renderErr) {
      console.warn('reCAPTCHA render notice:', renderErr);
    }

    (window as any).recaptchaVerifier = verifier;
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  /* ── Native Biometrics ── */
  const handleBiometricLogin = async () => {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to access V19Plus',
        title: 'Biometric Sign In',
        subtitle: 'Use fingerprint/face scan to log in',
        description: 'Please scan your fingerprint or face to authenticate',
      });
      
      const creds = await NativeBiometric.getCredentials({ server: 'v19plus.app' });
      if (creds && creds.username && creds.password) {
        setLoading(true);
        setError('');
        await login(creds.username, creds.password);
        router.push(returnUrl);
      } else {
        setError('Failed to retrieve biometric credentials.');
      }
    } catch (err: any) {
      console.error('Biometric authentication failed:', err);
      if (err?.code !== 100 && err?.message !== 'User canceled') {
        setError('Biometric authentication failed. Please enter your password.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
        const avail = await NativeBiometric.isAvailable();
        if (avail.isAvailable) {
          setBiometricAvailable(true);
          try {
            const creds = await NativeBiometric.getCredentials({ server: 'v19plus.app' });
            if (creds && creds.username) {
              setHasSavedCredentials(true);
            }
          } catch (e) {}
        }
      } catch (e) {}
    };
    checkBiometrics();
  }, []);

  /* ── Email / Password Sign-In ── */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform() && biometricAvailable) {
        try {
          const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
          await NativeBiometric.setCredentials({
            username: email.trim(),
            password: password,
            server: 'v19plus.app',
          });
        } catch (e) {}
      }

      toast.success('Signed in successfully! 👋');
      router.push(returnUrl);
    } catch (err: any) {
      const code = err?.code || '';
      // If user does not exist yet and password meets minimum length, automatically create account seamlessly
      if ((code === 'auth/user-not-found' || code === 'auth/invalid-credential') && password.length >= 6) {
        try {
          const defaultName = email.trim().split('@')[0] || 'User';
          await signup(email.trim(), password, defaultName);
          toast.success('Account created and signed in! Welcome to V19Plus 🎉');
          router.push(returnUrl);
          return;
        } catch (signupErr: any) {
          // If signup also encounters an error (e.g. email already exists with wrong password), display clear message
          if (signupErr?.code === 'auth/email-already-in-use') {
            setError('Incorrect password. Please verify your password or use "Forgot password?".');
            return;
          }
          setError(formatFirebaseAuthError(signupErr));
          return;
        }
      }
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Sign-In with Firebase ── */
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

  /* ── Phone Number Step 1: Send OTP ── */
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 6) {
      setError('Please enter a valid mobile number.');
      return;
    }

    const fullPhoneNumber = `${phoneCountry}${cleanNumber}`;
    setLoading(true);
    setError('');

    try {
      const verifier = await initRecaptchaVerifier();
      if (!verifier) {
        throw new Error('Failed to initialize verification system. Please try again.');
      }
      const confirmation = await sendPhoneOtp(fullPhoneNumber, verifier);
      setConfirmationResult(confirmation);
      setOtpStep(2);
      setOtpDigits(['', '', '', '', '', '']);
      setResendTimer(60);
      setCanResend(false);
      toast.success(`OTP sent to ${fullPhoneNumber}! 📱`);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error('Phone OTP error:', err);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Phone Number Step 2: Verify OTP ── */
  const handleOtpChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '');
    if (!sanitized) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Single digit input
    const newDigits = [...otpDigits];
    newDigits[index] = sanitized.slice(-1);
    setOtpDigits(newDigits);

    // Auto focus next input
    if (index < 5 && sanitized) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all 6 digits filled
    const combined = newDigits.join('');
    if (combined.length === 6) {
      submitOtpCode(combined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      submitOtpCode(pastedData);
    }
  };

  const submitOtpCode = async (codeOverride?: string) => {
    const code = codeOverride || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (!confirmationResult) {
      setError('No active OTP session. Please request a new OTP.');
      setOtpStep(1);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyOtp(confirmationResult, code);
      toast.success('Mobile verification successful! 🎉');
      router.push(returnUrl);
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Password Reset Flow ── */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your registered email.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      toast.success('Password reset link sent to your email! ✉️');
      setForgotModalOpen(false);
      setResetEmail('');
    } catch (err: any) {
      toast.error(formatFirebaseAuthError(err));
    } finally {
      setResetLoading(false);
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
      <div id="recaptcha-container" />

      {/* ── Cinematic background ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src="https://assets.nflxext.com/ffe/siteui/vlv3/a73c4363-1dcd-4719-b3b1-3725418fd91d/fe1147dd-78be-44aa-a0e5-2d2994305a13/IN-en-20231016-popsignuptwoweeks-perspective_alpha_website_large.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-[0.35] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 sm:px-16 pt-6 pb-4">
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

      {/* ── Card ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-2xl bg-black/85 backdrop-blur-md border border-white/[0.08] shadow-2xl shadow-black/80 px-8 sm:px-10 py-10">

          <h1 className="text-white text-[1.85rem] font-bold mb-1 tracking-tight">
            {authMode === 'email' ? 'Sign In' : 'Mobile Login'}
          </h1>
          <p className="text-white/40 text-sm mb-6">
            {authMode === 'email' ? 'Welcome back to V19Plus' : 'Sign in with your phone number and OTP'}
          </p>

          {/* ── Mode Switcher Tab ── */}
          <div className="flex bg-[#1f1f1f] p-1 rounded-lg mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => { setAuthMode('email'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                authMode === 'email' ? 'bg-[#FF5C00] text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('phone'); setError(''); setOtpStep(1); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                authMode === 'phone' ? 'bg-[#FF5C00] text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              Mobile Number OTP
            </button>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 rounded-lg bg-[#FF5C00]/15 border border-[#FF5C00]/30 px-4 py-3 text-sm text-white animate-fade-in"
            >
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF5C00]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── EMAIL / PASSWORD FORM ── */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(''); }}
                  placeholder=" "
                  className="peer w-full rounded-md bg-[#242424] px-4 pb-2.5 pt-7 text-white text-[15px] placeholder-transparent focus:bg-[#2e2e2e] focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60 transition-colors border border-white/5"
                />
                <label
                  htmlFor="email"
                  className="pointer-events-none absolute left-4 top-2 text-[10px] text-white/40 transition-all
                             peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[15px] peer-placeholder-shown:text-white/30
                             peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-[#FF5C00]"
                >
                  Email address
                </label>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(''); }}
                  placeholder=" "
                  className="peer w-full rounded-md bg-[#242424] px-4 pb-2.5 pt-7 pr-11 text-white text-[15px] placeholder-transparent focus:bg-[#2e2e2e] focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60 transition-colors border border-white/5"
                />
                <label
                  htmlFor="password"
                  className="pointer-events-none absolute left-4 top-2 text-[10px] text-white/40 transition-all
                             peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[15px] peer-placeholder-shown:text-white/30
                             peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-[#FF5C00]"
                >
                  Password
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v: boolean) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="submit"
                id="sign-in-btn"
                disabled={loading || googleLoading}
                className="mt-2 w-full rounded-md bg-[#FF5C00] py-3.5 text-[15px] font-bold text-white transition-all hover:bg-[#c11119] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing In…
                  </>
                ) : 'Sign In'}
              </button>

              <div className="flex items-center justify-between text-xs sm:text-sm text-white/40 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="hover:text-white/80 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* ── PHONE OTP STEP 1: ENTER PHONE NUMBER ── */}
          {authMode === 'phone' && otpStep === 1 && (
            <form onSubmit={handleSendOtp} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Enter Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={phoneCountry}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPhoneCountry(e.target.value)}
                    className="w-24 px-3 py-3.5 bg-[#242424] border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+65">🇸🇬 +65</option>
                  </select>
                  <input
                    type="tel"
                    id="phone-number-input"
                    value={phoneNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 15));
                      setError('');
                    }}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3.5 bg-[#242424] border border-white/10 rounded-md text-white text-base tracking-wider placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF5C00]/60"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                id="send-otp-btn"
                disabled={loading || !phoneNumber.trim()}
                className="w-full rounded-md bg-[#FF5C00] py-3.5 text-[15px] font-bold text-white transition-all hover:bg-[#c11119] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying reCAPTCHA & Sending OTP…
                  </>
                ) : 'Send OTP'}
              </button>
            </form>
          )}

          {/* ── PHONE OTP STEP 2: ENTER 6-DIGIT OTP ── */}
          {authMode === 'phone' && otpStep === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-300">
                  OTP sent to <span className="font-bold text-white">{phoneCountry} {phoneNumber}</span>
                </p>
                <p className="text-xs text-white/40">Enter the 6-digit verification code below</p>
              </div>

              {/* 6-box input */}
              <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit: string, idx: number) => (
                  <input
                    key={idx}
                    ref={(el: HTMLInputElement | null) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl bg-[#242424] border border-white/10 text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent transition-all"
                  />
                ))}
              </div>

              <button
                type="button"
                id="verify-otp-btn"
                onClick={() => submitOtpCode()}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full rounded-md bg-[#FF5C00] py-3.5 text-[15px] font-bold text-white transition-all hover:bg-[#c11119] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying OTP…
                  </>
                ) : 'Verify OTP'}
              </button>

              <div className="flex items-center justify-between text-xs sm:text-sm text-white/50 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setOtpStep(1); setError(''); }}
                  className="hover:text-white transition-colors"
                >
                  ← Change Number
                </button>
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-[#FF5C00] font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span>Resend in <strong className="text-white font-mono">{resendTimer}s</strong></span>
                )}
              </div>
            </div>
          )}

          {/* ── Biometric login ── */}
          {biometricAvailable && hasSavedCredentials && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={loading}
              className="w-full mt-3 rounded-md border border-white/20 py-3 text-sm font-semibold text-white transition-all hover:bg-white/5 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.916 13.916 0 00-2.81-8.31l-.054-.09z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09A13.916 13.916 0 0015 11c0 3.517 1.009 6.799 2.753 9.571m-3.44-2.04l.054.09z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              Sign In with Biometrics
            </button>
          )}

          {/* ── Divider ── */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* ── Google OAuth Button ── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            id="google-login-btn"
            className="flex w-full items-center justify-center gap-3 rounded-md bg-white py-3.5 text-[15px] font-semibold text-[#1f1f1f] shadow-sm transition-all hover:bg-gray-100 active:scale-[0.98] disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Connecting to Google…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* ── Footer ── */}
          <p className="mt-8 text-center text-sm text-white/40">
            New to V19Plus?{' '}
            <Link href="/signup" className="font-semibold text-white/80 hover:text-white hover:underline transition-colors">
              Sign up now.
            </Link>
          </p>
        </div>
      </main>

      {/* ── Forgot Password Modal ── */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Reset Password</h3>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Enter the email address registered with your account and we will send you a link to reset your password.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-[#242424] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5C00]"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-[1.5] py-3 bg-[#FF5C00] hover:bg-[#c11119] text-white font-bold rounded-lg text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {resetLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
