import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-n-black flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <h1 className="text-6xl font-black text-white mb-2">404</h1>
        <h2 className="text-xl font-bold text-n-text mb-4">Lost your way?</h2>
        <p className="text-n-text/80 mb-8 text-sm leading-relaxed">
          Sorry, we can't find that page. You'll find lots to explore on the home page.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-white text-black font-bold rounded-lg transition-transform hover:scale-105"
        >
          V19Plus Home
        </Link>
      </div>
    </div>
  );
}
