import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const processEnv: any = typeof process !== 'undefined' ? process.env : {};

const firebaseConfig = {
  apiKey: processEnv.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBfBGsKtP46T1pmQng4SDD6NVtt-Jzd7QI",
  authDomain: processEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "v19-plus.firebaseapp.com",
  projectId: processEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "v19-plus",
  storageBucket: processEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "v19-plus.firebasestorage.app",
  messagingSenderId: processEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "781099861106",
  appId: processEnv.NEXT_PUBLIC_FIREBASE_APP_ID || "1:781099861106:web:6e29d4c0270ecf265c2eeb",
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

// Configure local browser session persistence immediately
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err: any) => {
    console.error('Failed to set Firebase auth persistence:', err);
  });
}
