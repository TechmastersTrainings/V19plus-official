'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0806] pt-28 pb-20 px-4 sm:px-8 md:px-16 animate-fade-in text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-8" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
          About V19Plus
        </h1>

        <div className="space-y-6 text-sm sm:text-base text-[#C8C2B8] leading-relaxed">
          <p>
            V19Plus is a premier video streaming platform engineered for cinema-grade feature films, world-class masterclasses, and in-depth documentaries. We specialize in uncompromised 4K Ultra HD visual fidelity and immersive spatial audio.
          </p>
          <p>
            Our mission is to connect discerning audiences with high-caliber productions across television, desktop, tablet, and mobile devices—delivering a seamless, buffer-free entertainment experience anywhere.
          </p>
          <div className="pt-4 border-t border-white/10">
            <Link href="/" className="text-sm font-semibold text-[#FF5C00] hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
