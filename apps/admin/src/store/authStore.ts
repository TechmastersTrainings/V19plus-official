import { create } from 'zustand';
import { authApi, type AuthResponse } from '../api/admin';
import { setAdminToken } from '../api/axios';
import { auth } from '../utils/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const ADMIN_EMAILS = ['v19plus04@gmail.com'];

interface AdminAuthState {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  firebaseLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start in loading state while checking Firebase / cached session

  adminLogin: async (email, password) => {
    // 1. Try Firebase Auth first
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      setAdminToken(idToken);
      
      const emailLower = (cred.user.email || '').toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(emailLower);

      // Also notify backend to ensure cookies and database record are in sync
      try {
        const { data } = await authApi.firebaseLogin(idToken);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return;
      } catch (backendErr) {
        // If backend is running standalone or direct Firebase mode, permit admin
        if (isAdmin) {
          set({
            user: {
              id: cred.user.uid,
              email: cred.user.email || email,
              name: cred.user.displayName || 'Admin User',
              role: 'ADMIN',
              avatarUrl: cred.user.photoURL || undefined,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
    } catch (fbErr: any) {
      // 2. Fallback to direct backend API login
      const { data } = await authApi.adminLogin(email, password);
      setAdminToken(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    }
  },

  firebaseLogin: async (accessToken) => {
    try {
      const { data } = await authApi.firebaseLogin(accessToken);
      setAdminToken(data.accessToken || accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      // Direct Firebase fallback
      const fbUser = auth.currentUser;
      if (fbUser) {
        const emailLower = (fbUser.email || '').toLowerCase();
        if (ADMIN_EMAILS.includes(emailLower)) {
          setAdminToken(accessToken);
          set({
            user: {
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || 'Admin',
              role: 'ADMIN',
              avatarUrl: fbUser.photoURL || undefined,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      throw err;
    }
  },

  logout: async () => {
    try { await signOut(auth); } catch {}
    try { await authApi.logout(); } catch {}
    setAdminToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        setAdminToken(token);
        const emailLower = (auth.currentUser.email || '').toLowerCase();
        if (ADMIN_EMAILS.includes(emailLower)) {
          set({
            user: {
              id: auth.currentUser.uid,
              email: auth.currentUser.email || '',
              name: auth.currentUser.displayName || 'Admin',
              role: 'ADMIN',
              avatarUrl: auth.currentUser.photoURL || undefined,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      setAdminToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Synchronize Firebase auth state automatically with Admin store
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      try {
        const idToken = await fbUser.getIdToken();
        setAdminToken(idToken);
        const emailLower = (fbUser.email || '').toLowerCase();
        const isAdmin = ADMIN_EMAILS.includes(emailLower);

        // Try syncing with backend
        try {
          const { data } = await authApi.firebaseLogin(idToken);
          useAdminAuthStore.setState({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch {
          if (isAdmin) {
            useAdminAuthStore.setState({
              user: {
                id: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || 'Admin',
                role: 'ADMIN',
                avatarUrl: fbUser.photoURL || undefined,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            useAdminAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        }
      } catch (e) {
        useAdminAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      useAdminAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  });
}
