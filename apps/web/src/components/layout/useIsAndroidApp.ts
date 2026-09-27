'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

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
