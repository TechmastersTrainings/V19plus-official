'use client';

import React from 'react';
import { Topbar } from '../../components/layout/Topbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Footer } from '../../components/layout/Footer';
import { DetailModal } from '../../components/content/DetailModal';
import { SiteConfig } from '../../components/layout/SiteConfig';
import { SplashScreen } from '../../components/ui/SplashScreen';

import { RouteGuard } from '../../components/layout/RouteGuard';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-n-bg">
      <SplashScreen />
      <SiteConfig />
      <Topbar />
      <main className="flex-1 pt-0">
        <RouteGuard>
          {children}
        </RouteGuard>
      </main>
      <Footer />
      <BottomNav />
      <DetailModal />
    </div>
  );
}
