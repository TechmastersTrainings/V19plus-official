'use client';

import React, { useState, useRef } from 'react';
import * as tus from 'tus-js-client';
import { adminApi } from '../api/admin';
import {
  UploadCloud,
  FileVideo,
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  Loader2,
  Tv,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BunnyVideoUploaderProps {
  contentId: string;
  episodeId?: string;
  onUploadComplete: (bunnyVideoGuid: string, playbackUrl: string) => Promise<void>;
  currentVideoUrl?: string;
  status?: string;
  label?: string;
}

export function BunnyVideoUploader({
  contentId,
  episodeId,
  onUploadComplete,
  currentVideoUrl,
  status,
  label = 'Source Video File (Up to 100GB via Bunny Stream TUS Direct Upload)',
}: BunnyVideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload progress states
  const [tusUpload, setTusUpload] = useState<tus.Upload | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'creating' | 'uploading' | 'paused' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [bytesTransferred, setBytesTransferred] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const lastBytesRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec > 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
    }
    return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
  };

  const formatEta = (seconds: number | null) => {
    if (seconds === null || !isFinite(seconds) || seconds < 0) return 'Calculating...';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s remaining`;
    if (m > 0) return `${m}m ${s}s remaining`;
    return `${s}s remaining`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndStartUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndStartUpload(file);
    }
  };

  const validateAndStartUpload = (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|ts|webm|m4v)$/i.test(file.name);
    if (!isVideo) {
      toast.error('Invalid file type. Please select a video file (MP4, MKV, MOV, AVI, etc.).');
      return;
    }

    const maxSizeBytes = 100 * 1024 * 1024 * 1024; // 100GB
    if (file.size > maxSizeBytes) {
      toast.error('File size exceeds the 100GB limit.');
      return;
    }

    setSelectedFile(file);
    initiateBunnyUpload(file);
  };

  const initiateBunnyUpload = async (file: File) => {
    try {
      setUploadState('creating');
      setProgress(0);
      setBytesTransferred(0);
      setTotalBytes(file.size);
      setErrorMessage('');
      lastBytesRef.current = 0;
      lastTimeRef.current = Date.now();

      // 1. Create Bunny Video entry via backend
      const res = await adminApi.createBunnyVideo({
        title: file.name,
        contentId,
        episodeId,
      });

      const { videoGuid, libraryId, signature, expirationTime, tusEndpoint } = res.data;

      // 2. Initialize TUS Resumable Direct Upload to Bunny Stream
      const upload = new tus.Upload(file, {
        endpoint: tusEndpoint || 'https://video.bunnycdn.com/tusupload',
        retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: String(expirationTime),
          VideoId: videoGuid,
          LibraryId: String(libraryId),
        },
        metadata: {
          filename: file.name,
          filetype: file.type || 'video/mp4',
        },
        onError: (error) => {
          console.error('Bunny Stream TUS Upload Error:', error);
          setUploadState('error');
          setErrorMessage(error.message || 'TUS upload failed due to network disruption.');
          toast.error(`Bunny Stream upload error: ${error.message}`);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;
          setProgress(pct);
          setBytesTransferred(bytesUploaded);
          setTotalBytes(bytesTotal);

          const now = Date.now();
          const timeDiff = (now - lastTimeRef.current) / 1000;
          if (timeDiff >= 0.5) {
            const bytesDiff = bytesUploaded - lastBytesRef.current;
            const speedInBytesPerSec = bytesDiff / timeDiff;
            setUploadSpeed(speedInBytesPerSec);

            if (speedInBytesPerSec > 0) {
              const remainingBytes = bytesTotal - bytesUploaded;
              setTimeRemaining(Math.round(remainingBytes / speedInBytesPerSec));
            }
            lastBytesRef.current = bytesUploaded;
            lastTimeRef.current = now;
          }
        },
        onSuccess: async () => {
          setUploadState('success');
          setProgress(100);
          toast.success('🎉 Direct TUS Upload to Bunny Stream complete! Video transcoding initiated on Bunny CDN.');

          const cdnHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST || 'vz-5385b21b-c9e.b-cdn.net';
          const playbackUrl = `https://${cdnHost}/play/${libraryId}/${videoGuid}`;

          await onUploadComplete(videoGuid, playbackUrl);
        },
      });

      setTusUpload(upload);
      setUploadState('uploading');

      // Start TUS Resumable Upload directly from browser to Bunny CDN
      upload.start();
    } catch (err: any) {
      console.error('Failed to create Bunny video:', err);
      setUploadState('error');
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to initialize upload session.');
      toast.error('Failed to start Bunny Stream upload.');
    }
  };

  const handlePause = () => {
    if (tusUpload) {
      tusUpload.abort();
      setUploadState('paused');
      toast.success('Upload paused.');
    }
  };

  const handleResume = () => {
    if (tusUpload) {
      setUploadState('uploading');
      lastTimeRef.current = Date.now();
      tusUpload.start();
      toast.success('Resuming TUS upload to Bunny Stream...');
    }
  };

  const handleCancel = () => {
    if (tusUpload) {
      tusUpload.abort();
    }
    setUploadState('idle');
    setSelectedFile(null);
    setProgress(0);
    setTusUpload(null);
    toast('Upload cancelled.');
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase text-gray-400 tracking-wider">
          {label}
        </label>
        {status && (
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
              status === 'ready'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : status === 'processing'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'ready' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            <span>BUNNY STATUS: {status.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* 1. Drag and Drop Zone (Idle State) */}
      {uploadState === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#FF5C00] bg-[#FF5C00]/10 scale-[1.01]'
              : 'border-[#333] hover:border-[#FF5C00]/50 bg-[#0c0c0c] hover:bg-[#121212]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-bold text-white mb-1">
                Drag & drop video file here or <span className="text-[#FF5C00] underline">browse</span>
              </p>
              <p className="text-xs text-gray-400">
                Direct TUS Resumable Upload to Bunny Stream CDN &bull; Supports files up to 100GB
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Automatic multi-resolution HLS transcoding (240p, 480p, 720p, 1080p, 4K)
              </p>
            </div>

            {currentVideoUrl && (
              <div className="mt-2 text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-1.5 truncate max-w-full flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Active Bunny Stream: {currentVideoUrl}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Uploading / Paused / Success / Error Card */}
      {uploadState !== 'idle' && (
        <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-5 space-y-4 shadow-xl">
          {/* File Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] shrink-0">
                {uploadState === 'creating' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#FF5C00]" />
                ) : (
                  <FileVideo className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {selectedFile?.name || 'Video File'}
                </p>
                <p className="text-xs text-gray-400">
                  {uploadState === 'creating'
                    ? 'Initializing Bunny Stream TUS Session...'
                    : `${formatSize(bytesTransferred)} of ${formatSize(totalBytes)}`}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {uploadState === 'uploading' && (
                <button
                  type="button"
                  onClick={handlePause}
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
                >
                  <Pause className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Pause</span>
                </button>
              )}

              {uploadState === 'paused' && (
                <button
                  type="button"
                  onClick={handleResume}
                  className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-[#FF5C00]/20"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Resume</span>
                </button>
              )}

              {(uploadState === 'uploading' || uploadState === 'paused') && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                  title="Cancel Upload"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="relative w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  uploadState === 'success'
                    ? 'bg-emerald-500'
                    : uploadState === 'paused'
                    ? 'bg-yellow-500'
                    : uploadState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-[#FF5C00] to-orange-400 animate-pulse'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span className="font-bold text-white">{progress.toFixed(1)}%</span>
              {uploadState === 'uploading' && (
                <div className="flex items-center gap-3">
                  <span className="text-[#FF5C00] font-semibold">{formatSpeed(uploadSpeed)}</span>
                  <span>&bull;</span>
                  <span>{formatEta(timeRemaining)}</span>
                </div>
              )}
              {uploadState === 'paused' && (
                <span className="text-yellow-400 font-semibold">TUS Upload Paused &bull; Network drop resilient</span>
              )}
              {uploadState === 'success' && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Direct Bunny Stream Upload Complete
                </span>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {uploadState === 'error' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage || 'Upload encountered an error.'}</span>
              <button
                type="button"
                onClick={() => selectedFile && initiateBunnyUpload(selectedFile)}
                className="ml-auto underline font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {uploadState === 'success' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>Bunny CDN Transcoding ABR Renditions in background.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadState('idle');
                  setSelectedFile(null);
                }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-semibold transition-colors"
              >
                Upload Another Video
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
