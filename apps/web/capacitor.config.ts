import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Live-reload the production app inside the native WebView with full
 * domain navigation, video streaming, and mixed-content support.
 */
const config: CapacitorConfig = {
  appId: 'com.v19plus.app',
  appName: 'V19Plus',
  webDir: 'public',
  backgroundColor: '#0a0a0a',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://v19plus-web--v19-plus.asia-southeast1.hosted.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'v19plus-web--v19-plus.asia-southeast1.hosted.app',
      '*.hosted.app',
      'v19plus-web.vercel.app',
      '*.vercel.app',
      'v19plus-api.onrender.com',
      '*.onrender.com',
      '*.v19plus.com',
      '*.amazonaws.com',
      '*.cloudfront.net',
      '*.google.com',
      '*.googleapis.com',
      '*.gstatic.com',
      '*.firebaseio.com',
      '*.firebasestorage.app',
      'firebasestorage.googleapis.com',
      'lh3.googleusercontent.com',
      'accounts.google.com',
      'localhost',
      '10.0.2.2',
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
