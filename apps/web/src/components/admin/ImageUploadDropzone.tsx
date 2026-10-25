'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  RefreshCw,
  CheckCircle2,
  Link as LinkIcon,
  Trash2,
  FolderUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaApi } from '../../api/media';

interface ImageUploadDropzoneProps {
  label: string;
  sublabel?: string;
  aspect: 'poster' | 'backdrop'; // 'poster' = 2:3 portrait, 'backdrop' = 16:9 landscape
  imageUrl: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  inputId: string;
  disabled?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  sublabel,
  aspect,
  imageUrl,
  onImageUploaded,
  onImageRemoved,
  inputId,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);

  const isPoster = aspect === 'poster';

  const processFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Image size exceeds 25MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const res = await mediaApi.uploadDirectFile(file, (pct) => {
        setUploadProgress(pct);
      });

      const permanentUrl = res.data.stream_url;
      onImageUploaded(permanentUrl);
      toast.success(`${isPoster ? 'Thumbnail poster' : 'Backdrop'} uploaded to Cloudflare R2!`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      toast.error(`Image upload failed: ${msg}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
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

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const triggerFileSelect = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-white/95">
            {label}
          </label>
          {sublabel && <p className="text-xs text-[#A8A095] mt-0.5">{sublabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-[#A8A095] border border-white/10 uppercase tracking-wider">
            {isPoster ? '2:3 Poster' : '16:9 Hero'}
          </span>
        </div>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id={inputId}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload / Preview Area */}
      {imageUrl ? (
        /* Image Preview State */
        <div className="space-y-2.5">
          <div
            className={`relative rounded-2xl overflow-hidden bg-[#1A1613] border border-white/15 group shadow-xl ${
              isPoster ? 'aspect-[2/3] max-w-[200px] sm:max-w-[220px]' : 'aspect-[16/9] w-full max-w-lg'
            }`}
          >
            {/* The Image */}
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            {/* Cloudflare R2 Active Badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>R2 Active</span>
            </div>

            {/* Actions Overlay (Hover on Desktop, Always Accessible) */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-3">
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={disabled || isUploading}
                className="w-full max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF6B1A] text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Replace Image</span>
              </button>

              <button
                type="button"
                onClick={onImageRemoved}
                disabled={disabled || isUploading}
                className="w-full max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar below preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#A8A095]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerFileSelect}
                className="text-[#FF8A00] hover:text-[#FFA033] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Upload New File</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={onImageRemoved}
                className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors"
              >
                Remove
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              className="text-[#8C8478] hover:text-[#D4CDC5] text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showManualUrl ? 'Hide URL' : 'View CDN URL'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Dropzone State */
        <div
          onClick={triggerFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#FF5C00] bg-[#FF5C00]/10 scale-[1.01]'
              : 'border-white/20 hover:border-[#FF5C00]/70 bg-[#1A1613]/50 hover:bg-[#1A1613]'
          } ${isUploading ? 'pointer-events-none' : ''}`}
        >
          {isUploading ? (
            /* Uploading Progress Spinner */
            <div className="py-4 flex flex-col items-center justify-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#FF5C00] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Uploading directly to Cloudflare R2...</p>
                <p className="text-xs text-[#A8A095] mt-1">
                  {uploadProgress > 0 ? `${uploadProgress}% uploaded` : 'Connecting to storage...'}
                </p>
              </div>
            </div>
          ) : (
            /* Idle Dropzone Call to Action */
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5C00] group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Click to choose image or drag & drop here
                </p>
                <p className="text-xs text-[#8C8478] mt-1">
                  PNG, JPG, WebP up to 25MB • Direct upload to Cloudflare R2 CDN
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-[#C8C2B8]">
                <ImageIcon className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span>
                  {isPoster
                    ? 'Recommended: 2:3 Portrait (e.g. 600×900px)'
                    : 'Recommended: 16:9 Landscape (e.g. 1920×1080px)'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Manual URL Accordion (Always Available for Manual Paste/Override) */}
      {(!imageUrl || showManualUrl) && (
        <div className="pt-1">
          {!showManualUrl && !imageUrl ? (
            <button
              type="button"
              onClick={() => setShowManualUrl(true)}
              className="text-[11px] text-[#8C8478] hover:text-[#C8C2B8] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <LinkIcon className="w-3 h-3" />
              <span>Or paste image URL directly</span>
            </button>
          ) : (
            <div className="bg-[#120F0D] border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#8C8478] shrink-0" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => onImageUploaded(e.target.value)}
                placeholder="https://... or paste external CDN URL"
                className="w-full bg-transparent text-xs text-white placeholder-[#8E8679] outline-none"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={onImageRemoved}
                  title="Clear URL"
                  className="p-1 rounded text-[#8C8478] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
