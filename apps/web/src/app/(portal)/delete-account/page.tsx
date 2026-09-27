'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { ShieldAlert, Trash2, ArrowLeft, Mail, Info } from 'lucide-react';

export default function DeleteAccountPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [requestSent, setRequestSent] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [reason, setReason] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    if (!confirmCheckbox) {
      toast.error('Please confirm that you understand the terms of account deletion');
      return;
    }

    // Simulate sending deletion request to backend/support team
    setRequestSent(true);
    toast.success('Your account deletion request has been submitted! 📨');
    if (isAuthenticated) {
      setTimeout(() => {
        logout();
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0806] pt-28 pb-20 px-4 md:px-8 relative overflow-hidden flex items-center justify-center">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-n-red/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF5C00]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Delete Account</h1>
            <p className="text-xs text-gray-400">Request removal of your account and user data</p>
          </div>
        </div>

        {requestSent ? (
          <div className="text-center py-6 space-y-4 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] mx-auto text-2xl">
              📨
            </div>
            <h2 className="text-lg font-bold text-white">Request Received</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your request to delete the account associated with <strong className="text-white">{email}</strong> has been received. Our support team will process it and purge your account from Firebase Authentication and Firebase Firestore database records within 7 business days.
            </p>
            {isAuthenticated && (
              <p className="text-xs text-gray-500 italic">Logging you out in a few seconds...</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex gap-3 text-xs text-red-400">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
              <div className="space-y-1">
                <p className="font-bold">Warning: This action is permanent</p>
                <p className="text-gray-400 leading-relaxed">
                  Deleting your account will permanently erase your watchlists, settings, profile preferences, watch history, and Firebase Firestore database records. Once deleted, this action cannot be undone.
                </p>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter your account email"
                disabled={isAuthenticated}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/25 transition-all text-sm disabled:opacity-60"
              />
            </div>

            {/* Reason Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reason for leaving (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us how we can improve"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-all text-sm resize-none"
              />
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-1 accent-red-500 rounded border-white/10 bg-white/5"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                I understand that account deletion is permanent and all my data will be completely purged from the V19Plus platform.
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Request Deletion
            </button>

            {/* Manual contact note */}
            <div className="flex items-center gap-2 text-[10px] text-gray-500 justify-center">
              <Mail className="w-3.5 h-3.5" />
              <span>Questions? Email us at <a href="mailto:support@v19plus.app" className="text-white hover:underline">support@v19plus.app</a></span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
