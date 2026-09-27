import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface DownloadItem {
  id: string;
  title: string;
  progress: number;
  status: 'idle' | 'downloading' | 'completed' | 'failed';
  localUri: string | null;
  fileSize: number | null;
  error: string | null;
}

interface DownloadStore {
  downloads: Record<string, DownloadItem>;
  initDownloads: () => Promise<void>;
  startDownload: (id: string, title: string, url: string) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: {},

  initDownloads: async () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('v19plus_downloads');
    if (!stored) return;

    try {
      const items: Record<string, DownloadItem> = JSON.parse(stored);
      
      // If native, verify files actually exist on disk.
      if (Capacitor.isNativePlatform()) {
        const verifiedItems: Record<string, DownloadItem> = {};
        for (const [id, item] of Object.entries(items)) {
          if (item.status === 'completed' && item.localUri) {
            try {
              const filename = `downloads/${id}.mp4`;
              await Filesystem.stat({
                path: filename,
                directory: Directory.Data,
              });
              verifiedItems[id] = item;
            } catch (blockError) {
              // File is missing from disk, revert to idle
              verifiedItems[id] = {
                ...item,
                status: 'idle',
                progress: 0,
                localUri: null,
                fileSize: null,
              };
            }
          } else {
            // Keep the item status (like failed or partial)
            verifiedItems[id] = item;
          }
        }
        set({ downloads: verifiedItems });
        localStorage.setItem('v19plus_downloads', JSON.stringify(verifiedItems));
      } else {
        set({ downloads: items });
      }
    } catch (err) {
      console.error('Failed to parse stored downloads:', err);
    }
  },

  startDownload: async (id, title, url) => {
    // Only proceed on native platforms, mock on web
    if (!Capacitor.isNativePlatform()) {
      set((state) => {
        const updated: Record<string, DownloadItem> = {
          ...state.downloads,
          [id]: { id, title, progress: 0, status: 'downloading', localUri: null, fileSize: null, error: null }
        };
        return { downloads: updated };
      });

      // Simulate download progress on web for demonstration
      for (let p = 10; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 300));
        set((state) => {
          const item = state.downloads[id];
          if (!item) return {};
          const updated: Record<string, DownloadItem> = {
            ...state.downloads,
            [id]: { ...item, progress: p, status: p === 100 ? 'completed' : 'downloading', localUri: p === 100 ? url : null }
          };
          localStorage.setItem('v19plus_downloads', JSON.stringify(updated));
          return { downloads: updated };
        });
      }
      return;
    }

    try {
      // 1. Create downloads folder if missing
      try {
        await Filesystem.mkdir({
          path: 'downloads',
          directory: Directory.Data,
          recursive: true,
        });
      } catch (e) {
        // Directory may already exist
      }

      set((state) => {
        const updated: Record<string, DownloadItem> = {
          ...state.downloads,
          [id]: { id, title, progress: 0, status: 'downloading', localUri: null, fileSize: null, error: null }
        };
        localStorage.setItem('v19plus_downloads', JSON.stringify(updated));
        return { downloads: updated };
      });

      // 2. Setup progress listener
      const progressListener = await Filesystem.addListener('progress', (progress) => {
        if (progress.url === url) {
          const percent = progress.contentLength > 0 
            ? Math.round((progress.bytes / progress.contentLength) * 100) 
            : 0;
          
          set((state) => {
            const item = state.downloads[id];
            if (!item || item.status !== 'downloading') return {};
            const updated: Record<string, DownloadItem> = {
              ...state.downloads,
              [id]: { ...item, progress: percent }
            };
            return { downloads: updated };
          });
        }
      });

      // 3. Initiate native download
      const filename = `downloads/${id}.mp4`;
      await Filesystem.downloadFile({
        url,
        path: filename,
        directory: Directory.Data,
        progress: true,
      });

      // 4. Cleanup listener
      await progressListener.remove();

      // 5. Get native file URI
      const uriResult = await Filesystem.getUri({
        path: filename,
        directory: Directory.Data,
      });

      // Get file size
      let size: number | null = null;
      try {
        const fileStat = await Filesystem.stat({
          path: filename,
          directory: Directory.Data,
        });
        size = fileStat.size;
      } catch (e) {}

      set((state) => {
        const item = state.downloads[id];
        if (!item) return {};
        const updated: Record<string, DownloadItem> = {
          ...state.downloads,
          [id]: {
            ...item,
            status: 'completed',
            progress: 100,
            localUri: uriResult.uri,
            fileSize: size,
          }
        };
        localStorage.setItem('v19plus_downloads', JSON.stringify(updated));
        return { downloads: updated };
      });

    } catch (err: any) {
      console.error('Download failed for item:', id, err);
      set((state) => {
        const item = state.downloads[id];
        if (!item) return {};
        const updated: Record<string, DownloadItem> = {
          ...state.downloads,
          [id]: {
            ...item,
            status: 'failed',
            error: err?.message || 'Download task encountered an error.',
          }
        };
        localStorage.setItem('v19plus_downloads', JSON.stringify(updated));
        return { downloads: updated };
      });
    }
  },

  removeDownload: async (id) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const filename = `downloads/${id}.mp4`;
        await Filesystem.deleteFile({
          path: filename,
          directory: Directory.Data,
        });
      } catch (err) {
        console.error('Failed to delete physical downloaded file:', err);
      }
    }

    set((state) => {
      const updated = { ...state.downloads };
      delete updated[id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('v19plus_downloads', JSON.stringify(updated));
      }
      return { downloads: updated };
    });
  },
}));
