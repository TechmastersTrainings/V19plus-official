'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  RefreshCw,
  Users,
  Ticket,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAdminApi, CheckInResponse } from '../../../../api/eventsAdmin';

export default function AdminGateScannerPage() {
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState<string>('');
  const [lastResult, setLastResult] = useState<CheckInResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<CheckInResponse[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play audio chime using Web Audio API
  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.setValueAtTime(120, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context may be restricted by autoplay policy
    }
  };

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await eventsAdminApi.checkIn({
        qr_token: token.trim(),
        device_info: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'admin-scanner',
      });
      return res.data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setScanHistory((prev) => [data, ...prev.slice(0, 19)]);

      if (data.success) {
        playSound('success');
      } else {
        playSound('error');
      }

      setTokenInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    onError: (err: any) => {
      playSound('error');
      const errRes: CheckInResponse = {
        success: false,
        result_code: 'ERROR',
        message: err.response?.data?.detail || 'Network or authorization error during scan.',
      };
      setLastResult(errRes);
      setTokenInput('');
    },
  });

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    checkInMutation.mutate(tokenInput.trim());
  };

  // Live BarcodeDetector or Camera integration
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    if (cameraActive && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }

          // Check for native BarcodeDetector API (Chrome, Android, Edge)
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const scanFrame = async () => {
              if (videoRef.current && videoRef.current.readyState === 4) {
                try {
                  const codes = await detector.detect(videoRef.current);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    const raw = codes[0].rawValue;
                    checkInMutation.mutate(raw);
                    // brief delay to avoid rapid re-scans of same code
                    await new Promise((r) => setTimeout(r, 1500));
                  }
                } catch {}
              }
              animId = requestAnimationFrame(scanFrame);
            };
            animId = requestAnimationFrame(scanFrame);
          }
        })
        .catch((err) => {
          toast.error('Unable to access camera. Please use manual scanner input.');
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [cameraActive]);

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#FF5C00] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Live Entry Gate Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gate Check-In & QR Scanner
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time barcode scanner, optical camera scanning, and instant duplicate-entry prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-white/10 border-white/20 text-emerald-400'
                : 'bg-white/5 border-white/5 text-gray-400'
            }`}
            title={soundEnabled ? 'Mute Audio Chime' : 'Enable Audio Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setCameraActive(!cameraActive)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              cameraActive
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-[#FF5C00] hover:bg-[#FF8A00] text-white shadow-lg shadow-[#FF5C00]/25'
            }`}
          >
            <Camera className="w-4 h-4" />
            {cameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Camera Feed or Input Form */}
        <div className="space-y-4">
          {cameraActive ? (
            <div className="relative aspect-square max-h-[360px] bg-black rounded-3xl overflow-hidden border-2 border-[#FF5C00]/50 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-[#FF5C00]/60 rounded-3xl pointer-events-none m-8 animate-pulse" />
              <div className="absolute bottom-4 left-4 right-4 text-center bg-black/60 backdrop-blur-md rounded-xl py-1.5 text-xs text-gray-300">
                Point camera at attendee digital pass QR code
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#FF5C00]">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Handheld Scanner / Input Ready</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Scan using a USB/Bluetooth barcode reader or paste the cryptographic token below.
              </p>
            </div>
          )}

          {/* Rapid Token Input Form */}
          <form onSubmit={handleManualScan} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Scan or enter QR token..."
              className="flex-1 bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#FF5C00]"
            />
            <button
              type="submit"
              disabled={checkInMutation.isPending || !tokenInput.trim()}
              className="px-6 py-3 rounded-xl bg-[#FF5C00] hover:bg-[#FF8A00] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-colors cursor-pointer"
            >
              Verify Pass
            </button>
          </form>
        </div>

        {/* Right Column: Scan Result Feedback Card */}
        <div>
          <AnimatePresence mode="wait">
            {lastResult ? (
              <motion.div
                key={lastResult.result_code + (lastResult.ticket_number || '')}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`h-full min-h-[300px] rounded-3xl p-7 flex flex-col justify-between border-2 shadow-2xl ${
                  lastResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/10'
                    : lastResult.result_code === 'ALREADY_CHECKED_IN'
                    ? 'bg-rose-950/40 border-rose-500/80 shadow-rose-500/20'
                    : 'bg-amber-950/30 border-amber-500/60 shadow-amber-500/10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {lastResult.success ? (
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/40 animate-bounce">
                        <XCircle className="w-8 h-8" />
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-gray-400">
                        SCANNER RESULT
                      </span>
                      <h2
                        className={`text-xl font-black ${
                          lastResult.success
                            ? 'text-emerald-400'
                            : lastResult.result_code === 'ALREADY_CHECKED_IN'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {lastResult.result_code === 'CHECK_IN_SUCCESS'
                          ? 'CHECK-IN APPROVED'
                          : lastResult.result_code === 'ALREADY_CHECKED_IN'
                          ? 'DUPLICATE ENTRY DETECTED'
                          : 'ENTRY REJECTED'}
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm text-gray-200 font-medium mb-4">
                    {lastResult.message}
                  </p>

                  {/* Attendee Info if present */}
                  {lastResult.attendee_name && (
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Attendee:</span>
                        <span className="font-bold text-white text-sm">
                          {lastResult.attendee_name}
                        </span>
                      </div>
                      {lastResult.ticket_number && (
                        <div className="flex justify-between font-mono">
                          <span className="text-gray-400">Ticket #:</span>
                          <span className="text-amber-300 font-bold">
                            {lastResult.ticket_number}
                          </span>
                        </div>
                      )}
                      {lastResult.ticket_type_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tier:</span>
                          <span className="text-[#FF8A00] font-semibold">
                            {lastResult.ticket_type_name}
                          </span>
                        </div>
                      )}
                      {lastResult.already_checked_in_at && (
                        <div className="flex justify-between text-rose-300 font-mono pt-1 border-t border-white/5">
                          <span>First Scanned At:</span>
                          <span>{new Date(lastResult.already_checked_in_at).toLocaleTimeString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Audit ID: Recorded in ledger</span>
                  <span>{new Date().toLocaleTimeString('en-IN')}</span>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[300px] rounded-3xl bg-[#141414] border border-white/10 p-8 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-white/5 text-gray-400 mb-3">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Awaiting QR Scan</h3>
                <p className="text-xs text-gray-400 max-w-xs">
                  Scan an attendee's digital pass or enter token to instantly validate entry.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent Scans Roster */}
      {scanHistory.length > 0 && (
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF5C00]" />
            Recent Gate Scans ({scanHistory.length})
          </h3>

          <div className="divide-y divide-white/5">
            {scanHistory.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {item.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-white">
                      {item.attendee_name || 'Unrecognized Attendee'}
                    </span>
                    <span className="text-gray-400 ml-2 font-mono text-[11px]">
                      {item.ticket_number || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.success
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {item.result_code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
