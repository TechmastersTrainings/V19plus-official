'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0806] pt-28 pb-20 px-4 sm:px-8 md:px-16 animate-fade-in text-white select-none">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-8" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
          About
        </h1>

        <div className="space-y-6 text-sm sm:text-base text-[#C8C2B8] leading-relaxed">
          <p>
            V19Plus is an OTT video streaming platform delivering high-quality entertainment across movies, web series, live sports, and music.
          </p>
          <p>
            Our mission is to provide an intuitive, high-performance streaming experience accessible across modern web browsers and mobile devices.
          </p>
          <div className="pt-4 border-t border-white/10">
            <Link href="/settings" className="text-sm font-semibold text-[#FF5C00] hover:underline">
              ← Back to Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
