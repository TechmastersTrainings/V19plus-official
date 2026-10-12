'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

const PROTECTED_PREFIXES = [
  '/watchlist',
  '/downloads',
  '/settings',
  '/my-tickets',
  '/profile',
];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isAuthenticated } = useAuth();

  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  useEffect(() => {
    // If user happens to navigate to legacy profile selection page, redirect to home
    if (pathname === '/profile/select') {
      router.replace('/');
      return;
    }

    // Only guard protected routes
    if (!isProtectedPath) return;

    // Wait until auth state has initialized
    if (loading) return;

    // If not authenticated on a protected route, redirect to /login
    if (!isAuthenticated || !user) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [isProtectedPath, isAuthenticated, user, loading, pathname, router]);

  // Public paths render immediately with zero delay or blank state
  if (!isProtectedPath) {
    return <>{children}</>;
  }

  // Protected paths show loading while resolving credentials
  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-[70vh] bg-[#080808] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-[#FF5C00] border-t-transparent animate-spin" />
        </div>
        <span className="text-[#A0A0A0] text-[11px] font-bold tracking-widest uppercase">
          Verifying session…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

