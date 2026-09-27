'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Film,
  FolderTree,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Content', href: '/content', icon: Film },
  { label: 'Categories', href: '/categories', icon: FolderTree },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Site Settings', href: '/settings', icon: SettingsIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAdminAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin role required.');
      logout();
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, user, router, logout]);

  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#222] bg-[#141414] shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#222]">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="V19Plus" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-black tracking-tight text-white">
              V19Plus
            </span>
            <span className="bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#222] space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-red-600/10">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-transparent hover:border-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#141414] border-b border-[#222] flex items-center justify-between px-4 z-30">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="V19Plus" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-xl font-black tracking-tight text-white">
            V19Plus
          </span>
          <span className="bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Admin
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-20"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-72 bg-[#141414] border-r border-[#222] flex flex-col z-25 pt-16"
            >
              <nav className="flex-1 px-4 py-6 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/15'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-[#222] space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-red-600/10">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-transparent hover:border-red-500/10 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
