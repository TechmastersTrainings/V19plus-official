'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function useIsAndroidApp() {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    // Check Capacitor native platform or Android webview user-agent
    const isNative = Capacitor.isNativePlatform();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroidWV = /wv|Android.*Version\/[\d.]+.*Chrome\/[\d.]+/i.test(ua);
    setIsApp(isNative || isAndroidWV);
  }, []);

  return isApp;
}

const FOOTER_LINKS = [
  { label: 'Audio Description', href: '#' },
  { label: 'Help Center', href: '/support' },
  { label: 'Gift Cards', href: '#' },
  { label: 'Media Center', href: '#' },
  { label: 'Investor Relations', href: '#' },
  { label: 'Jobs', href: '#' },
  { label: 'Terms of Use', href: '/legal/terms' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Refund Policy', href: '/legal/refund' },
  { label: 'Cookie Preferences', href: '/legal/cookies' },
  { label: 'Corporate Information', href: '/about' },
  { label: 'Contact Us', href: '/support' },
];

export function Footer() {
  const { data: settings } = useSiteSettings();
  const siteName = settings?.siteName || 'V19Plus';
  const isAndroidApp = useIsAndroidApp();

  // Hide footer completely when running inside the Android app
  if (isAndroidApp) {
    return null;
  }

  return (
    <footer className="mt-16 bg-n-bg border-t border-n-divider py-14 px-4 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Social icons */}
        <div className="flex gap-4 mb-6">
          {[
            { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
            { label: 'Instagram', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
            { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 00-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z M9.75 15.02l5.75-3.02-5.75-3.02v6.04z' },
          ].map((social) => (
            <a
              key={social.label}
              href="#"
              aria-label={social.label}
              className="w-9 h-9 flex items-center justify-center border border-n-divider rounded text-n-muted hover:text-n-text hover:border-n-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={social.path} />
              </svg>
            </a>
          ))}
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-8">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs text-n-muted hover:text-n-text transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Service code */}
        <button className="text-sm text-n-muted border border-n-muted/40 px-4 py-1.5 rounded hover:border-n-text hover:text-n-text transition-colors mb-6">
          Service Code
        </button>

        {/* Copyright */}
        <p className="text-xs text-n-muted">
          {settings?.footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}
