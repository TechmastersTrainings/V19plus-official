import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 bg-n-black z-[9999] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
        <div className="absolute inset-0 rounded-full border-4 border-n-red border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-n-text/70 text-sm font-medium tracking-widest uppercase">Loading...</p>
    </div>
  );
}
