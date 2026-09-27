'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { userApi } from '../../../api/user';
import toast from 'react-hot-toast';
import { ChevronRight, User, Bookmark, Shield, FileText, Info, HelpCircle, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, isAuthenticated, logout, fetchMe } = useAuthStore();
  const router = useRouter();
  const [editingAccount, setEditingAccount] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    try {
      setIsSaving(true);
      await userApi.updateProfile({ name: displayName });
      await fetchMe();
      setEditingAccount(false);
      toast.success('Account updated');
    } catch {
      toast.error('Failed to update account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const listItems = [
    {
      id: 'account',
      label: 'Account',
      icon: User,
      subtitle: user ? `${user.name} (${user.email})` : 'Sign in to your account',
      onClick: () => {
        if (!isAuthenticated) {
          router.push('/login');
        } else {
          setDisplayName(user?.name || '');
          setEditingAccount(!editingAccount);
        }
      },
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: Bookmark,
      href: '/watchlist',
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: Shield,
      href: '/legal/privacy',
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: FileText,
      href: '/legal/terms',
    },
    {
      id: 'about',
      label: 'About',
      icon: Info,
      href: '/about',
    },
    {
      id: 'help',
      label: 'Contact / Help',
      icon: HelpCircle,
      href: '/support',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0806] pt-24 sm:pt-28 pb-24 md:pb-16 px-4 sm:px-8 md:px-16 animate-fade-in text-white select-none">
      <div className="max-w-2xl mx-auto">
        {/* Page Title */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-8"
          style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
        >
          Settings
        </h1>

        {/* Minimal List */}
        <div className="bg-[#14110D] border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
          {listItems.map((item) => {
            const Icon = item.icon;

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-5 h-5 text-[#A49C90]" />
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8C8478]" />
                </Link>
              );
            }

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-5 h-5 text-[#A49C90]" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      {item.subtitle && (
                        <p className="text-xs text-[#8C8478] mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#8C8478] transition-transform ${editingAccount ? 'rotate-90' : ''}`} />
                </button>

                {/* Inline account edit form */}
                {editingAccount && isAuthenticated && (
                  <div className="px-5 py-4 bg-white/5 border-t border-white/5 space-y-3">
                    <label className="block text-xs font-semibold text-[#8C8478] uppercase">Display Name</label>
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="flex-1 bg-[#0A0806] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Your Name"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={isSaving || !displayName.trim()}
                        className="px-4 py-2 bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Logout row */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/10 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                <span className="text-sm font-semibold text-red-400 group-hover:text-red-300">Logout</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/50 group-hover:text-red-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
