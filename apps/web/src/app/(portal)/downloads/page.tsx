'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDownloadStore, DownloadItem } from '../../../store/downloadStore';
import { useAuthStore } from '../../../store/authStore';
import { Capacitor } from '@capacitor/core';

export default function DownloadsPage() {
  const router = useRouter();
  const { downloads, removeDownload, startDownload } = useDownloadStore();
  const { isAuthenticated } = useAuthStore();

  const downloadList: DownloadItem[] = Object.values(downloads);
  const isNative = Capacitor.isNativePlatform();

  const handlePlay = (id: string) => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/watch/${id}`)}`);
      return;
    }
    // Navigate to watch player for this content
    router.push(`/watch/${id}`);
  };

  const getReadableSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown Size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white px-6 py-24 md:px-16 animate-fade-in select-none">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">My Downloads</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your offline video library</p>
          </div>
          <Link
            href="/browse"
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md text-sm font-bold transition-all"
          >
            Find More to Download
          </Link>
        </div>

        {/* Web Simulator Warning */}
        {!isNative && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-orange-500/10 border border-orange-500/20 px-4 py-3.5 text-sm text-orange-400">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Web Simulator Mode:</strong> Native file-system downloading is active on mobile wrappers. Downloading here runs a local simulation.
            </span>
          </div>
        )}

        {/* Downloads List */}
        {downloadList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-6 pulse-animation">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No downloaded videos</h2>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6">
              You can download movies and TV episodes to watch offline when traveling or without internet connection.
            </p>
            <button
              onClick={() => router.push('/browse')}
              className="px-8 py-3 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-bold rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25"
            >
              Start Exploring
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {downloadList.map((item) => (
              <div
                key={item.id}
                className="bg-[#14110D] border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#FF5C00]/30"
              >
                {/* Info block */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-lg text-white leading-tight">
                      {item.title}
                    </span>
                    {item.status === 'completed' && (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                        Offline Ready
                      </span>
                    )}
                    {item.status === 'downloading' && (
                      <span className="bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] text-[10px] px-2 py-0.5 rounded font-black uppercase animate-pulse">
                        Downloading
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                        Failed
                      </span>
                    )}
                  </div>
                  
                  {item.status === 'downloading' ? (
                    <div className="w-full max-w-md mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Caching to secure disk...</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5C00] rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : item.status === 'completed' ? (
                    <span className="text-xs text-gray-400 block mt-1">
                      Format: MP4 Video • File Size: {getReadableSize(item.fileSize)}
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 block mt-1">
                      Error: {item.error || 'Server stream was unreachable.'}
                    </span>
                  )}
                </div>

                {/* Actions Block */}
                <div className="flex items-center gap-2">
                  {item.status === 'completed' && (
                    <button
                      onClick={() => handlePlay(item.id)}
                      className="px-5 py-2.5 bg-white hover:bg-gray-200 text-[#141414] rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play Offline
                    </button>
                  )}

                  {item.status === 'failed' && (
                    <button
                      onClick={() => startDownload(item.id, item.title, 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')} // Sample placeholder retry
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      Retry
                    </button>
                  )}

                  <button
                    onClick={() => removeDownload(item.id)}
                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors"
                    aria-label="Delete Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
