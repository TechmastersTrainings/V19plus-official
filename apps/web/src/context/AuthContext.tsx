'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  linkWithCredential,
  AuthCredential,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

export interface AppUser {
  uid: string;
  id: string; // compatibility with existing components accessing user.id
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  name: string; // compatibility alias
  photoURL: string | null;
  avatarUrl?: string; // compatibility alias
  providerData: any[];
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
      return 'Incorrect email, phone number, or password. Please try again.';
    case 'auth/user-not-found':
      return 'No account found with these credentials. Please check or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes before trying again.';
    case 'auth/invalid-verification-code':
      return 'The SMS verification code entered is invalid. Please check and try again.';
    case 'auth/code-expired':
      return 'The OTP verification code has expired. Please request a new one.';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Please include your country code (e.g., +91).';
    case 'auth/missing-phone-number':
      return 'Please enter a valid phone number.';
    case 'auth/invalid-app-credential':
      return 'App verification failed. Please try again or use Google sign-in.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for now. Please try again later or use Google/Email sign in.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please check network connection or try again.';
    case 'auth/credential-already-in-use':
      return 'This credential is already associated with another account.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before performing this security action.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  signup: (email: string, password: string, displayName?: string) => Promise<AppUser>;
  loginWithGoogle: () => Promise<AppUser>;
  sendPhoneOtp: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyOtp: (confirmationResult: ConfirmationResult, verificationCode: string) => Promise<AppUser>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  linkCredential: (credential: AuthCredential) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Sync user profile in Firestore
async function syncFirestoreUser(fbUser: FirebaseUser, extraDisplayName?: string): Promise<AppUser> {
  const userDocRef = doc(db, 'users', fbUser.uid);
  let role: 'USER' | 'ADMIN' = 'USER';

  const adminEmails = ['v19plus04@gmail.com'];
  if (fbUser.email && adminEmails.includes(fbUser.email.toLowerCase())) {
    role = 'ADMIN';
  }

  let docData: any = {};
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      docData = snap.data();
      role = docData.role || role;
      // Update any updated information
      const updates: any = {
        updatedAt: serverTimestamp(),
      };
      if (!docData.email && fbUser.email) updates.email = fbUser.email;
      if (!docData.phoneNumber && fbUser.phoneNumber) updates.phoneNumber = fbUser.phoneNumber;
      if (!docData.displayName && (fbUser.displayName || extraDisplayName)) {
        updates.displayName = fbUser.displayName || extraDisplayName;
      }
      if (!docData.photoURL && fbUser.photoURL) updates.photoURL = fbUser.photoURL;

      await setDoc(userDocRef, updates, { merge: true });
    } else {
      // First time user registration
      const newDisplayName = extraDisplayName || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
      const newUser = {
        uid: fbUser.uid,
        email: fbUser.email || null,
        phoneNumber: fbUser.phoneNumber || null,
        displayName: newDisplayName,
        photoURL: fbUser.photoURL || null,
        role: role,
        isVerified: fbUser.emailVerified || !!fbUser.phoneNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newUser);
      docData = newUser;
    }
  } catch (err) {
    console.warn('Firestore user profile sync error (continuing with auth session):', err);
  }

  const effectiveDisplayName = docData.displayName || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
  const effectivePhoto = docData.photoURL || fbUser.photoURL || undefined;

  return {
    uid: fbUser.uid,
    id: fbUser.uid,
    email: fbUser.email || docData.email || null,
    phoneNumber: fbUser.phoneNumber || docData.phoneNumber || null,
    displayName: effectiveDisplayName,
    name: effectiveDisplayName,
    photoURL: effectivePhoto || null,
    avatarUrl: effectivePhoto,
    providerData: fbUser.providerData,
    role: docData.role || role,
    isVerified: fbUser.emailVerified || !!fbUser.phoneNumber,
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 1. Instant hydration from cached storage or current Firebase user
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('v19_cached_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => (typeof window !== 'undefined' ? auth.currentUser : null));
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (auth.currentUser || localStorage.getItem('v19_cached_user')) {
        return false;
      }
    }
    return true;
  });

  // Synchronize Firebase auth state change
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure loading is always dismissed within 1.2s max so user is never blocked
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser: FirebaseUser | null) => {
      if (!isMounted) return;
      clearTimeout(fallbackTimer);

      if (currentFbUser) {
        setFirebaseUser(currentFbUser);
        const fallbackName = currentFbUser.displayName || currentFbUser.email?.split('@')[0] || 'User';
        const instantUser: AppUser = {
          uid: currentFbUser.uid,
          id: currentFbUser.uid,
          email: currentFbUser.email,
          phoneNumber: currentFbUser.phoneNumber,
          displayName: fallbackName,
          name: fallbackName,
          photoURL: currentFbUser.photoURL,
          avatarUrl: currentFbUser.photoURL || undefined,
          providerData: currentFbUser.providerData,
          role: (currentFbUser.email && ['v19plus04@gmail.com'].includes(currentFbUser.email.toLowerCase())) ? 'ADMIN' : 'USER',
          isVerified: currentFbUser.emailVerified || !!currentFbUser.phoneNumber,
        };

        // Cache for 0ms load on next visit
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('v19_cached_user', JSON.stringify(instantUser));
          } catch (e) {}
        }

        // Immediately unblock the UI
        if (isMounted) {
          setUser(instantUser);
          setLoading(false);
        }

        // Sync Firestore in background without delaying user session
        Promise.race([
          syncFirestoreUser(currentFbUser),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]).then((appUser) => {
          if (isMounted && appUser) {
            setUser(appUser);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('v19_cached_user', JSON.stringify(appUser));
              } catch (e) {}
            }
          }
        }).catch((e) => {
          console.warn('Background user sync warning:', e);
        });
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('v19_cached_user');
        }
        if (isMounted) {
          setFirebaseUser(null);
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const updated = await syncFirestoreUser(auth.currentUser);
      setUser(updated);
      setFirebaseUser(auth.currentUser);
    }
  }, []);

  const setAuthCookie = async (fbUser: FirebaseUser) => {
    try {
      const token = await fbUser.getIdToken();
      if (typeof window !== 'undefined') {
        const sec = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax${sec}`;
      }
    } catch (e) {}
  };

  const login = useCallback(async (email: string, password: string): Promise<AppUser> => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await setAuthCookie(cred.user);
    const synced = await syncFirestoreUser(cred.user);
    setUser(synced);
    setFirebaseUser(cred.user);
    return synced;
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string): Promise<AppUser> => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setAuthCookie(cred.user);
    if (displayName && displayName.trim()) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch (err) {
        console.warn('Failed to update auth profile displayName:', err);
      }
    }
    const synced = await syncFirestoreUser(cred.user, displayName?.trim());
    setUser(synced);
    setFirebaseUser(cred.user);
    return synced;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AppUser> => {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    await setAuthCookie(result.user);
    const synced = await syncFirestoreUser(result.user);
    setUser(synced);
    setFirebaseUser(result.user);
    return synced;
  }, []);

  const sendPhoneOtp = useCallback(async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    await setPersistence(auth, browserLocalPersistence);
    return await signInWithPhoneNumber(auth, phoneNumber.trim(), recaptchaVerifier);
  }, []);

  const verifyOtp = useCallback(async (confirmationResult: ConfirmationResult, verificationCode: string): Promise<AppUser> => {
    const result = await confirmationResult.confirm(verificationCode.trim());
    await setAuthCookie(result.user);
    const synced = await syncFirestoreUser(result.user);
    setUser(synced);
    setFirebaseUser(result.user);
    return synced;
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const linkCredential = useCallback(async (credential: AuthCredential): Promise<void> => {
    if (!auth.currentUser) throw new Error('No user is currently signed in to link.');
    const result = await linkWithCredential(auth.currentUser, credential);
    const synced = await syncFirestoreUser(result.user);
    setUser(synced);
    setFirebaseUser(result.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('v19_cached_user');
        sessionStorage.removeItem('v19_active_profile');
        localStorage.removeItem('v19_active_profile');
        document.cookie = 'v19_active_profile_id=; Max-Age=0; path=/';
        document.cookie = 'refreshToken=; Max-Age=0; path=/';
        document.cookie = 'accessToken=; Max-Age=0; path=/';
      }
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    firebaseUser,
    loading,
    isAuthenticated: !loading && !!user,
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
  }), [
    user,
    firebaseUser,
    loading,
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
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return (context || {}) as AuthContextType;
}
