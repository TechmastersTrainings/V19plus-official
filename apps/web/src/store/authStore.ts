import { create } from 'zustand';
import { auth, db } from '../utils/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface User {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  displayName: string | null;
  phoneNumber?: string | null;
  role: string;
  avatarUrl?: string;
  photoURL?: string | null;
  isVerified?: boolean;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _initialized: boolean;
  checkEmail: (email: string) => Promise<boolean>;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setAccessToken: (token: string) => void;
  hasActiveSubscription: () => boolean;
  isAdmin: () => boolean;
}

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return {};
  let deviceId = localStorage.getItem('v19_device_id');
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('v19_device_id', deviceId);
  }
  return {
    deviceId,
    deviceName: typeof navigator !== 'undefined' ? (navigator.userAgent.split(' ')[0] || 'Web Browser') : 'Web Browser',
    deviceType: 'WEB',
  };
};

async function syncUserWithFirestore(fbUser: any, nameOverride?: string): Promise<User> {
  const userDocRef = doc(db, 'users', fbUser.uid);
  let role = 'USER';
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
      const updates: any = { updatedAt: serverTimestamp() };
      if (!docData.email && fbUser.email) updates.email = fbUser.email;
      if (!docData.phoneNumber && fbUser.phoneNumber) updates.phoneNumber = fbUser.phoneNumber;
      if (!docData.displayName && (fbUser.displayName || nameOverride)) {
        updates.displayName = fbUser.displayName || nameOverride;
      }
      if (!docData.photoURL && fbUser.photoURL) updates.photoURL = fbUser.photoURL;
      await setDoc(userDocRef, updates, { merge: true });
    } else {
      const displayName = nameOverride || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
      const newUser = {
        uid: fbUser.uid,
        email: fbUser.email || null,
        phoneNumber: fbUser.phoneNumber || null,
        displayName: displayName,
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
    console.warn('Firestore user profile sync warning:', err);
  }

  const effectiveName = docData.displayName || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
  const effectivePhoto = docData.photoURL || fbUser.photoURL || undefined;

  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    email: fbUser.email || docData.email || null,
    name: effectiveName,
    displayName: effectiveName,
    phoneNumber: fbUser.phoneNumber || docData.phoneNumber || null,
    avatarUrl: effectivePhoto,
    photoURL: effectivePhoto || null,
    role: docData.role || role,
    isVerified: fbUser.emailVerified || !!fbUser.phoneNumber,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  _initialized: false,

  setAccessToken: (token) => set({ accessToken: token }),

  hasActiveSubscription: () => true,

  isAdmin: () => get().user?.role === 'ADMIN',

  checkEmail: async () => false,

  login: async (email, password = '') => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await cred.user.getIdToken();
    const syncedUser = await syncUserWithFirestore(cred.user);
    if (typeof window !== 'undefined') {
      const sec = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `accessToken=${idToken}; path=/; max-age=86400; SameSite=Lax${sec}`;
    }
    set({
      user: syncedUser,
      accessToken: idToken,
      refreshToken: idToken,
      isAuthenticated: true,
      isLoading: false,
      _initialized: true,
    });
  },

  signup: async (email, password = '', name) => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name && name.trim()) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch (e) {}
    }
    const idToken = await cred.user.getIdToken();
    const syncedUser = await syncUserWithFirestore(cred.user, name?.trim());
    if (typeof window !== 'undefined') {
      const sec = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `accessToken=${idToken}; path=/; max-age=86400; SameSite=Lax${sec}`;
    }
    set({
      user: syncedUser,
      accessToken: idToken,
      refreshToken: idToken,
      isAuthenticated: true,
      isLoading: false,
      _initialized: true,
    });
  },

  loginWithGoogle: async () => {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const idToken = await cred.user.getIdToken();
    const syncedUser = await syncUserWithFirestore(cred.user);
    if (typeof window !== 'undefined') {
      const sec = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `accessToken=${idToken}; path=/; max-age=86400; SameSite=Lax${sec}`;
    }
    set({
      user: syncedUser,
      accessToken: idToken,
      refreshToken: idToken,
      isAuthenticated: true,
      isLoading: false,
      _initialized: true,
    });
  },

  adminLogin: async (email, password) => {
    await get().login(email, password);
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch {}
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('v19_active_profile');
      localStorage.removeItem('v19_active_profile');
      document.cookie = 'v19_active_profile_id=; Max-Age=0; path=/';
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
      document.cookie = 'accessToken=; Max-Age=0; path=/';
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _initialized: true,
    });
  },

  refresh: async () => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      set({ accessToken: token });
    }
  },

  fetchMe: async () => {
    // No-op: auth state is managed by AuthContext's onAuthStateChanged listener.
  },
}));

// Auth state is driven by AuthContext's onAuthStateChanged listener.
// This store is kept for accessToken/socket/admin actions only.

// Sync isAuthenticated/isLoading/user into the store so components that
// read useAuthStore() directly stay in sync with AuthContext state.
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
      const instantUser: User = {
        id: fbUser.uid,
        uid: fbUser.uid,
        email: fbUser.email,
        name,
        displayName: name,
        phoneNumber: fbUser.phoneNumber,
        avatarUrl: fbUser.photoURL || undefined,
        photoURL: fbUser.photoURL,
        role: (fbUser.email && ['v19plus04@gmail.com'].includes(fbUser.email.toLowerCase())) ? 'ADMIN' : 'USER',
        isVerified: fbUser.emailVerified || !!fbUser.phoneNumber,
      };

      // Set user immediately so UI doesn't hang in loading state
      fbUser.getIdToken().then((token) => {
        useAuthStore.setState({
          user: instantUser,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
          _initialized: true,
        });
      }).catch(() => {
        useAuthStore.setState({
          user: instantUser,
          accessToken: null,
          isAuthenticated: true,
          isLoading: false,
          _initialized: true,
        });
      });

      // Sync Firestore profile in background
      Promise.race([
        syncUserWithFirestore(fbUser),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).then((syncedUser) => {
        if (syncedUser) {
          useAuthStore.setState({ user: syncedUser });
        }
      }).catch(() => {});
    } else {
      useAuthStore.setState({
        user: null, accessToken: null,
        isAuthenticated: false, isLoading: false, _initialized: true,
      });
    }
  });
}

export function useAuth() {
  const store = useAuthStore();
  return {
    ...store,
    loading: store.isLoading,
  };
}

