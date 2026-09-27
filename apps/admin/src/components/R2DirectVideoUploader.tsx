'use client';

import React, { useState, useRef } from 'react';
import api from '../api/axios';
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

export function R2DirectVideoUploader({
  contentId,
  episodeId,
  onUploadComplete,
  label = 'Master Source Video (20GB - 100GB+ Direct to Cloudflare R2)',
}: R2DirectVideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadState, setUploadState] = useState<'idle' | 'initiating' | 'uploading' | 'paused' | 'completing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [bytesTransferred, setBytesTransferred] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isPausedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setUploadState('idle');
    setErrorMessage('');
  };

  const uploadChunkWithRetry = async (
    file: File,
    partNumber: number,
    url: string,
    onChunkProgress: (loadedDiff: number) => void,
    retries = 3
  ): Promise<string> => {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    for (let attempt = 1; attempt <= retries; attempt++) {
      if (isPausedRef.current) {
        throw new Error('Upload paused');
      }

      try {
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
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
              resolve(resEtag.replace(/"/g, ''));
            } else {
              reject(new Error(`Part ${partNumber} upload failed with HTTP ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error uploading part ${partNumber}`));
          xhr.onabort = () => reject(new Error('Upload aborted'));

          xhr.send(chunk);
        });

        return etag;
      } catch (err: any) {
        if (isPausedRef.current) throw err;
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    throw new Error(`Failed to upload part ${partNumber} after ${retries} attempts.`);
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setUploadState('initiating');
    isPausedRef.current = false;
    abortControllerRef.current = new AbortController();

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

      setUploadState('uploading');
      toast.success(`Multipart session established (${total_parts} chunks of 64MB)`);

      const presignedMap = new Map<number, string>();
      initial_parts.forEach((p: any) => presignedMap.set(p.part_number, p.url));

      // Helper to fetch part URL on demand if not pre-cached
      const getPartUrl = async (partNum: number): Promise<string> => {
        if (presignedMap.has(partNum)) return presignedMap.get(partNum)!;
        const res = await api.get('/media/upload/part-url', {
          params: { upload_id, key, part_number: partNum },
        });
        presignedMap.set(partNum, res.data.url);
        return res.data.url;
      };

      const completedParts: { part_number: number; etag: string }[] = [];
      let totalTransferred = 0;
      let startTime = Date.now();

      // Chunk worker pool for parallel execution
      const partQueue = Array.from({ length: total_parts }, (_, i) => i + 1);

      const worker = async () => {
        while (partQueue.length > 0 && !isPausedRef.current) {
          const partNum = partQueue.shift()!;
          const url = await getPartUrl(partNum);

          const etag = await uploadChunkWithRetry(
            selectedFile,
            partNum,
            url,
            (loadedDiff) => {
              totalTransferred += loadedDiff;
              setBytesTransferred(totalTransferred);
              const currentPct = Math.min(99, Math.round((totalTransferred / selectedFile.size) * 100));
              setProgress(currentPct);

              // Calculate speed & ETA
              const elapsedSecs = (Date.now() - startTime) / 1000;
              if (elapsedSecs > 1) {
                const speed = totalTransferred / elapsedSecs; // B/s
                setUploadSpeed(speed);
                const remainingBytes = selectedFile.size - totalTransferred;
                setTimeRemaining(remainingBytes / speed);
              }
            }
          );

          completedParts.push({ part_number: partNum, etag });
        }
      };

      // Launch concurrent workers
      const workers = Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, total_parts) }, () => worker());
      await Promise.all(workers);

      if (isPausedRef.current) {
        setUploadState('paused');
        return;
      }

      // 2. Complete Multipart Assembly in FastAPI / Cloudflare R2
      setUploadState('completing');
      const completeRes = await api.post('/media/upload/complete', {
        upload_id,
        key,
        parts: completedParts,
        content_id: contentId || undefined,
        episode_id: episodeId || undefined,
        file_size_bytes: selectedFile.size,
      });

      setUploadState('success');
      setProgress(100);
      toast.success('Upload complete! Video processing enqueued on Render Worker.');

      if (onUploadComplete) {
        await onUploadComplete(completeRes.data.job_id, key);
      }
    } catch (err: any) {
      if (!isPausedRef.current) {
        setUploadState('error');
        setErrorMessage(err.message || 'An unexpected error occurred during upload.');
        toast.error(`Upload error: ${err.message}`);
      }
    }
  };

  const togglePause = () => {
    if (uploadState === 'uploading') {
      isPausedRef.current = true;
      setUploadState('paused');
      toast('Upload paused.');
    } else if (uploadState === 'paused') {
      isPausedRef.current = false;
      setUploadState('uploading');
      startUpload();
    }
  };

  const resetUpload = () => {
    isPausedRef.current = true;
    setSelectedFile(null);
    setProgress(0);
    setBytesTransferred(0);
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
            Direct multipart upload to Cloudflare R2 (64MB chunking, zero backend memory overhead)
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
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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

          {uploadState !== 'idle' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>
                  {uploadState === 'initiating' && 'Negotiating multipart session...'}
                  {uploadState === 'uploading' && `Uploading to Cloudflare R2 (${progress}%)`}
                  {uploadState === 'paused' && 'Upload paused'}
                  {uploadState === 'completing' && 'Validating & queuing transcoding job...'}
                  {uploadState === 'success' && 'Ready for transcoding pipeline'}
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
