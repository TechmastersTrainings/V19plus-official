'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useAuthStore } from '../store/authStore';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useDownloadStore } from '../store/downloadStore';

// Top-level error boundary to prevent blank white screen on JS errors
function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('Unhandled window error:', event.error);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' }}>{errorMessage || 'An error occurred'}</p>
        <button
          onClick={() => { setHasError(false); setErrorMessage(''); window.location.reload(); }}
          style={{ background: '#FF5C00', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
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

    const getSocketUrl = () => {
      const processEnv: any = typeof process !== 'undefined' ? process.env : {};
      if (processEnv.NEXT_PUBLIC_SOCKET_URL) return processEnv.NEXT_PUBLIC_SOCKET_URL;
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
      if (isNative || processEnv.NODE_ENV === 'production') {
        return 'https://v19plus-api.onrender.com';
      }
      return 'http://localhost:4000';
    };

    const socketUrl = getSocketUrl();
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

        // 3. Push notifications
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }

        const pushRegHandle = await PushNotifications.addListener('registration', (token: { value: string }) => {
          console.log('Push registration success, token:', token.value);
        });
        activeHandles.push(pushRegHandle);

        const pushErrHandle = await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Push registration error:', error);
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

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthInit>
            <CapacitorNativeInit />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1A1A1A',
                  color: '#F5F5F0',
                  border: '1px solid #2A2A28',
                },
              }}
            />
          </AuthInit>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
