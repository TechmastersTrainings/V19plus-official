'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '../../store/authStore';

// ─── Config ──────────────────────────────────────────────────────────────────
const LOGO_HOLD     = 0.15;  // minimal hold so content renders immediately
const SHUTTER_DUR   = 0.15;  // fast transition shutter
const FADE_OUT_DUR  = 0.1;   // rapid fade-out of wrapper

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [opening, setOpening] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const { isAuthenticated } = useAuthStore();

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated || sessionStorage.getItem('v19_splash_seen') === 'true') {
      setVisible(false);
      return;
    }

    // After the logo hold, trigger the shutter opening
    const t1 = setTimeout(() => setOpening(true), LOGO_HOLD * 1000);

    // After shutter finishes, remove the splash
    const t2 = setTimeout(() => {
      sessionStorage.setItem('v19_splash_seen', 'true');
      setVisible(false);
    }, (LOGO_HOLD + SHUTTER_DUR + FADE_OUT_DUR + 0.05) * 1000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isAuthenticated]);

  // ─── Cinematic sound ─────────────────────────────────────────────────────
  const playSound = useCallback(() => {
    if (audioPlayed) return;
    setAudioPlayed(true);
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ac = new Ctx();
      const t = ac.currentTime;

      // Sub-bass sweep
      const o1 = ac.createOscillator();
      const g1 = ac.createGain();
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(45, t);
      o1.frequency.exponentialRampToValueAtTime(110, t + 1.4);
      g1.gain.setValueAtTime(0.01, t);
      g1.gain.linearRampToValueAtTime(0.4, t + 0.35);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 2);

      // Chime
      const o2 = ac.createOscillator();
      const g2 = ac.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(392, t);
      o2.frequency.setValueAtTime(784, t + 0.3);
      g2.gain.setValueAtTime(0.01, t);
      g2.gain.linearRampToValueAtTime(0.2, t + 0.35);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

      // Shutter click (noise burst)
      const len = ac.sampleRate * 0.05;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const ch = buf.getChannelData(0);
      for (let j = 0; j < len; j++) ch[j] = (Math.random() * 2 - 1) * 0.25;
      const ns = ac.createBufferSource();
      ns.buffer = buf;
      const gn = ac.createGain();
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(0.5, t + LOGO_HOLD - 0.02);
      gn.gain.exponentialRampToValueAtTime(0.001, t + LOGO_HOLD + 0.06);

      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(2000, t + 0.9);

      o1.connect(g1).connect(lp).connect(ac.destination);
      o2.connect(g2).connect(ac.destination);
      ns.connect(gn).connect(ac.destination);
      o1.start(); o2.start(); ns.start();
      o1.stop(t + 2.2); o2.stop(t + 2.2);
      ns.stop(t + LOGO_HOLD + 0.12);
    } catch {
      // Audio context may fail silently
    }
  }, [audioPlayed]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="splash-root"
        className="fixed inset-0 z-[9999] select-none cursor-pointer"
        style={{ willChange: 'opacity' }}
        onClick={playSound}
        exit={{ opacity: 0 }}
        transition={{ duration: FADE_OUT_DUR, ease: 'easeOut' }}
      >
        {/* ── Black base ──────────────────────────────────────────── */}
        <div className="absolute inset-0 bg-black" />

        {/* ── Ambient glow ────────────────────────────────────────── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: opening ? 0 : 0.8 }}
          transition={{ duration: opening ? 0.4 : 0.8 }}
        >
          <div
            className="w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(229,9,20,0.15) 0%, rgba(229,9,20,0.05) 40%, transparent 70%)',
              filter: 'blur(60px)',
              willChange: 'transform',
            }}
          />
        </motion.div>

        {/* ── Logo + branding ─────────────────────────────────────── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Logo Badge */}
          <motion.div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#FF8A00] to-[#D44900] p-0.5 shadow-[0_0_35px_rgba(255,92,0,0.55)] mb-4 overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={opening ? { opacity: 0, scale: 1.1 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <img
              src="/logo-icon.png"
              alt="V19Plus Logo"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </motion.div>

          {/* Brand text */}
          <motion.div
            className="flex items-baseline text-5xl md:text-7xl font-black tracking-tighter"
            style={{ willChange: 'transform, opacity' }}
            initial={{ opacity: 0, y: 20 }}
            animate={
              opening
                ? { opacity: 0, y: -15, scale: 1.1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={
              opening
                ? { duration: SHUTTER_DUR * 0.45, ease: 'easeIn' }
                : { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
            }
          >
            <span className="text-white">V19</span>
            <span className="text-[#FF5C00] relative">
              Plus
              <motion.span
                className="absolute inset-0 text-[#FF5C00] blur-[10px] pointer-events-none"
                animate={{ opacity: [0.35, 0.9, 0.35] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                Plus
              </motion.span>
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-gray-500 mt-3 font-medium"
            style={{ willChange: 'transform, opacity' }}
            initial={{ opacity: 0, y: 8 }}
            animate={opening ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
            transition={opening ? { duration: 0.25 } : { duration: 0.6, delay: 0.6 }}
          >
            Stream Unlimited
          </motion.p>

          {/* Horizontal accent line */}
          <motion.div
            className="absolute left-0 right-0 top-1/2 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,92,0,0.3), transparent)',
              willChange: 'transform, opacity',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={opening ? { scaleX: 2.5, opacity: 0 } : { scaleX: 1, opacity: 1 }}
            transition={opening ? { duration: SHUTTER_DUR } : { duration: 1, delay: 0.4 }}
          />
        </div>

        {/* ── Progress bar ────────────────────────────────────────── */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-40 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF5C00, #FF8A00)',
              willChange: 'transform',
            }}
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: LOGO_HOLD - 0.15, ease: 'linear' }}
          />
        </div>

        {/* ── Tap prompt ──────────────────────────────────────────── */}
        {!audioPlayed && !opening && (
          <motion.p
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Tap for sound
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
