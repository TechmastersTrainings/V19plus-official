'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useRef, useState } from 'react';
import { useAdminAuthStore } from '../store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthInit({ children }: { children: React.ReactNode }) {
  const fetchMe = useAdminAuthStore((s) => s.fetchMe);
  const [initializing, setInitializing] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Only call fetchMe once, not on every re-render
    if (initialized.current) return;
    initialized.current = true;

    fetchMe().finally(() => {
      setInitializing(false);
    });
  }, [fetchMe]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading admin…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInit>{children}</AuthInit>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#e5e5e5',
            border: '1px solid #333',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
