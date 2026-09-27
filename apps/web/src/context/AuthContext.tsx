'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuthStore, User as StoreUser } from '../store/authStore';

export interface AppUser {
  uid: string;
  id: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  name: string;
  photoURL: string | null;
  avatarUrl?: string;
  providerData: any[];
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || d).join(', ');
  }
  if (error.message) return error.message;
  return 'Authentication failed. Please try again.';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  signup: (email: string, password: string, displayName?: string) => Promise<AppUser>;
  loginWithGoogle: () => Promise<AppUser>;
  sendPhoneOtp: (phoneNumber: string, recaptchaVerifier: any) => Promise<any>;
  verifyOtp: (confirmationResult: any, verificationCode: string) => Promise<AppUser>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  linkCredential: (credential: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(storeUser: StoreUser | null): AppUser | null {
  if (!storeUser) return null;
  const displayName = storeUser.displayName || storeUser.name || (storeUser.email ? storeUser.email.split('@')[0] : 'User');
  const role = (storeUser.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  return {
    uid: storeUser.id,
    id: storeUser.id,
    email: storeUser.email,
    phoneNumber: storeUser.phoneNumber || null,
    displayName,
    name: displayName,
    photoURL: storeUser.photoURL || storeUser.avatarUrl || null,
    avatarUrl: storeUser.avatarUrl || storeUser.photoURL || undefined,
    providerData: [],
    role,
    isVerified: Boolean(storeUser.isVerified),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginAction = useAuthStore((s) => s.login);
  const signupAction = useAuthStore((s) => s.signup);
  const logoutAction = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const user = useMemo(() => toAppUser(storeUser), [storeUser]);

  const login = async (email: string, password: string): Promise<AppUser> => {
    await loginAction(email, password);
    const updated = useAuthStore.getState().user;
    const mapped = toAppUser(updated);
    if (!mapped) throw new Error('Failed to retrieve user after login.');
    return mapped;
  };

  const signup = async (email: string, password: string, displayName?: string): Promise<AppUser> => {
    await signupAction(email, password, displayName);
    const updated = useAuthStore.getState().user;
    const mapped = toAppUser(updated);
    if (!mapped) throw new Error('Failed to retrieve user after signup.');
    return mapped;
  };

  const loginWithGoogle = async (): Promise<AppUser> => {
    throw new Error('Google OAuth is handled via backend OAuth flow.');
  };

  const sendPhoneOtp = async (): Promise<any> => {
    throw new Error('Phone OTP is managed via backend SMS provider.');
  };

  const verifyOtp = async (): Promise<AppUser> => {
    throw new Error('OTP verification is managed via backend SMS provider.');
  };

  const sendPasswordReset = async (): Promise<void> => {
    // Backend password reset trigger
  };

  const sendVerificationEmail = async (): Promise<void> => {
    // Backend verification email trigger
  };

  const linkCredential = async (): Promise<void> => {
    // Not applicable in standalone FastAPI auth
  };

  const logout = async (): Promise<void> => {
    await logoutAction();
  };

  const refreshUser = async (): Promise<void> => {
    await fetchMe();
  };

  const value: AuthContextType = {
    user,
    loading: isLoading,
    isAuthenticated,
    login,
    signup,
    loginWithGoogle,
    sendPhoneOtp,
    verifyOtp,
    sendPasswordReset,
    sendVerificationEmail,
    linkCredential,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    const store = useAuthStore();
    return {
      user: toAppUser(store.user),
      loading: store.isLoading,
      isAuthenticated: store.isAuthenticated,
      login: async (email, pass) => {
        await store.login(email, pass);
        return toAppUser(useAuthStore.getState().user)!;
      },
      signup: async (email, pass, name) => {
        await store.signup(email, pass, name);
        return toAppUser(useAuthStore.getState().user)!;
      },
      loginWithGoogle: async () => { throw new Error('Google login via backend'); },
      sendPhoneOtp: async () => { throw new Error('Phone OTP via backend'); },
      verifyOtp: async () => { throw new Error('OTP via backend'); },
      sendPasswordReset: async () => {},
      sendVerificationEmail: async () => {},
      linkCredential: async () => {},
      logout: store.logout,
      refreshUser: store.fetchMe,
    };
  }
  return context as AuthContextType;
}

