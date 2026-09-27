'use client';

import React from 'react';
import { Topbar } from '../../components/layout/Topbar';
import { Footer } from '../../components/layout/Footer';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-white">
      <Topbar />
      <main className="flex-1 pt-18 sm:pt-20 pb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
