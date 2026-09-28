import { useRef, useEffect, useCallback, useState } from 'react';
import ReactPlayer from 'react-player';
import { useRouter } from 'next/navigation';
import { PlayerControls } from './PlayerControls';
import { SubtitleOverlay } from './SubtitleOverlay';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { Content } from '../../api/content';
import { getPlaybackPrefs } from '../../utils/playbackPrefs';
import { useDownloadStore } from '../../store/downloadStore';
import { historyApi } from '../../api/history';
import { streamingApi, PlaybackAuthResponse } from '../../api/streaming';
import { Capacitor } from '@capacitor/core';
import { AlertCircle, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

interface VideoPlayerProps {
  content: Content;
  episodeId?: string;
  onNextEpisode?: () => void;
  initialResumeSeconds?: number;
  autoPlay?: boolean;
}

export function VideoPlayer({
  content,
  episodeId,
  onNextEpisode,
  initialResumeSeconds = 0,
  autoPlay = true,
}: VideoPlayerProps) {
  const router = useRouter();

  // Unique instance ID for debugging and complete multi-player isolation
  const instanceId = useRef('player_' + Math.random().toString(36).substring(2, 9)).current;

  // Instance-scoped refs
  const playerRef = useRef<ReactPlayer>(null);
  const hlsPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<any>(null);
  const bufferTimer = useRef<any>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSeeked = useRef(false);
  const isHovered = useRef(false);
  const isManualQualityRef = useRef(false);

  // Playback authorization states
  const [authData, setAuthData] = useState<PlaybackAuthResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<{
    status?: number;
    message: string;
    requiresAuth?: boolean;
    requiresSubscription?: boolean;
  } | null>(null);

  // Instance-scoped playback states
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(initialResumeSeconds);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => getPlaybackPrefs().defaultSpeed);
  const [subtitles, setSubtitles] = useState(() => getPlaybackPrefs().subtitles);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualities, setQualities] = useState<Array<{ height: number; bitrate?: number; index: number; label?: string; url?: string }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto ABR
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Central instrumentation logger
  const logEvent = useCallback((event: string, details?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[Player #${instanceId} @ ${timestamp}] ${event}`, details !== undefined ? details : '');
  }, [instanceId]);

  const allEpisodes = content.seasons?.flatMap((s) => s.episodes) || [];
  const episode = (episodeId ? allEpisodes.find((e) => e.id === episodeId) : null) || allEpisodes[0];

  const totalDuration = episode?.duration
    ? episode.duration * 60
    : (episode as any)?.duration_seconds
    ? (episode as any).duration_seconds
    : (content.duration || (content as any)?.duration_seconds || 0) * (content.duration ? 60 : 1);

  const nextEpisode = allEpisodes.find((e, i, arr) => {
    const activeId = episode?.id || episodeId;
    const idx = arr.findIndex((ep) => ep.id === activeId);
    return idx >= 0 && i === idx + 1;
  });

  const { downloads } = useDownloadStore();
  const downloadItem = downloads[episode?.id || episodeId || content.id];

  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('');

  // 1. Fetch authorized playback token and HLS stream URL from FastAPI backend
  useEffect(() => {
    let isMounted = true;

    // If offline download is available on device, play locally
    if (downloadItem && downloadItem.status === 'completed' && downloadItem.localUri) {
      const localUrl =
        typeof (Capacitor as any)?.convertFileSrc === 'function' && Capacitor.isNativePlatform()
          ? (Capacitor as any).convertFileSrc(downloadItem.localUri)
          : downloadItem.localUri;
      setActiveVideoUrl(localUrl);
      setAuthLoading(false);
      return;
    }

    const fetchAuth = async () => {
      setAuthLoading(true);
      setAuthError(null);
      setIsError(false);

      try {
        const res = await streamingApi.getPlaybackAuth(content.id, episode?.id || episodeId);
        if (!isMounted) return;

        const normalizeStreamUrl = (url?: string) => {
          if (!url) return '';
          if (url.includes('127.0.0.1:8001')) {
            return url.replace('http://127.0.0.1:8001', '');
          }
          return url;
        };

        setAuthData(res.data);
        const resolvedUrl = normalizeStreamUrl(res.data.stream_url);
        setActiveVideoUrl(resolvedUrl);
        logEvent('playbackAuthorized', {
          streamUrl: resolvedUrl,
          hasSprite: !!res.data.sprite_vtt_url,
        });
      } catch (err: any) {
        if (!isMounted) return;
        const statusCode = err.response?.status;
        const detailMsg = err.response?.data?.detail;

        logEvent('playbackAuthFailed', { status: statusCode, error: detailMsg || err.message });

        // Subscriptions deferred per user directive - enable open streaming with reliable fallback
        const normalizeStreamUrl = (url?: string) => {
          if (!url) return '';
          if (url.includes('127.0.0.1:8001')) {
            return url.replace('http://127.0.0.1:8001', '');
          }
          return url;
        };

        const fallbackUrl = normalizeStreamUrl(
          (episode?.videoUrl ||
            (episode as any)?.hls_manifest_key ||
            content.videoUrl ||
            (content as any)?.hls_manifest_key ||
            'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
          ).trim()
        );

        setActiveVideoUrl(fallbackUrl);
        setAuthError(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    fetchAuth();

    return () => {
      isMounted = false;
    };
  }, [content.id, episode?.id, episodeId, downloadItem, logEvent]);

  // Instance-scoped history and watch progress saving
  const saveProgressNow = useCallback(
    (sec?: number) => {
      const currentSec = sec !== undefined ? sec : progress;
      if (!content?.id || currentSec <= 0) return;
      const total = totalDuration > 0 ? totalDuration : 1;
      const pct = Math.min(100, (currentSec / total) * 100);

      // 1. Report to FastAPI streaming progress endpoint
      streamingApi
        .updateProgress({
          content_id: content.id,
          episode_id: episode?.id || episodeId,
          progress_seconds: Math.floor(currentSec),
          duration_seconds: Math.max(1, Math.floor(total)),
        })
        .catch(() => {});

      // 2. Also keep legacy historyApi upsert for backwards compatibility
      historyApi
        .upsert({
          contentId: content.id,
          episodeId: episode?.id || episodeId,
          progress: pct,
          completed: pct >= 95,
        })
        .catch(() => {});
    },
    [content.id, episode?.id, episodeId, progress, totalDuration]
  );

  const triggerPeriodicSave = useCallback(
    (sec: number) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveProgressNow(sec);
      }, 15000); // 15-second debounced reporting
    },
    [saveProgressNow]
  );

  // Cleanup: Save this player's progress on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveProgressNow();
    };
  }, [saveProgressNow]);

  // Orientation and KeepAwake for native Capacitor platforms
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const enableNativeFeatures = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        if (!isMounted) return;
        await ScreenOrientation.lock({ orientation: 'landscape' });

        const { KeepAwake } = await import('@capacitor-community/keep-awake');
        if (!isMounted) {
          await ScreenOrientation.unlock();
          return;
        }
        await KeepAwake.keepAwake();
      } catch (err) {
        console.error('Failed to enable native video player locks:', err);
      }
    };

    enableNativeFeatures();

    return () => {
      isMounted = false;
      const disableNativeFeatures = async () => {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (!Capacitor.isNativePlatform()) return;

          const { ScreenOrientation } = await import('@capacitor/screen-orientation');
          await ScreenOrientation.unlock();

          const { KeepAwake } = await import('@capacitor-community/keep-awake');
          await KeepAwake.allowSleep();
        } catch (err) {
          console.error('Failed to disable native video player locks:', err);
        }
      };
      disableNativeFeatures();
    };
  }, []);

  // Initial resume seek
  useEffect(() => {
    if (initialResumeSeconds > 0 && duration > 0 && !hasSeeked.current) {
      playerRef.current?.seekTo(initialResumeSeconds, 'seconds');
      setProgress(initialResumeSeconds);
      hasSeeked.current = true;
    }
  }, [duration, initialResumeSeconds]);

  // Real-time synchronization with native <video> element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanupListeners: (() => void) | null = null;

    const attachListeners = () => {
      const video = container.querySelector('video');
      if (!video) return false;

      const clearBuffer = () => {
        if (bufferTimer.current) {
          clearTimeout(bufferTimer.current);
          bufferTimer.current = null;
        }
        setIsBuffering(false);
      };

      const handleWaiting = () => {
        logEvent('waiting', { currentTime: video.currentTime, readyState: video.readyState });
        if (bufferTimer.current) clearTimeout(bufferTimer.current);
        bufferTimer.current = setTimeout(() => {
          if (!video.paused && !video.ended) {
            setIsBuffering(true);
          }
        }, 500);
      };

      const handleStalled = () => {
        logEvent('stalled', { currentTime: video.currentTime, networkState: video.networkState });
        if (bufferTimer.current) clearTimeout(bufferTimer.current);
        bufferTimer.current = setTimeout(() => {
          if (!video.paused && !video.ended) {
            setIsBuffering(true);
          }
        }, 500);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        clearBuffer();
      };
      const handlePause = () => {
        setIsPlaying(false);
        setShowControls(true);
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('playing', handlePlay);
      video.addEventListener('timeupdate', clearBuffer);
      video.addEventListener('canplay', clearBuffer);
      video.addEventListener('canplaythrough', clearBuffer);
      video.addEventListener('pause', handlePause);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('stalled', handleStalled);

      cleanupListeners = () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('playing', handlePlay);
        video.removeEventListener('timeupdate', clearBuffer);
        video.removeEventListener('canplay', clearBuffer);
        video.removeEventListener('canplaythrough', clearBuffer);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('stalled', handleStalled);
      };
      return true;
    };

    if (!attachListeners()) {
      const interval = setInterval(() => {
        if (attachListeners()) {
          clearInterval(interval);
        }
      }, 200);
      return () => {
        clearInterval(interval);
        if (cleanupListeners) cleanupListeners();
        if (bufferTimer.current) clearTimeout(bufferTimer.current);
      };
    }

    return () => {
      if (cleanupListeners) cleanupListeners();
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
    };
  }, [activeVideoUrl, logEvent]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const [centerFeedback, setCenterFeedback] = useState<'play' | 'pause' | 'rewind' | 'forward' | null>(null);
  const clickTimeoutRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<any>(null);

  const triggerCenterFeedback = useCallback((type: 'play' | 'pause' | 'rewind' | 'forward') => {
    setCenterFeedback(type);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setCenterFeedback(null);
    }, 600);
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // In Netflix / YouTube style: keep controls permanently visible when paused.
    // When playing, auto-hide controls after 3.5 seconds of inactivity.
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer, isPlaying]);

  const handleSeek = useCallback(
    (time: number) => {
      logEvent('seek', { time });
      setProgress(time);
      playerRef.current?.seekTo(time, 'seconds');
    },
    [logEvent]
  );

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      triggerCenterFeedback(next ? 'play' : 'pause');
      logEvent(next ? 'play' : 'pause', { origin: 'user_action' });

      // Directly drive the underlying video element to ensure immediate user-gesture propagation
      const video = containerRef.current?.querySelector('video');
      if (video) {
        if (next) {
          video.play().catch((err) => {
            console.warn('Video play deferred:', err);
          });
        } else {
          video.pause();
        }
      }

      return next;
    });
  }, [logEvent, triggerCenterFeedback]);

  // Netflix/YouTube style click & double-click container handling
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. If controls are hidden, first click/touch ONLY reveals controls (hover first!)
    if (!showControls) {
      setShowControls(true);
      resetHideTimer();
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const widthPct = clickX / rect.width;

    if (clickTimeoutRef.current) {
      // Double-click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      if (widthPct < 0.35) {
        // Double-click left: Rewind 10s (YouTube / Netflix style)
        const next = Math.max(0, progress - 10);
        handleSeek(next);
        triggerCenterFeedback('rewind');
      } else if (widthPct > 0.65) {
        // Double-click right: Forward 10s (YouTube / Netflix style)
        const next = Math.min(duration || totalDuration, progress + 10);
        handleSeek(next);
        triggerCenterFeedback('forward');
      } else {
        // Double-click center: Toggle play/pause
        togglePlayPause();
      }
      resetHideTimer();
    } else {
      // Single-click: Wait 280ms to differentiate between single and double-click
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        togglePlayPause();
        resetHideTimer();
      }, 280);
    }
  };

  // YouTube / Netflix keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPlayerActive =
        isHovered.current ||
        containerRef.current?.contains(document.activeElement) ||
        document.fullscreenElement === containerRef.current;

      if (!isPlayerActive) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          handleSeek(Math.max(0, progress - 10));
          triggerCenterFeedback('rewind');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handleSeek(Math.min(duration || totalDuration, progress + 10));
          triggerCenterFeedback('forward');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, progress - 5));
          triggerCenterFeedback('rewind');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(duration || totalDuration, progress + 5));
          triggerCenterFeedback('forward');
          break;
        case 'f':
        case 'F':
          handleToggleFullscreen();
          break;
        case 'm':
        case 'M':
          setIsMuted((prev) => !prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          e.preventDefault();
          const targetPct = Number(e.key) / 10;
          const targetSec = targetPct * (duration || totalDuration);
          handleSeek(targetSec);
          break;
        }
      }
      resetHideTimer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    duration,
    totalDuration,
    progress,
    handleToggleFullscreen,
    resetHideTimer,
    togglePlayPause,
    handleSeek,
    triggerCenterFeedback,
  ]);

  const handleEnded = () => {
    logEvent('ended');
    saveProgressNow(duration);
    const prefs = getPlaybackPrefs();
    if (onNextEpisode && prefs.autoplayNext) {
      setShowNextOverlay(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePiP = async () => {
    const video = containerRef.current?.querySelector('video');
    if (video && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (e) {
        console.error('PiP failed', e);
      }
    }
  };

  const handleSetQuality = (qualityIndex: number) => {
    setCurrentQuality(qualityIndex);
    if (hlsPlayerRef.current) {
      if (qualityIndex === -1) {
        isManualQualityRef.current = false;
        hlsPlayerRef.current.currentLevel = -1; // Auto ABR
        logEvent('qualitySelected', { label: 'Auto (ABR)' });
      } else {
        isManualQualityRef.current = true;
        const targetLevel = qualities.find((q) => q.index === qualityIndex);
        if (targetLevel) {
          hlsPlayerRef.current.currentLevel = targetLevel.index;
          logEvent('qualitySelected', { label: targetLevel.label, index: targetLevel.index });
        }
      }
    }
  };

  // ─── Loading / Authorization State ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-white/10 border-t-[#FF5C00] rounded-full animate-spin" />
          <span className="text-white/70 text-sm font-medium tracking-wide">
            Authorizing Secure Playback...
          </span>
        </div>
      </div>
    );
  }



  // ─── Playback Failure / Error View ──────────────────────────────────────────
  if (isError || (authError && !activeVideoUrl)) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center p-6 text-center select-none">
        <div className="max-w-md p-8 bg-[#181818] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Playback Error</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {authError?.message ||
              'Unable to load the video stream. The video may be still processing or network connection was interrupted.'}
          </p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => {
                setIsError(false);
                setIsBuffering(true);
                const video = containerRef.current?.querySelector('video');
                if (video) {
                  video.load();
                  video
                    .play()
                    .then(() => {
                      setIsPlaying(true);
                      setIsBuffering(false);
                    })
                    .catch(() => {
                      setIsPlaying(false);
                      setIsBuffering(false);
                    });
                } else if (authData?.stream_url) {
                  setActiveVideoUrl(authData.stream_url);
                  setIsPlaying(true);
                }
              }}
              className="px-6 py-2.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-95"
            >
              Retry Playback
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-xl text-sm transition-all active:scale-95"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showNextBtn = totalDuration > 0 && progress / totalDuration > 0.9 && !!onNextEpisode;
  const activeSubtitles = episode?.subtitles || content.subtitles || [];
  const tracks = activeSubtitles.map((sub) => ({
    kind: 'subtitles',
    src: sub.url,
    srcLang: sub.language,
    label: sub.label,
    default: sub.language === 'en',
  }));
  const activeTracks = subtitles ? tracks : [];

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none ${
        showControls ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => {
        isHovered.current = true;
      }}
      onMouseLeave={() => {
        isHovered.current = false;
      }}
      onClick={handleContainerClick}
    >
      {/* Top Bar with Back Button & Content Metadata */}
      {showControls && (
        <div
          className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent animate-fade-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-95"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex flex-col text-left">
            <span className="text-white font-bold text-lg md:text-xl leading-tight">
              {content.title}
            </span>
            {episode && (
              <span className="text-white/60 text-xs md:text-sm">
                S{content.seasons?.find((s) => s.episodes?.some((e) => e.id === episodeId))?.number || 1}:E
                {episode.number} — {episode.title}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ReactPlayer with HLS stream support */}
      {activeVideoUrl && (
        <ReactPlayer
          ref={playerRef}
          url={activeVideoUrl}
          playing={isPlaying}
          volume={isMuted ? 0 : volume}
          playbackRate={playbackSpeed}
          width="100%"
          height="100%"
          playsinline
          config={{
            file: {
              forceHLS:
                activeVideoUrl.includes('.m3u8') ||
                activeVideoUrl.includes('/hls/') ||
                activeVideoUrl.includes('stream.v19plus.com'),
              forceDASH: activeVideoUrl.includes('.mpd'),
              attributes: {
                playsInline: true,
                'webkit-playsinline': 'true',
                'x5-playsinline': 'true',
                preload: 'auto',
                poster: content.thumbnailUrl || (content as any)?.bannerUrl || '',
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
              tracks: activeTracks,
              hlsOptions: {
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 80 * 1000 * 1000,
                maxBufferHole: 0.8,
                highBufferWatchdogPeriod: 1,
                nudgeOffset: 0.2,
                nudgeMaxRetry: 10,
                maxFragLookUpTolerance: 0.3,
                startLevel: -1, // Native automatic ABR start
                autoStartLoad: true,
                capLevelToPlayerSize: false,
                abrEwmaDefaultEstimate: 4000000,
                abrBandWidthFactor: 0.85,
                abrBandWidthUpFactor: 0.7,
                abrMaxWithRealBitrate: true,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 500,
                levelLoadingTimeOut: 15000,
                levelLoadingMaxRetry: 5,
              },
            },
          }}
          onReady={(player) => {
            const internalPlayer = player.getInternalPlayer('hls');
            if (internalPlayer) {
              hlsPlayerRef.current = internalPlayer;

              internalPlayer.on('hlsManifestParsed', (event: any, data: any) => {
                logEvent('manifestParsed', { levelsCount: data?.levels?.length });
                if (data.levels && data.levels.length > 0) {
                  const getLabel = (height: number) => {
                    if (height >= 1080) return `${height}p Full HD`;
                    if (height >= 720) return `${height}p HD`;
                    if (height >= 480) return `${height}p Standard`;
                    if (height >= 360) return `${height}p Medium`;
                    if (height >= 240) return `${height}p Low Data`;
                    return `${height}p`;
                  };
                  const parsed = data.levels
                    .map((l: any, i: number) => ({
                      height: l.height || 0,
                      bitrate: l.bitrate || 0,
                      index: i,
                      label: getLabel(l.height),
                    }))
                    .sort((a: any, b: any) => b.height - a.height);
                  setQualities(parsed);
                }
              });

              internalPlayer.on('hlsError', (event: any, data: any) => {
                logEvent('error', { type: data?.type, details: data?.details, fatal: data?.fatal });
                if (data?.fatal) {
                  switch (data.type) {
                    case 'networkError':
                      internalPlayer.startLoad();
                      break;
                    case 'mediaError':
                      internalPlayer.recoverMediaError();
                      break;
                    default:
                      internalPlayer.startLoad();
                      break;
                  }
                }
              });
            }
          }}
          onPlay={() => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            setIsBuffering(false);
            setIsPlaying(true);
            logEvent('play', { progress });
          }}
          onProgress={({ playedSeconds }) => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            setIsBuffering(false);
            setProgress(playedSeconds);
            triggerPeriodicSave(playedSeconds);
          }}
          onDuration={(d) => setDuration(d)}
          onEnded={handleEnded}
          onPause={() => {
            logEvent('pause', { progress });
            saveProgressNow(progress);
          }}
          onBuffer={() => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            bufferTimer.current = setTimeout(() => {
              const v = containerRef.current?.querySelector('video');
              if (v && !v.paused && !v.ended) {
                setIsBuffering(true);
              }
            }, 500);
          }}
          onBufferEnd={() => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            setIsBuffering(false);
          }}
          onError={(e) => {
            logEvent('error', { origin: 'react_player_onError', error: e });

            // 1. Check if it's an autoplay policy or user-gesture restriction
            const errName = (e as any)?.name;
            const errMsg = String((e as any)?.message || '');
            const videoElem = containerRef.current?.querySelector('video');
            const mediaError = videoElem?.error;

            if (
              errName === 'NotAllowedError' ||
              errName === 'AbortError' ||
              errMsg.includes('interact') ||
              errMsg.includes('user gesture') ||
              errMsg.includes('denied permission') ||
              errMsg.includes('pause()') ||
              (!mediaError && (!videoElem || videoElem.paused))
            ) {
              // Autoplay blocked by browser policy: graceful transition to user-initiated playback
              logEvent('autoplayDeferredToUserGesture');
              setIsPlaying(false);
              setShowControls(true);
              return;
            }

            // 2. Only show fatal error if mediaError is an actual fatal decode/network error
            if (mediaError && mediaError.code !== 1) {
              setIsError(true);
            }
          }}
          progressInterval={250}
        />
      )}

      <SubtitleOverlay visible={false} text="" />

      {/* Animated Netflix / YouTube Side Arc Ripple for Double-Tap Seek */}
      {centerFeedback === 'rewind' && (
        <div className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none bg-gradient-to-r from-white/10 to-transparent rounded-r-full animate-pulse z-20">
          <div className="flex flex-col items-center gap-1.5 bg-black/40 px-4 py-3 rounded-2xl backdrop-blur-sm">
            <RotateCcw className="w-8 h-8 text-white" />
            <span className="text-xs font-bold text-white font-mono tracking-wider">10 seconds</span>
          </div>
        </div>
      )}
      {centerFeedback === 'forward' && (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none bg-gradient-to-l from-white/10 to-transparent rounded-l-full animate-pulse z-20">
          <div className="flex flex-col items-center gap-1.5 bg-black/40 px-4 py-3 rounded-2xl backdrop-blur-sm">
            <RotateCw className="w-8 h-8 text-white" />
            <span className="text-xs font-bold text-white font-mono tracking-wider">10 seconds</span>
          </div>
        </div>
      )}

      {/* Animated Netflix / YouTube Transient Center Feedback Ripple */}
      {centerFeedback && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-all">
          <div className="w-24 h-24 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-fade-in">
            {centerFeedback === 'play' && <Play className="w-12 h-12 fill-white text-white ml-1.5 drop-shadow" />}
            {centerFeedback === 'pause' && <Pause className="w-12 h-12 fill-white text-white drop-shadow" />}
            {centerFeedback === 'rewind' && (
              <div className="flex flex-col items-center">
                <RotateCcw className="w-9 h-9 text-white" />
                <span className="text-xs font-bold mt-1 text-[#FF5C00] font-mono tracking-wider">-10s</span>
              </div>
            )}
            {centerFeedback === 'forward' && (
              <div className="flex flex-col items-center">
                <RotateCw className="w-9 h-9 text-white" />
                <span className="text-xs font-bold mt-1 text-[#FF5C00] font-mono tracking-wider">+10s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prominent Netflix / YouTube Center Play Button when Paused */}
      {!isPlaying && !isBuffering && !authLoading && showControls && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <button
            type="button"
            className="pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FF5C00]/90 hover:bg-[#FF5C00] text-white flex items-center justify-center shadow-[0_0_40px_rgba(255,92,0,0.6)] backdrop-blur-md border border-white/20 transition-all transform hover:scale-110 active:scale-95 group"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            aria-label="Play video"
          >
            <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white ml-1.5 group-hover:scale-105 transition-transform" />
          </button>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#FF5C00] rounded-full animate-spin" />
        </div>
      )}

      {showNextOverlay && onNextEpisode && (
        <NextEpisodeOverlay
          title={nextEpisode?.title}
          onNext={() => {
            setShowNextOverlay(false);
            onNextEpisode();
          }}
          onCancel={() => {
            setShowNextOverlay(false);
            setIsPlaying(false);
          }}
        />
      )}

      <PlayerControls
        duration={duration || totalDuration}
        onSeek={handleSeek}
        onNextEpisode={onNextEpisode}
        showNext={showNextBtn}
        onPiP={handlePiP}
        spriteVttUrl={authData?.sprite_vtt_url}
        isPlaying={isPlaying}
        progress={progress}
        volume={volume}
        isMuted={isMuted}
        showControls={showControls}
        playbackSpeed={playbackSpeed}
        subtitles={subtitles}
        isFullscreen={isFullscreen}
        qualities={qualities}
        currentQuality={currentQuality}
        onTogglePlay={() => {
          setIsPlaying((prev) => {
            const next = !prev;
            logEvent(next ? 'play' : 'pause', { origin: 'toggle_button' });
            return next;
          });
        }}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSubtitles={() => setSubtitles((prev) => !prev)}
        onSetPlaybackSpeed={(s) => setPlaybackSpeed(s)}
        onSetVolume={(v) => {
          setVolume(v);
          setIsMuted(v === 0);
        }}
        onSetQuality={handleSetQuality}
      />

      {!showControls && (
        <div className="absolute top-4 left-4 text-white/50 text-sm pointer-events-none">
          {content.title}
          {episode ? ` — ${episode.title}` : ''}
        </div>
      )}
    </div>
  );
}
