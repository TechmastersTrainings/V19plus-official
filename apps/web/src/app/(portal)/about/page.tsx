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
            V19Plus is a premier video streaming destination dedicated to outstanding feature films, world-class masterclasses, and acclaimed documentaries. We celebrate remarkable storytelling and bring compelling human experiences to audiences worldwide.
          </p>
          <p>
            Our mission is to connect viewers with high-caliber productions across television, desktop, tablet, and mobile devices—delivering an intuitive, uninterrupted entertainment experience anywhere.
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
