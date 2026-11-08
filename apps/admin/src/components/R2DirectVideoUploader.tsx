'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { adminApi } from '../api/admin';
import {
  UploadCloud,
  FileVideo,
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface R2DirectVideoUploaderProps {
  contentId?: string;
  episodeId?: string;
  onUploadComplete?: (jobId: string, storageKey: string) => Promise<void> | void;
  label?: string;
}

const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB
const MAX_CONCURRENT_UPLOADS = 3;

type UploadState =
  | 'idle'
  | 'initiating'
  | 'uploading'
  | 'paused'
  | 'waiting_network'
  | 'completing'
  | 'success'
  | 'error';

export function R2DirectVideoUploader({
  contentId,
  episodeId,
  onUploadComplete,
  label = 'Master Source Video (20GB - 100GB+ Direct to Cloudflare R2)',
}: R2DirectVideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [bytesTransferred, setBytesTransferred] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isPausedRef = useRef<boolean>(false);
  const isWaitingNetworkRef = useRef<boolean>(false);
  const isRunningWorkersRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSessionRef = useRef<{ upload_id: string; key: string; total_parts: number } | null>(null);
  const isCompletedRef = useRef<boolean>(false);
  const completedPartsRef = useRef<Map<number, string>>(new Map());
  const partQueueRef = useRef<number[]>([]);
  const presignedMapRef = useRef<Map<number, string>>(new Map());
  const bytesTransferredRef = useRef<number>(0);
  const networkPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Probe server connectivity to ensure real connection (handles captive portals & Wi-Fi IP reassignment)
  const checkInternetConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const res = await fetch(`/api/health?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    }
  }, []);

  // Helper to fetch or refresh presigned part URL on demand
  const getPartUrl = useCallback(
    async (uploadId: string, key: string, partNum: number, forceRefresh = false): Promise<string> => {
      if (!forceRefresh && presignedMapRef.current.has(partNum)) {
        return presignedMapRef.current.get(partNum)!;
      }
      const res = await api.get('/media/upload/part-url', {
        params: { upload_id: uploadId, key, part_number: partNum },
      });
      presignedMapRef.current.set(partNum, res.data.url);
      return res.data.url;
    },
    []
  );

  // Transition to waiting_network mode without aborting or losing uploaded parts
  const handleNetworkLoss = useCallback(
    (reason = 'Network disconnect or Wi-Fi change detected') => {
      if (isCompletedRef.current || !activeSessionRef.current) return;
      if (isPausedRef.current) return;
      if (isWaitingNetworkRef.current) return;

      isWaitingNetworkRef.current = true;
      setUploadState('waiting_network');

      toast('Internet connection lost / Wi-Fi changed. Upload auto-paused.', {
        icon: '⚠️',
        id: 'network-disconnect-toast',
        duration: 6000,
      });

      // Start background poll to detect when Wi-Fi / Internet restores
      if (!networkPollIntervalRef.current) {
        networkPollIntervalRef.current = setInterval(async () => {
          const isOnline = await checkInternetConnectivity();
          if (isOnline) {
            handleNetworkRestored();
          }
        }, 2500);
      }
    },
    [checkInternetConnectivity]
  );

  // Automatically or manually resume when network is verified back online
  const handleNetworkRestored = useCallback(async () => {
    if (networkPollIntervalRef.current) {
      clearInterval(networkPollIntervalRef.current);
      networkPollIntervalRef.current = null;
    }

    if (!isWaitingNetworkRef.current) return;

    const isOnline = await checkInternetConnectivity();
    if (!isOnline) {
      return;
    }

    isWaitingNetworkRef.current = false;
    setUploadState('uploading');
    toast.success('Internet connection restored! Resuming upload...', {
      id: 'network-disconnect-toast',
    });

    resumeWorkers();
  }, [checkInternetConnectivity]);

  // Clean up beacon on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isCompletedRef.current && activeSessionRef.current) {
        const { upload_id, key } = activeSessionRef.current;
        try {
          const payload = JSON.stringify({ upload_id, key, reason: 'Admin closed browser tab' });
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/media/upload/abort', blob);
          } else {
            fetch('/api/media/upload/abort', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
            });
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Listen to browser online / offline events
  useEffect(() => {
    const handleOnline = async () => {
      if (isWaitingNetworkRef.current) {
        await handleNetworkRestored();
      }
    };

    const handleOffline = () => {
      if (activeSessionRef.current && !isCompletedRef.current && !isPausedRef.current) {
        handleNetworkLoss('Offline event triggered');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (networkPollIntervalRef.current) {
        clearInterval(networkPollIntervalRef.current);
        networkPollIntervalRef.current = null;
      }
    };
  }, [handleNetworkLoss, handleNetworkRestored]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (!file.type.includes('video') && !file.name.match(/\.(mp4|mkv|mov|avi|ts|m4v)$/i)) {
      toast.error('Please select a valid video file (MP4, MKV, MOV, etc.)');
      return;
    }
    setSelectedFile(file);
    setTotalBytes(file.size);
    setProgress(0);
    setBytesTransferred(0);
    setUploadSpeed(0);
    setTimeRemaining(null);
    setUploadState('idle');
    setErrorMessage('');
    activeSessionRef.current = null;
    completedPartsRef.current.clear();
    partQueueRef.current = [];
    presignedMapRef.current.clear();
    bytesTransferredRef.current = 0;
    isPausedRef.current = false;
    isWaitingNetworkRef.current = false;
    isCompletedRef.current = false;
  };

  const uploadChunkWithRetry = async (
    file: File,
    partNumber: number,
    initialUrl: string,
    uploadId: string,
    key: string,
    onChunkProgress: (loadedDiff: number) => void,
    retries = 5
  ): Promise<string> => {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    let currentUrl = initialUrl;
    let attempt = 1;

    while (attempt <= retries) {
      if (isPausedRef.current) {
        throw new Error('Upload paused');
      }

      while (isWaitingNetworkRef.current && !isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (isPausedRef.current) throw new Error('Upload paused');

      try {
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', currentUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          let lastLoaded = 0;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const diff = e.loaded - lastLoaded;
              lastLoaded = e.loaded;
              onChunkProgress(diff);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const resEtag = xhr.getResponseHeader('ETag') || '';
              if (resEtag) {
                resolve(resEtag.replace(/"/g, ''));
              } else {
                reject(new Error('ETag header not exposed by R2 CORS'));
              }
            } else if (xhr.status === 403 || xhr.status === 401) {
              // Presigned URL may have expired during network switch/disconnect
              reject(new Error(`URL_EXPIRED_${xhr.status}`));
            } else {
              reject(new Error(`Part ${partNumber} upload failed with HTTP ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
          xhr.onabort = () => reject(new Error('Upload aborted'));

          xhr.send(chunk);
        });

        return etag;
      } catch (err: any) {
        if (isPausedRef.current) throw err;

        const isNetworkError =
          err?.message === 'NETWORK_ERROR' ||
          err?.message === 'Failed to fetch' ||
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          /network|timeout|offline|failed to fetch/i.test(err?.message || '');

        if (isNetworkError) {
          handleNetworkLoss('Network error on chunk PUT');
          while (isWaitingNetworkRef.current && !isPausedRef.current) {
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (isPausedRef.current) throw new Error('Upload paused');

          // Refresh presigned URL once network is restored
          try {
            currentUrl = await getPartUrl(uploadId, key, partNumber, true);
          } catch {
            // Keep existing URL
          }
          // Do not consume a retry attempt when paused for network outage
          continue;
        }

        if (err?.message?.startsWith('URL_EXPIRED')) {
          try {
            currentUrl = await getPartUrl(uploadId, key, partNumber, true);
            continue;
          } catch {
            // Fallthrough to proxy
          }
        }

        // Resilient Fallback: If direct R2 PUT fails due to browser CORS, stream chunk via backend chunked proxy endpoint
        try {
          const formData = new FormData();
          formData.append('upload_id', uploadId);
          formData.append('key', key);
          formData.append('part_number', String(partNumber));
          formData.append('chunk', chunk, file.name);

          let lastLoaded = 0;
          const res = await api.post<{ part_number: number; etag: string }>(
            '/media/upload/chunked/part',
            formData,
            {
              timeout: 0,
              onUploadProgress: (e) => {
                if (e.total) {
                  const diff = e.loaded - lastLoaded;
                  lastLoaded = e.loaded;
                  onChunkProgress(diff);
                }
              },
            }
          );
          if (res.data?.etag) {
            return res.data.etag.replace(/"/g, '');
          }
        } catch (backendErr: any) {
          const isBackendNetErr =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            backendErr?.message === 'Network Error' ||
            backendErr?.code === 'ERR_NETWORK' ||
            /network|offline/i.test(backendErr?.message || '');

          if (isBackendNetErr) {
            handleNetworkLoss('Backend proxy network error');
            while (isWaitingNetworkRef.current && !isPausedRef.current) {
              await new Promise((r) => setTimeout(r, 1000));
            }
            if (isPausedRef.current) throw new Error('Upload paused');
            continue;
          }
          if (attempt === retries) throw backendErr;
        }

        attempt++;
        if (attempt > retries) throw err;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    throw new Error(`Failed to upload part ${partNumber} after ${retries} attempts.`);
  };

  const resumeWorkers = async () => {
    if (!selectedFile || !activeSessionRef.current) return;
    if (isPausedRef.current || isWaitingNetworkRef.current) return;
    if (isRunningWorkersRef.current) return;

    isRunningWorkersRef.current = true;
    setUploadState('uploading');

    const { upload_id, key, total_parts } = activeSessionRef.current;

    try {
      const runWorker = async () => {
        while (partQueueRef.current.length > 0 && !isPausedRef.current && !isWaitingNetworkRef.current) {
          const partNum = partQueueRef.current.shift();
          if (partNum === undefined) break;

          // Skip if already successfully completed
          if (completedPartsRef.current.has(partNum)) continue;

          let chunkLoadedBytes = 0;
          try {
            const url = await getPartUrl(upload_id, key, partNum);
            const etag = await uploadChunkWithRetry(
              selectedFile,
              partNum,
              url,
              upload_id,
              key,
              (loadedDiff) => {
                chunkLoadedBytes += loadedDiff;
                bytesTransferredRef.current += loadedDiff;
                setBytesTransferred(bytesTransferredRef.current);
                const currentPct = Math.min(
                  99,
                  Math.round((bytesTransferredRef.current / selectedFile.size) * 100)
                );
                setProgress(currentPct);

                const elapsedSecs = (Date.now() - startTimeRef.current) / 1000;
                if (elapsedSecs > 1) {
                  const speed = bytesTransferredRef.current / elapsedSecs;
                  setUploadSpeed(speed);
                  const remainingBytes = selectedFile.size - bytesTransferredRef.current;
                  setTimeRemaining(remainingBytes / speed);
                }
              }
            );

            completedPartsRef.current.set(partNum, etag);
          } catch (workerErr: any) {
            // Re-queue the uncompleted part so it can be resumed
            if (!completedPartsRef.current.has(partNum)) {
              if (chunkLoadedBytes > 0) {
                bytesTransferredRef.current = Math.max(0, bytesTransferredRef.current - chunkLoadedBytes);
                setBytesTransferred(bytesTransferredRef.current);
              }
              if (!partQueueRef.current.includes(partNum)) {
                partQueueRef.current.unshift(partNum);
              }
            }

            if (isWaitingNetworkRef.current || isPausedRef.current) {
              return;
            }
            throw workerErr;
          }
        }
      };

      const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, Math.max(1, partQueueRef.current.length));
      const workers = Array.from({ length: workerCount }, () => runWorker());
      await Promise.all(workers);

      if (isPausedRef.current || isWaitingNetworkRef.current) {
        isRunningWorkersRef.current = false;
        return;
      }

      // Check if more parts remain
      if (completedPartsRef.current.size < total_parts) {
        isRunningWorkersRef.current = false;
        if (partQueueRef.current.length > 0 && !isPausedRef.current && !isWaitingNetworkRef.current) {
          resumeWorkers();
        }
        return;
      }

      // 2. All parts uploaded! Complete Multipart Assembly in FastAPI / Cloudflare R2
      setUploadState('completing');
      const sortedParts = Array.from(completedPartsRef.current.entries())
        .sort(([a], [b]) => a - b)
        .map(([part_number, etag]) => ({ part_number, etag }));

      const completeRes = await api.post(
        '/media/upload/complete',
        {
          upload_id,
          key,
          parts: sortedParts,
          content_id: contentId || undefined,
          episode_id: episodeId || undefined,
          file_size_bytes: selectedFile.size,
        },
        { timeout: 600000 }
      );

      isCompletedRef.current = true;
      activeSessionRef.current = null;
      isRunningWorkersRef.current = false;

      setUploadState('success');
      setProgress(100);
      toast.success('Upload complete! Video is now live & streaming on V19Plus.');

      if (onUploadComplete) {
        await onUploadComplete(completeRes.data.job_id, key);
      }
    } catch (err: any) {
      isRunningWorkersRef.current = false;

      if (isWaitingNetworkRef.current || isPausedRef.current) {
        return;
      }

      // Check if error is network related
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        /network|failed to fetch|offline/i.test(err?.message || '')
      ) {
        handleNetworkLoss(err?.message);
        return;
      }

      // Only abort multipart on non-network fatal errors
      if (!isCompletedRef.current && activeSessionRef.current) {
        const session = activeSessionRef.current;
        adminApi
          .abortR2Upload({
            upload_id: session.upload_id,
            key: session.key,
            reason: err.message || 'Fatal upload error encountered',
          })
          .catch(() => {});
        activeSessionRef.current = null;
      }
      setUploadState('error');
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
      toast.error(`Upload error: ${err.message}`);
    }
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    // If an existing session is in progress (e.g. was paused or lost network), resume it
    if (activeSessionRef.current && !isCompletedRef.current) {
      isPausedRef.current = false;
      isWaitingNetworkRef.current = false;
      resumeWorkers();
      return;
    }

    setUploadState('initiating');
    isPausedRef.current = false;
    isWaitingNetworkRef.current = false;
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    try {
      // 1. Initiate Multipart Session with FastAPI
      const initRes = await api.post('/media/upload/initiate', {
        filename: selectedFile.name,
        file_size_bytes: selectedFile.size,
        content_type: selectedFile.type || 'video/mp4',
        content_id: contentId || undefined,
        episode_id: episodeId || undefined,
      });

      const { upload_id, key, total_parts, initial_parts } = initRes.data;
      activeSessionRef.current = { upload_id, key, total_parts };
      isCompletedRef.current = false;
      completedPartsRef.current.clear();
      presignedMapRef.current.clear();
      initial_parts.forEach((p: any) => presignedMapRef.current.set(p.part_number, p.url));

      partQueueRef.current = Array.from({ length: total_parts }, (_, i) => i + 1);
      bytesTransferredRef.current = 0;
      setBytesTransferred(0);
      setProgress(0);

      toast.success(`Multipart session established (${total_parts} chunks of 64MB)`);
      resumeWorkers();
    } catch (err: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        /network|failed to fetch|offline/i.test(err?.message || '')
      ) {
        handleNetworkLoss('Initial network drop');
        return;
      }
      setUploadState('error');
      setErrorMessage(err.message || 'Failed to initiate multipart upload.');
      toast.error(`Initiation error: ${err.message}`);
    }
  };

  const togglePause = () => {
    if (uploadState === 'uploading') {
      isPausedRef.current = true;
      setUploadState('paused');
      toast('Upload paused.');
    } else if (uploadState === 'paused' || uploadState === 'waiting_network') {
      isPausedRef.current = false;
      isWaitingNetworkRef.current = false;
      setUploadState('uploading');
      resumeWorkers();
    }
  };

  const handleManualResume = async () => {
    toast('Checking connection...', { id: 'network-check' });
    const online = await checkInternetConnectivity();
    if (online) {
      await handleNetworkRestored();
    } else {
      toast.error('Unable to reach server. Please check Wi-Fi / Internet connection.', { id: 'network-check' });
    }
  };

  const resetUpload = () => {
    isPausedRef.current = true;
    isWaitingNetworkRef.current = false;
    if (networkPollIntervalRef.current) {
      clearInterval(networkPollIntervalRef.current);
      networkPollIntervalRef.current = null;
    }
    if (!isCompletedRef.current && activeSessionRef.current) {
      const session = activeSessionRef.current;
      adminApi
        .abortR2Upload({
          upload_id: session.upload_id,
          key: session.key,
          reason: 'User cancelled/reset upload',
        })
        .catch(() => {});
      activeSessionRef.current = null;
    }
    completedPartsRef.current.clear();
    partQueueRef.current = [];
    presignedMapRef.current.clear();
    bytesTransferredRef.current = 0;
    setSelectedFile(null);
    setProgress(0);
    setBytesTransferred(0);
    setUploadSpeed(0);
    setTimeRemaining(null);
    setUploadState('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">{label}</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Direct multipart upload to Cloudflare R2 (64MB chunking, auto-resumes across Wi-Fi & network changes)
          </p>
        </div>
        {uploadState === 'success' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded to R2
          </span>
        )}
      </div>

      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging ? 'border-red-500 bg-red-950/20' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv,.mov,.ts"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
          <UploadCloud className="w-10 h-10 text-neutral-400 mb-3" />
          <p className="text-sm font-medium text-neutral-200">
            Drag & drop 20GB+ master video, or <span className="text-red-500 hover:underline">browse</span>
          </p>
          <p className="text-xs text-neutral-500 mt-1">Supports MP4, MOV, MKV, ProRes masters (up to 100GB+)</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/80 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileVideo className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-medium text-neutral-200 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {formatSize(bytesTransferred)} of {formatSize(totalBytes)}
                  {uploadSpeed > 0 && uploadState === 'uploading' && ` • ${(uploadSpeed / (1024 * 1024)).toFixed(1)} MB/s`}
                  {timeRemaining !== null && uploadState === 'uploading' && ` • ~${Math.round(timeRemaining)}s remaining`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {uploadState === 'idle' && (
                <button
                  onClick={startUpload}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Start Upload
                </button>
              )}

              {uploadState === 'waiting_network' && (
                <button
                  onClick={handleManualResume}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resume Now
                </button>
              )}

              {(uploadState === 'uploading' || uploadState === 'paused') && (
                <button
                  onClick={togglePause}
                  className="p-1.5 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
                >
                  {uploadState === 'uploading' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={resetUpload}
                disabled={uploadState === 'completing'}
                className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Network Interruption & Wi-Fi Change Auto-Pause Banner */}
          {uploadState === 'waiting_network' && (
            <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 animate-pulse">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-200">Internet connection lost or Wi-Fi changed</p>
                  <p className="text-[11px] text-amber-400/90 mt-0.5">
                    Upload auto-paused without losing any chunks. Will resume automatically once connected...
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualResume}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Now
              </button>
            </div>
          )}

          {uploadState !== 'idle' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>
                  {uploadState === 'initiating' && 'Negotiating multipart session...'}
                  {uploadState === 'uploading' && `Uploading to Cloudflare R2 (${progress}%)`}
                  {uploadState === 'paused' && 'Upload paused'}
                  {uploadState === 'waiting_network' && `Network disconnected — auto-paused (${progress}%)`}
                  {uploadState === 'completing' && 'Finalizing upload...'}
                  {uploadState === 'success' && 'Live & Streaming on V19Plus'}
                  {uploadState === 'error' && 'Upload failed'}
                </span>
                <span className="font-mono text-neutral-300">{progress}%</span>
              </div>

              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadState === 'error'
                      ? 'bg-red-600'
                      : uploadState === 'success'
                      ? 'bg-emerald-500'
                      : uploadState === 'waiting_network'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
