'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import {
  Search,
  Bell,
  Menu,
  X,
  Settings,
  LogOut,
  ShieldAlert,
  Sparkles,
  Film,
  GraduationCap,
  Layers,
  Compass,
  Play,
  Tv,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Film },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/series', label: 'TV Shows', icon: Tv },
  { to: '/browse?type=DOCUMENTARY', label: 'Documentaries', icon: Layers },
  { to: '/browse?genre=knowledge', label: 'Masterclasses', icon: GraduationCap },
];

export function Topbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuth = mounted && isAuthenticated;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path.split('?')[0]);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070605]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.9)]'
          : 'bg-gradient-to-b from-[#070605] via-[#070605]/70 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-18">
        {/* Left: Brand Identity & Studio Navigation */}
        <div className="flex items-center gap-5 lg:gap-8">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[#C8C2B8] hover:text-white p-1.5 rounded-lg bg-white/5 border border-white/5"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* V19Plus Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] shadow-[0_0_16px_rgba(255,92,0,0.4)] group-hover:scale-105 transition-transform flex items-center justify-center">
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center leading-none">
              V19<span className="text-[#FF5C00] drop-shadow-[0_0_10px_rgba(255,92,0,0.5)]">Plus</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all relative ${
                    active ? 'text-white' : 'text-[#A49C90] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="relative z-10">{link.label}</span>
                  {active && (
                    <motion.div
                      layoutId="activeTopNavIndicator"
                      className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] rounded-full shadow-[0_0_10px_#FF5C00]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            {isAuth && (
              <Link
                href="/watchlist"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all relative ${
                  isActive('/watchlist') ? 'text-white' : 'text-[#A49C90] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="relative z-10">My List</span>
                {isActive('/watchlist') && (
                  <motion.div
                    layoutId="activeTopNavIndicator"
                    className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#FF5C00] rounded-full shadow-[0_0_10px_#FF5C00]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Search, Notification, Profile Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Search Trigger */}
          <button
            onClick={() => router.push('/search')}
            className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition-all active:scale-95"
            aria-label="Search Catalog"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Indicator (for authenticated) */}
          {isAuth && (
            <button
              onClick={() => toast.success('You are all caught up!')}
              className="hidden sm:flex relative w-10 h-10 rounded-xl bg-black/60 hover:bg-black/85 text-white items-center justify-center border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition-all active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]" />
            </button>
          )}

          {/* Authentication & Profile Menu */}
          {isAuth ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 rounded-xl bg-black/40 hover:bg-black/70 transition-colors border border-white/15 hover:border-white/30 shadow-lg backdrop-blur-xl"
                aria-label="Account Menu"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-[#FF5C00] to-[#FF8A00] p-0.5 shadow-[0_0_15px_rgba(255,92,0,0.3)]">
                  <div className="w-full h-full rounded-[10px] bg-[#120F0C] flex items-center justify-center text-white text-xs font-black">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'VP'}</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Profile Floating Menu */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-3 w-64 bg-[#14110E] border border-white/20 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-50 p-2"
                  >
                    {/* User summary */}
                    <div className="px-3.5 py-3 border border-white/10 mb-1.5 bg-[#1C1814] rounded-xl">
                      <p className="text-sm font-bold text-white truncate">{user?.name || 'V19Plus Member'}</p>
                      <p className="text-xs text-[#A8A095] truncate mt-0.5">{user?.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF5C00]/20 border border-[#FF5C00]/30 text-[#FFA84A] text-[10px] font-black uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-[#FF5C00]" />
                        {user?.role === 'ADMIN' ? 'ACCOUNT OWNER' : 'VIP PASS'}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="space-y-1">
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#A49C90]" />
                        <span>Account & Playback</span>
                      </Link>
                      <Link
                        href="/subscription"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-[#FF5C00]" />
                        <span>Passes & Billing</span>
                      </Link>
                      {user?.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#FF5C00]/15 rounded-xl transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-[#FF5C00]" />
                          <span>Admin Studio Desk</span>
                        </Link>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/10 mt-1.5 pt-1.5">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                          router.push('/login');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-xl transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-[#FF5C00] to-[#E04800] hover:from-[#FF7A00] hover:to-[#FF5C00] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,92,0,0.3)]"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0F0C0A]/98 backdrop-blur-2xl border-b border-white/10 overflow-hidden px-5 py-4"
          >
            <nav className="space-y-1.5">
              {NAV_LINKS.map((link) => {
                const IconComp = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    href={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      active ? 'text-white bg-[#FF5C00]' : 'text-[#A49C90] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              {isAuth && (
                <Link
                  href="/watchlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#A49C90] hover:text-white hover:bg-white/5"
                >
                  <Layers className="w-4 h-4" />
                  <span>My List</span>
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
