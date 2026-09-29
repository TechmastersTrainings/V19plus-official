'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, HardDrive, Sparkles, Globe, Film, Play } from 'lucide-react';
import { useIsAndroidApp } from './useIsAndroidApp';

export { useIsAndroidApp };

export function Footer() {
  const isAndroidApp = useIsAndroidApp();

  // Hide footer completely when running inside the Android app
  if (isAndroidApp) {
    return null;
  }

  return (
    <footer className="mt-12 border-t border-white/5 bg-[#070605] text-[#A49C90] pt-10 pb-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top: Brand & Platform Mission */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-white/5">
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] shadow-[0_0_20px_rgba(255,92,0,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
              </div>
              <span className="font-black text-2xl tracking-tight text-white">
                V19<span className="text-[#FF5C00]">Plus</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-md">
              V19Plus is a premier entertainment streaming platform delivering cinematic feature films,
              world-class masterclasses, and acclaimed documentaries in true 4K Ultra HD with immersive spatial audio.
            </p>
            {/* Entertainment badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-md bg-[#14100D] border border-white/10 text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#FF5C00]" /> 4K Ultra HD
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#14100D] border border-white/10 text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <Film className="w-3 h-3 text-[#FF8A00]" /> V19Plus Originals
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#14100D] border border-white/10 text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Ad-Free Streaming
              </span>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            {/* Column 1: Discovery */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                Explore Content
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/browse" className="hover:text-white transition-colors">
                    Featured Titles
                  </Link>
                </li>
                <li>
                  <Link href="/browse?genre=knowledge" className="hover:text-white transition-colors">
                    Masterclasses
                  </Link>
                </li>
                <li>
                  <Link href="/browse?type=DOCUMENTARY" className="hover:text-white transition-colors">
                    Documentaries
                  </Link>
                </li>
                <li>
                  <Link href="/movies" className="hover:text-white transition-colors">
                    Feature Cinema
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Search Library
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Streaming Experience */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                Experience
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/browse" className="hover:text-white transition-colors">
                    Watch on Smart TV
                  </Link>
                </li>
                <li>
                  <Link href="/browse" className="hover:text-white transition-colors">
                    Mobile & Tablet Apps
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    Audio & Subtitles
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/subscription" className="hover:text-white transition-colors">
                    Membership Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform & Legal */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                Company & Legal
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About V19Plus
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/refund" className="hover:text-white transition-colors">
                    Refund & Cancellation
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-white transition-colors">
                    Account Settings
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Copyright & Specs */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 V19Plus Entertainment. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>True 4K Ultra HD</span>
            <span>•</span>
            <span>Dolby Atmos Compatible</span>
            <span>•</span>
            <span>Stream Anywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
