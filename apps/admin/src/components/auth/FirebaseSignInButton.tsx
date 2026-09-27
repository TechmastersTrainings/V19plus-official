'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth, GoogleAuthProvider, signInWithPopup } from '../../utils/firebase';
import { useAdminAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function FirebaseSignInButton() {
  const { firebaseLogin } = useAdminAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFirebaseSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Get the Firebase ID Token
      const idToken = await result.user.getIdToken();
      
      // Pass the Firebase token to your backend
      await firebaseLogin(idToken);
      
      toast.success('Admin authenticated successfully! 🔑');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Firebase OAuth initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <motion.button
        type="button"
        onClick={handleFirebaseSignIn}
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.01 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 shadow-md shadow-black/30 hover:shadow-lg hover:shadow-red-950/20"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Signing in with Firebase…
          </>
        ) : (
          <>
            <FirebaseIcon />
            Continue with Firebase (Google)
          </>
        )}
      </motion.button>
    </div>
  );
}

function FirebaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.986 86.84L54.71 14.502c1.782-3.087 6.182-3.134 8.026-.089l10.87 18.064L12.986 86.84z" fill="#FFA000"/>
      <path d="M73.606 32.477l13.526 22.477-38.307 38.308L73.606 32.477z" fill="#F57C00"/>
      <path d="M110.126 86.84l-22.994-38.21L48.825 93.262 110.126 86.84z" fill="#FFCA28"/>
      <path d="M110.126 86.84L68.75 125.688c-2.42 2.274-6.262 2.274-8.682 0L12.986 86.84 48.825 93.262 110.126 86.84z" fill="#FFA000"/>
    </svg>
  );
}
