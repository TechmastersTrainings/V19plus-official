'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useIsAndroidApp } from './Footer';
import { Home, Film, Tv, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAndroidApp = useIsAndroidApp();

  // ONLY render when inside the Android App container
  if (!isAndroidApp) return null;

  // Hidden on specific fullscreen pages
  if (pathname.startsWith('/watch/')) return null;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Dedicated Android App Bottom Tabs: Home | Movies | Web Series | Search | Profile
  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: Home,
    },
    {
      to: '/movies',
      label: 'Movies',
      icon: Film,
    },
    {
      to: '/series',
      label: 'Web Series',
      icon: Tv,
    },
    {
      to: '/search',
      label: 'Search',
      icon: Search,
    },
    {
      to: isAuthenticated ? '/settings' : '/login',
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 select-none pb-[env(safe-area-inset-bottom)] bg-[#0e0c0a]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
      <div className="flex justify-between items-center py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.to);
          const IconComp = item.icon;

          return (
            <Link
              key={item.to}
              href={item.to}
              className="relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl flex-1 transition-all duration-200"
            >
              <div
                className={`p-1 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-[#FF5C00] scale-110'
                    : 'text-[#9A9286]'
                }`}
              >
                <IconComp className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-bold tracking-tight transition-colors ${
                  active ? 'text-white' : 'text-[#8C8478]'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="activeAppBottomNavDot"
                  className="w-1 h-1 rounded-full bg-[#FF5C00] shadow-[0_0_6px_#FF5C00] mt-0.5"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
