import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { Search, Bell, Menu, X, User, Settings, LogOut, ShieldAlert, Sparkles, Film, Tv, Trophy, Music } from 'lucide-react';
import toast from 'react-hot-toast';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Film },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/series', label: 'Web Series', icon: Tv },
  { to: '/sports', label: 'Sports', icon: Trophy },
  { to: '/music', label: 'Music', icon: Music },
];

export function Topbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { data: settings } = useSiteSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const siteName = settings?.siteName || 'V19Plus';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path.split('?')[0]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 select-none ${
        scrolled
          ? 'bg-[#0A0806]/90 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
          : 'bg-gradient-to-b from-[#0A0806]/95 via-[#0A0806]/60 to-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 md:px-16 lg:px-20 h-16 sm:h-20">
        {/* Left: Brand Logo & Desktop Navigation */}
        <div className="flex items-center gap-6 lg:gap-10">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[#C8C2B8] hover:text-white p-2 rounded-xl bg-white/5 border border-white/5"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#D44900] p-0.5 shadow-[0_0_20px_rgba(255,92,0,0.45)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0A0806] rounded-[10px] flex items-center justify-center overflow-hidden">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt={siteName} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src="/logo-icon.png"
                    alt={siteName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${
                    active ? 'text-white' : 'text-[#A49C90] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="relative z-10">{link.label}</span>
                  {active && (
                    <motion.div
                      layoutId="activeTopNavIndicator"
                      className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#FF5C00] rounded-full shadow-[0_0_10px_#FF5C00]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            {isAuthenticated && (
              <Link
                href="/watchlist"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${
                  isActive('/watchlist') ? 'text-white' : 'text-[#A49C90] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="relative z-10">My List</span>
                {isActive('/watchlist') && (
                  <motion.div
                    layoutId="activeTopNavIndicator"
                    className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#FF5C00] rounded-full shadow-[0_0_10px_#FF5C00]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Search, Notification, Profile Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Search Button */}
            <button
              onClick={() => router.push('/search')}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[#C8C2B8] hover:text-white flex items-center justify-center border border-white/5 hover:border-white/20 transition-all active:scale-95"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell (Visual only for authenticated) */}
            {isAuthenticated && (
              <button
                onClick={() => toast.success('You are all caught up!')}
                className="hidden sm:flex relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[#C8C2B8] hover:text-white items-center justify-center border border-white/5 hover:border-white/20 transition-all active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]" />
              </button>
            )}

            {/* Authentication / Profile Avatar */}
            {isAuthenticated ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                  aria-label="Account Menu"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-[#FF5C00] to-[#FF8A00] p-0.5 shadow-[0_0_15px_rgba(255,92,0,0.3)]">
                    <div className="w-full h-full rounded-[10px] bg-[#14110D] flex items-center justify-center text-white text-xs font-black">
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
                      className="absolute right-0 top-full mt-3 w-64 bg-[#14110D]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50 p-2"
                    >
                      {/* User details */}
                      <div className="px-3.5 py-3 border-b border-white/5 mb-1 bg-white/5 rounded-xl">
                        <p className="text-sm font-bold text-white truncate">{user?.name || 'V19 Subscriber'}</p>
                        <p className="text-xs text-[#8C8478] truncate mt-0.5">{user?.email}</p>
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF5C00]/15 text-[#FF5C00] text-[10px] font-black uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" /> VIP Member
                        </div>
                      </div>

                      {/* Navigation links */}
                      <div className="space-y-1">
                        <Link
                          href="/settings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-[#C8C2B8] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                          <Settings className="w-4 h-4 text-[#A49C90]" />
                          <span>Account Settings</span>
                        </Link>
                        {user?.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-xl transition-colors"
                          >
                            <ShieldAlert className="w-4 h-4 text-[#FF5C00]" />
                            <span>Admin Dashboard</span>
                          </Link>
                        )}
                      </div>

                      {/* Logout action */}
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                            router.push('/login');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
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
              <Link
                href="/login"
                className="px-5 py-2.5 bg-[#FF5C00] hover:bg-[#FF7A00] active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-[0_0_18px_rgba(255,92,0,0.35)]"
              >
                Sign In
              </Link>
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
            className="lg:hidden bg-[#14110D]/98 backdrop-blur-2xl border-b border-white/10 overflow-hidden px-5 py-4"
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
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

