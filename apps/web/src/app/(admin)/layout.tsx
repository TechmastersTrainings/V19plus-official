'use client';

import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pure Admin Console container - strictly no consumer Topbar or consumer Footer
  return (
    <div className="min-h-screen bg-[#070605] text-white selection:bg-[#FF5C00]/30 selection:text-white antialiased">
      {children}
    </div>
  );
}
