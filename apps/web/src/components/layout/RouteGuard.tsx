'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isAuthenticated } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Wait until Firebase authentication state observer finishes restoring the session
    if (loading) return;

    // 1. If not authenticated, allow landing page and public routes, otherwise redirect to /login
    if (!isAuthenticated || !user) {
      const isPublicPath = pathname === '/' || pathname.startsWith('/legal') || pathname === '/delete-account';
      if (!isPublicPath) {
        const returnUrl = encodeURIComponent(pathname);
        router.replace(`/login?returnUrl=${returnUrl}`);
        return;
      }
      setAuthorized(true);
      return;
    }

    // If user happens to navigate to legacy profile selection page, redirect to home
    if (pathname === '/profile/select') {
      router.replace('/');
      return;
    }

    setAuthorized(true);
  }, [isAuthenticated, user, loading, pathname, router]);

  // While restoring session from Firebase or waiting for router redirection, show sleek loading indicator
  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4 select-none">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-[#FF5C00] border-t-transparent animate-spin" />
        </div>
        <span className="text-[#8C8478] text-[11px] font-bold tracking-widest uppercase">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}

