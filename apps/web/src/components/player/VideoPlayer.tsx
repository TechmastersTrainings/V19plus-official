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
import { Capacitor } from '@capacitor/core';

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
  const fallbackAttempted = useRef(false);

  // Instance-scoped playback states (isolated from other players)
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

  const itemStatus = (episode as any)?.status || (episode as any)?.transcodeStatus || content.status || (content as any)?.transcodeStatus;
  const bunnyGuid = (episode as any)?.bunnyVideoGuid || (content as any)?.bunnyVideoGuid;
  const bunnyHlsUrl = bunnyGuid ? `https://vz-5385b21b-c9e.b-cdn.net/${bunnyGuid}/playlist.m3u8` : '';

  const storedUrl = (episode?.videoUrl || content.videoUrl || '').trim();
  const storedHls = (episode?.hlsUrl || content.hlsUrl || '').trim();

  let resolvedUrl = '';
  if (storedHls && (storedHls.includes('b-cdn.net') || storedHls.includes('bunny') || storedHls.includes('mediadelivery.net'))) {
    resolvedUrl = storedHls;
  } else if (storedUrl && (storedUrl.includes('b-cdn.net') || storedUrl.includes('bunny') || storedUrl.includes('mediadelivery.net'))) {
    resolvedUrl = storedUrl;
  } else if (itemStatus === 'ready' && bunnyHlsUrl) {
    resolvedUrl = bunnyHlsUrl;
  } else {
    resolvedUrl = storedUrl || bunnyHlsUrl || storedHls;
  }

  const { downloads } = useDownloadStore();
  const downloadItem = downloads[episode?.id || episodeId || content.id];
  const finalVideoUrl = (downloadItem && downloadItem.status === 'completed' && downloadItem.localUri)
    ? (typeof (Capacitor as any)?.convertFileSrc === 'function' && Capacitor.isNativePlatform()
        ? (Capacitor as any).convertFileSrc(downloadItem.localUri)
        : downloadItem.localUri)
    : resolvedUrl;

  const totalDuration = episode?.duration ? episode.duration * 60 : (content.duration || 0) * 60;
  const nextEpisode = allEpisodes.find((e, i, arr) => {
    const activeId = episode?.id || episodeId;
    const idx = arr.findIndex((ep) => ep.id === activeId);
    return idx >= 0 && i === idx + 1;
  });

  const hasVideo = finalVideoUrl.length > 0;

  const sanitizeStreamUrl = (url: string) => {
    if (!url) return '';
    let sanitized = url.trim();

    // 1. Handle gs:// (Firebase Storage raw scheme)
    if (sanitized.startsWith('gs://')) {
      const withoutPrefix = sanitized.replace('gs://', '');
      const slashIdx = withoutPrefix.indexOf('/');
      if (slashIdx !== -1) {
        const bucket = withoutPrefix.substring(0, slashIdx);
        const filePath = withoutPrefix.substring(slashIdx + 1);
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
      }
    }

    // 2. Handle storage.googleapis.com
    if (sanitized.includes('storage.googleapis.com/') && !sanitized.includes('firebasestorage.googleapis.com')) {
      const match = sanitized.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const filePath = match[2];
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
      }
    }

    // 3. Handle firebasestorage.googleapis.com (ensure alt=media)
    if (sanitized.includes('firebasestorage.googleapis.com') && !sanitized.includes('alt=media')) {
      sanitized += (sanitized.includes('?') ? '&' : '?') + 'alt=media';
    }
    return sanitized;
  };

  const [activeVideoUrl, setActiveVideoUrl] = useState(() => sanitizeStreamUrl(finalVideoUrl));

  useEffect(() => {
    setActiveVideoUrl(sanitizeStreamUrl(finalVideoUrl));
    fallbackAttempted.current = false;
    hasSeeked.current = false;
  }, [finalVideoUrl]);

  // Instance-scoped history saving
  const saveProgressNow = useCallback((sec?: number) => {
    const currentSec = sec !== undefined ? sec : progress;
    if (!content?.id || currentSec <= 0) return;
    const total = totalDuration > 0 ? totalDuration : 1;
    const pct = Math.min(100, (currentSec / total) * 100);

    historyApi.upsert({
      contentId: content.id,
      episodeId: episode?.id || episodeId,
      progress: pct,
      completed: pct >= 95,
    }).catch(() => {});
  }, [content?.id, episode?.id, episodeId, progress, totalDuration]);

  const triggerPeriodicSave = useCallback((sec: number) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveProgressNow(sec);
    }, 8000);
  }, [saveProgressNow]);

  // Clean cleanup: Only save this player's progress on unmount; never reset other players!
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveProgressNow();
    };
  }, [saveProgressNow]);

  // Orientation and KeepAwake for native platforms
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

  // Multi-resolution URL loader for direct quality streams (180p, 240p, 360p, 480p, 720p, 1080p)
  useEffect(() => {
    const rawQualities = (episode as any)?.videoQualities || (content as any)?.videoQualities;
    if (rawQualities && typeof rawQualities === 'object' && Object.keys(rawQualities).length > 0) {
      const qList = Object.entries(rawQualities)
        .map(([res, url]) => {
          const height = parseInt(res.replace(/\D/g, '')) || 0;
          const getLabel = (h: number) => {
            if (h >= 1080) return `${h}p Full HD`;
            if (h >= 720) return `${h}p HD`;
            if (h >= 480) return `${h}p Standard`;
            if (h >= 360) return `${h}p Medium`;
            if (h >= 240) return `${h}p Low Data (Smooth)`;
            return `${h}p Ultra Low`;
          };
          return {
            height,
            url: sanitizeStreamUrl(url as string),
            label: getLabel(height),
          };
        })
        .sort((a, b) => b.height - a.height)
        .map((q, idx) => ({
          ...q,
          index: idx,
        }));

      setQualities(qList);
    }
  }, [content, episode]);

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
        // Only trigger buffering spinner if playback stalls for > 500ms
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

      video.addEventListener('playing', clearBuffer);
      video.addEventListener('timeupdate', clearBuffer);
      video.addEventListener('canplay', clearBuffer);
      video.addEventListener('canplaythrough', clearBuffer);
      video.addEventListener('pause', clearBuffer);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('stalled', handleStalled);

      cleanupListeners = () => {
        video.removeEventListener('playing', clearBuffer);
        video.removeEventListener('timeupdate', clearBuffer);
        video.removeEventListener('canplay', clearBuffer);
        video.removeEventListener('canplaythrough', clearBuffer);
        video.removeEventListener('pause', clearBuffer);
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

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // Keyboard controls isolated to currently hovered or focused player
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPlayerActive = isHovered.current ||
        containerRef.current?.contains(document.activeElement) ||
        document.fullscreenElement === containerRef.current;

      if (!isPlayerActive) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => {
            const next = !prev;
            logEvent(next ? 'play' : 'pause', { origin: 'keyboard_space' });
            return next;
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setProgress((prev) => {
            const next = Math.max(0, prev - 10);
            playerRef.current?.seekTo(next, 'seconds');
            return next;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setProgress((prev) => {
            const next = Math.min(duration, prev + 10);
            playerRef.current?.seekTo(next, 'seconds');
            return next;
          });
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
      }
      resetHideTimer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duration, handleToggleFullscreen, resetHideTimer, logEvent]);

  const handleSeek = (time: number) => {
    logEvent('seek', { time });
    setProgress(time);
    playerRef.current?.seekTo(time, 'seconds');
  };

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
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch { /* ignore */ }
    }
  };

  // Quality selection logic: locks manual quality and persists across ABR events
  const handleSetQuality = (qualityIndex: number) => {
    logEvent('qualitySelect', { qualityIndex, isManual: qualityIndex >= 0 });
    setCurrentQuality(qualityIndex);

    // 1. If HLS player is active
    if (hlsPlayerRef.current) {
      if (qualityIndex === -1) {
        // Auto ABR mode
        isManualQualityRef.current = false;
        hlsPlayerRef.current.currentLevel = -1;
      } else {
        // Manual override: lock both currentLevel and loadLevel to stick
        isManualQualityRef.current = true;
        hlsPlayerRef.current.currentLevel = qualityIndex;
        hlsPlayerRef.current.loadLevel = qualityIndex;
      }
    } else {
      // 2. If direct multi-bitrate streams
      const target = qualities.find((q) => q.index === qualityIndex);
      if (target?.url && target.url !== activeVideoUrl) {
        const curSec = progress;
        setActiveVideoUrl(target.url);
        setTimeout(() => {
          playerRef.current?.seekTo(curSec, 'seconds');
        }, 100);
      }
    }
  };

  if (!hasVideo || isError) {
    const errorTitle = isError ? "Playback Error" : "Content Unavailable";
    const errorMsg = isError 
      ? "We encountered a playback error loading this video. Please check your connection and try again."
      : "We're sorry, but this content is currently not streaming in your region or the video file is missing.";

    return (
      <div className="relative w-full h-screen bg-[#141414] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
        <div className="absolute top-6 left-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white hover:text-n-red transition-colors active:scale-90"
            aria-label="Go Back"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
        <div className="max-w-md p-8 bg-[#181818] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white">{errorTitle}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {errorMsg}
          </p>
          <div className="flex gap-3 mt-2">
            {isError && (
              <button
                onClick={() => {
                  setIsError(false);
                  setIsBuffering(true);
                }}
                className="px-6 py-2.5 bg-n-red hover:bg-n-red-hover text-white font-bold rounded-md text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20"
              >
                Retry Playback
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-md text-sm transition-all active:scale-95"
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
      className={`relative w-full h-full bg-black overflow-hidden select-none ${showControls ? 'cursor-default' : 'cursor-none'}`}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => { isHovered.current = true; }}
      onMouseLeave={() => { isHovered.current = false; }}
      onClick={() => {
        setIsPlaying((prev) => {
          const next = !prev;
          logEvent(next ? 'play' : 'pause', { origin: 'container_click' });
          return next;
        });
      }}
    >
      {/* Top Bar with Back Button */}
      {showControls && (
        <div
          className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent animate-fade-in pointer-events-auto"
          style={{ willChange: 'opacity, transform' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => router.back()}
            className="text-white hover:text-n-red transition-colors active:scale-90"
            aria-label="Go Back"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex flex-col text-left">
            <span className="text-white font-bold text-lg md:text-xl leading-tight text-shadow">
              {content.title}
            </span>
            {episode && (
              <span className="text-white/60 text-xs md:text-sm text-shadow-sm">
                S{content.seasons?.find((s) => s.episodes.some((e) => e.id === episodeId))?.number || 1}:E{episode.number} — {episode.title}
              </span>
            )}
            {((content as any)?.status === 'processing' || (episode as any)?.status === 'processing' || (content as any)?.transcodeStatus === 'processing' || (episode as any)?.transcodeStatus === 'processing') && (
              <span className="text-amber-400 text-xs font-bold flex items-center gap-1.5 mt-0.5 animate-pulse bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md max-w-max">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Adaptive HLS Transcoding in progress (240p - 1080p)...
              </span>
            )}
          </div>
        </div>
      )}

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
            forceHLS: activeVideoUrl.includes('.m3u8') || activeVideoUrl.includes('bunny') || activeVideoUrl.includes('mediadelivery.net') || activeVideoUrl.includes('b-cdn.net'),
            forceDASH: activeVideoUrl.includes('.mpd'),
            attributes: {
              ...(activeTracks.length > 0 && !activeVideoUrl.includes('firebasestorage.googleapis.com') ? { crossOrigin: 'anonymous' } : {}),
              playsInline: true,
              'webkit-playsinline': 'true',
              'x5-playsinline': 'true',
              preload: 'auto',
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
              startLevel: -1, // Native automatic ABR start (dynamic based on initial segment test)
              autoStartLoad: true,
              capLevelToPlayerSize: false, // Do not cap stream quality to smaller player container size
              abrEwmaDefaultEstimate: 4000000, // 4 Mbps default estimate for smooth, high quality start
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

            // Log quality switch events
            internalPlayer.on('hlsLevelSwitching', (event: any, data: any) => {
              logEvent('quality/levelSwitching', { toLevel: data.level });
            });

            internalPlayer.on('hlsLevelSwitched', (event: any, data: any) => {
              logEvent('quality/levelSwitched', { currentLevel: data.level });
            });

            // Manifest parsed -> load available bitrate & resolution levels
            internalPlayer.on('hlsManifestParsed', (event: any, data: any) => {
              logEvent('manifestParsed', { levelsCount: data?.levels?.length });
              if (data.levels && data.levels.length > 0) {
                const getLabel = (height: number) => {
                  if (height >= 1080) return `${height}p Full HD`;
                  if (height >= 720) return `${height}p HD`;
                  if (height >= 480) return `${height}p Standard`;
                  if (height >= 360) return `${height}p Medium`;
                  if (height >= 240) return `${height}p Low Data (Smooth)`;
                  return `${height}p Ultra Low`;
                };
                const parsed = data.levels.map((l: any, i: number) => ({
                  height: l.height || 0,
                  bitrate: l.bitrate || 0,
                  index: i,
                  label: getLabel(l.height),
                })).sort((a: any, b: any) => b.height - a.height); // sort descending
                setQualities(parsed);
              }
            });

            // Resilient Error Recovery
            internalPlayer.on('hlsError', (event: any, data: any) => {
              logEvent('error', { type: data?.type, details: data?.details, fatal: data?.fatal });
              if (data?.fatal) {
                switch (data.type) {
                  case 'networkError':
                    logEvent('recoverNetworkError');
                    internalPlayer.startLoad();
                    break;
                  case 'mediaError':
                    logEvent('recoverMediaError');
                    internalPlayer.recoverMediaError();
                    break;
                  default:
                    logEvent('recoverFatalError');
                    internalPlayer.startLoad();
                    break;
                }
              } else if (data?.details === 'bufferStalledError') {
                logEvent('stalled', { bufferStalled: true, isManual: isManualQualityRef.current });
                // Only downshift if in Auto ABR mode! Never override manual selection!
                if (!isManualQualityRef.current && internalPlayer.currentLevel > 0) {
                  logEvent('abrAutoDownshiftOnStall', { fromLevel: internalPlayer.currentLevel });
                  internalPlayer.currentLevel = Math.max(0, internalPlayer.currentLevel - 1);
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
          logEvent('waiting', { origin: 'onBuffer' });
          if (bufferTimer.current) clearTimeout(bufferTimer.current);
          bufferTimer.current = setTimeout(() => {
            const v = containerRef.current?.querySelector('video');
            if (v && !v.paused && !v.ended) {
              setIsBuffering(true);
            }
          }, 500);
        }}
        onBufferEnd={() => {
          logEvent('bufferEnd', { origin: 'onBufferEnd' });
          if (bufferTimer.current) clearTimeout(bufferTimer.current);
          setIsBuffering(false);
        }}
        onError={(e) => {
          logEvent('error', { origin: 'react_player_onError', error: e });

          // Fallback 1: If Bunny HLS URL failed (404 while encoding), fallback to stored raw video URL
          const rawFallback = (episode?.videoUrl || content.videoUrl || '').trim();
          if (!fallbackAttempted.current && activeVideoUrl.includes('b-cdn.net') && rawFallback && !rawFallback.includes('b-cdn.net')) {
            console.log('Bunny HLS stream not ready yet, falling back to raw video URL:', rawFallback);
            fallbackAttempted.current = true;
            setActiveVideoUrl(sanitizeStreamUrl(rawFallback));
            return;
          }

          // Fallback 2: If Firebase Storage URL with a token failed, fallback to public URL without token
          if (!fallbackAttempted.current && activeVideoUrl.includes('firebasestorage.googleapis.com') && activeVideoUrl.includes('token=')) {
            console.log('Firebase token playback failed, retrying with public stream URL...');
            fallbackAttempted.current = true;
            const stripped = activeVideoUrl.replace(/([?&])token=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
            setActiveVideoUrl(stripped);
            return;
          }
          setIsError(true);
        }}
        progressInterval={250}
      />

      <SubtitleOverlay visible={false} text="" />

      {/* Center Play Button when paused / waiting for user interaction */}
      {!isPlaying && !isBuffering && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto cursor-pointer bg-black/30"
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying(true);
            logEvent('play', { origin: 'center_play_button' });
          }}
        >
          <div className="w-20 h-20 rounded-full bg-[#FF5C00] hover:bg-[#FF7A00] flex items-center justify-center text-white shadow-[0_0_30px_rgba(255,92,0,0.6)] transition-all hover:scale-110 active:scale-95">
            <svg className="w-9 h-9 fill-white ml-1" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Subtle Buffering Spinner (No text, non-blocking) */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#FF5C00] rounded-full animate-spin"></div>
        </div>
      )}

      {showNextOverlay && onNextEpisode && (
        <NextEpisodeOverlay
          title={nextEpisode?.title}
          onNext={() => { setShowNextOverlay(false); onNextEpisode(); }}
          onCancel={() => { setShowNextOverlay(false); setIsPlaying(false); }}
        />
      )}

      <PlayerControls
        duration={duration || totalDuration}
        onSeek={handleSeek}
        onNextEpisode={onNextEpisode}
        showNext={showNextBtn}
        onPiP={handlePiP}
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
          {content.title}{episode ? ` — ${episode.title}` : ''}
        </div>
      )}
    </div>
  );
}
