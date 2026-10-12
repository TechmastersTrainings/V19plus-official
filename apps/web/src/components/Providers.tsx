'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/authStore';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useDownloadStore } from '../store/downloadStore';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Robust class-based error boundary to catch render & hydration failures without blank screens
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught React runtime/hydration error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch (e) {}
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#080808', color: '#e5e5e5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(229,9,20,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 20, boxShadow: '0 0 25px rgba(229,9,20,0.35)' }}>
            🎬
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 8, letterSpacing: '-0.02em', textAlign: 'center' }}>
            Unable to load view
          </h2>
          <p style={{ fontSize: 13, color: '#9A9286', marginBottom: 28, textAlign: 'center', maxWidth: 440, lineHeight: 1.5 }}>
            {this.state.error?.message || 'A transient connection or rendering issue occurred while refreshing.'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{ background: 'linear-gradient(135deg, #E50914, #FF5C00)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(229,9,20,0.45)' }}
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleHardReset}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#C8C2B8', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

let socket: Socket | null = null;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInit({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated } = useAuthStore();

  // Socket.IO connection management
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socket?.disconnect();
      socket = null;
      return;
    }

    const processEnv: any = typeof process !== 'undefined' ? process.env : {};
    const socketUrl = processEnv.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      // Socket server not configured in this environment; do not attempt connection
      return;
    }

    socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    socket.on('notification', (data: { message: string }) => {
      toast(data.message, { icon: '🎬' });
    });

    socket.on('connect_error', () => {
      // Gracefully silent on dev / server asleep
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
}

function CapacitorNativeInit() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isSubscribed = true;
    const activeHandles: any[] = [];

    const initCapacitor = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!isSubscribed || !Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // 0. Dismiss native splash screen as soon as React mounts
        try {
          const splashPlugin = (window as any).Capacitor?.Plugins?.SplashScreen;
          if (splashPlugin?.hide) {
            await splashPlugin.hide();
          }
        } catch {
          // Ignore if splash plugin is not active
        }

        // 1. Back button handling
        const backHandle = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        activeHandles.push(backHandle);

        // 2. Deep linking (URL handling)
        const urlHandle = await App.addListener('appUrlOpen', (data: { url: string }) => {
          try {
            let targetPath = '';
            if (data.url.startsWith('v19plus://')) {
              targetPath = data.url.replace('v19plus://', '/');
            } else {
              const url = new URL(data.url);
              targetPath = url.pathname + url.search;
            }
            if (targetPath && isSubscribed) {
              router.push(targetPath);
            }
          } catch (e) {
            console.error('Failed to parse deep link URL:', data.url, e);
          }
        });
        activeHandles.push(urlHandle);

        // 3. Push notifications (safe initialization)
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive === 'granted') {
            await PushNotifications.register().catch((err: any) => {
              console.warn('Push registration warning (Firebase uninitialized or unavailable):', err);
            });
          }

          const pushRegHandle = await PushNotifications.addListener('registration', (token: { value: string }) => {
            console.log('Push registration success, token:', token.value);
          });
          activeHandles.push(pushRegHandle);

          const pushErrHandle = await PushNotifications.addListener('registrationError', (error: any) => {
            console.warn('Push registration error:', error);
          });
          activeHandles.push(pushErrHandle);

          const pushRecHandle = await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('Push notification received:', notification);
            toast(notification.body || notification.title || 'New Notification', { icon: '🔔' });
          });
          activeHandles.push(pushRecHandle);

          const pushActHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
            console.log('Push notification clicked:', action);
            const data = action.notification?.data;
            if (data && data.route && isSubscribed) {
              router.push(data.route);
            }
          });
          activeHandles.push(pushActHandle);
        } catch (pushErr) {
          console.warn('Push notifications setup safely skipped:', pushErr);
        }

        // If unmounted during async init, clean up immediately
        if (!isSubscribed) {
          activeHandles.forEach((h) => h.remove());
        }
      } catch (err) {
        console.error('Failed to initialize Capacitor native listeners:', err);
      }
    };

    initCapacitor();

    return () => {
      isSubscribed = false;
      activeHandles.forEach((h) => h.remove());
    };
  }, [router]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initDownloads = useDownloadStore((state: { initDownloads: () => void }) => state.initDownloads);

  useEffect(() => {
    initDownloads();
  }, [initDownloads]);

  // Auto-recover from chunk loading errors on redeploy/refresh and ensure native WebView is clean
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason || '');
      if (
        event.reason?.name === 'ChunkLoadError' ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch')
      ) {
        console.warn('[Providers] ChunkLoadError detected, performing recovery reload:', event.reason);
        const lastReload = sessionStorage.getItem('v19_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem('v19_chunk_reload', String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);

    // 2. Unregister any lingering Service Workers across Web & Capacitor to ensure clean live delivery
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          for (const registration of registrations) {
            try {
              await registration.unregister();
            } catch {}
          }
        })
        .catch(() => {});

      // One-time cleanup of stale Workbox/PWA caches belonging to this app
      if ('caches' in window) {
        try {
          const cleaned = sessionStorage.getItem('v19_sw_cleaned');
          if (!cleaned) {
            caches.keys().then((keys) => {
              const pwaKeys = keys.filter((k) => {
                const lower = k.toLowerCase();
                return (
                  lower.startsWith('workbox-') ||
                  lower.startsWith('next-') ||
                  lower.includes('v19') ||
                  lower === 'start-url' ||
                  lower === 'pages' ||
                  lower === 'pages-rsc' ||
                  lower === 'pages-rsc-prefetch' ||
                  lower === 'apis' ||
                  lower === 'cross-origin' ||
                  lower.startsWith('static-') ||
                  lower.startsWith('google-fonts-')
                );
              });
              if (pwaKeys.length > 0) {
                Promise.all(pwaKeys.map((k) => caches.delete(k))).then(() => {
                  try { sessionStorage.setItem('v19_sw_cleaned', 'true'); } catch {}
                });
              } else {
                try { sessionStorage.setItem('v19_sw_cleaned', 'true'); } catch {}
              }
            });
          }
        } catch {}
      }
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

function ClientPortalToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1A1A1A',
          color: '#F5F5F0',
          border: '1px solid #2A2A28',
        },
      }}
    />,
    document.body
  );
}

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthInit>
            <CapacitorNativeInit />
            {children}
            <ClientPortalToaster />
          </AuthInit>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
