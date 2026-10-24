"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { streamingApi } from "../../api/streaming";
import { historyApi } from "../../api/history";
import { Content } from "../../api/content";
import Hls from "hls.js";

export interface VideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  className?: string;
  content?: Content;
  episodeId?: string;
  initialResumeSeconds?: number;
  onNextEpisode?: () => void;
}

function formatStreamUrl(url: string): string {
  if (!url) return "";
  // Direct Cloudflare R2 Delivery:
  // With CORS active on bucket v19plus-r2-backend, Hls.js and native players
  // download manifests and .ts segments directly from Cloudflare R2 Anycast CDN.
  return url;
}

const lockMobileToLandscape = async () => {
  if (typeof window === "undefined") return;

  const isMobile =
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 840 && window.innerHeight > window.innerWidth);

  if (!isMobile) return;

  // 1. Try Capacitor Native ScreenOrientation if running in hybrid app
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "landscape" });
      return;
    }
  } catch {}

  // 2. Try Web Screen Orientation API (Android Chrome, Samsung Internet, Edge mobile)
  try {
    if (screen?.orientation && typeof (screen.orientation as any).lock === "function") {
      await (screen.orientation as any).lock("landscape");
    }
  } catch (err) {
    // Non-fatal: Gracefully fall back if device/browser doesn't allow programmatic orientation lock
  }
};

const restoreMobileOrientation = async () => {
  if (typeof window === "undefined") return;

  // 1. Try Capacitor Native ScreenOrientation unlock
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.unlock();
      return;
    }
  } catch {}

  // 2. Try Web Screen Orientation API unlock
  try {
    if (screen?.orientation && typeof (screen.orientation as any).unlock === "function") {
      (screen.orientation as any).unlock();
    }
  } catch (err) {
    // Non-fatal
  }
};

export function VideoPlayer({
  src: propSrc,
  poster: propPoster,
  title: propTitle = "V19Plus",
  className = "",
  content,
  episodeId,
  initialResumeSeconds = 0,
  onNextEpisode,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasResumed = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCount = useRef(0);
  const MAX_AUTO_RETRIES = 3;
  const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTimeRef = useRef(0);
  const isAttemptingPlay = useRef(false);

  // Quality / ABR state
  const [qualities, setQualities] = useState<{ id: number; label: string; height: number; bitrate: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto ABR
  const [activeResolution, setActiveResolution] = useState<string>("");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [activeSrc, setActiveSrc] = useState<string>(() => {
    // Prioritize published HLS manifests (.m3u8)
    const hls =
      (propSrc && (propSrc.includes(".m3u8") || propSrc.includes("/hls/")) ? propSrc : null) ||
      ((content as any)?.hls_manifest_key &&
      ((content as any).hls_manifest_key.includes(".m3u8") ||
        (content as any).hls_manifest_key.includes("/hls/"))
        ? (content as any).hls_manifest_key
        : null);

    if (hls) return formatStreamUrl(hls);

    // For catalog titles, wait for authorized HLS stream and never fall back to raw master MP4
    if (content?.id || (content as any)?.master_storage_key) {
      return "";
    }

    const raw = (propSrc && (propSrc.includes(".m3u8") || propSrc.includes("/hls/"))) ? propSrc : "";
    return formatStreamUrl(raw);
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string>("");
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const prolongedBufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBuffering = useCallback(() => {
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
    if (prolongedBufferTimeoutRef.current) {
      clearTimeout(prolongedBufferTimeoutRef.current);
      prolongedBufferTimeoutRef.current = null;
    }
    isAttemptingPlay.current = false;
    setIsBuffering(false);
    setIsLoading(false);
  }, []);

  const triggerBuffering = useCallback(() => {
    if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    bufferTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && (!video.paused || isAttemptingPlay.current)) {
        // Only trigger buffering overlay if media engine is genuinely starved of data (readyState < 3)
        if (video.readyState < 3) {
          setIsBuffering(true);
          if (!prolongedBufferTimeoutRef.current) {
            prolongedBufferTimeoutRef.current = setTimeout(() => {
              const currentVideo = videoRef.current;
              if (currentVideo && (!currentVideo.paused || isAttemptingPlay.current) && currentVideo.readyState < 3) {
                // Auto-recover if stalled at segment boundary
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
                if (currentVideo.readyState < 2) {
                  currentVideo.play().catch(() => {});
                } else {
                  currentVideo.currentTime = Math.min(currentVideo.duration || Infinity, currentVideo.currentTime + 0.1);
                  currentVideo.play().catch(() => {});
                }
              }
            }, 6000);
          }
        }
      }
    }, 150);
  }, []);

  // Derive poster and title
  const poster =
    propPoster ||
    content?.thumbnailUrl ||
    (content as any)?.bannerUrl ||
    "";
  const title = propTitle || content?.title || "V19Plus";

  // Fetch authorized streaming URL from backend if not provided directly as valid HLS
  useEffect(() => {
    // If a valid published HLS manifest is explicitly passed, use it directly
    if (propSrc && (propSrc.includes(".m3u8") || propSrc.includes("/hls/"))) {
      setActiveSrc(formatStreamUrl(propSrc));
      return;
    }

    const contentHls = (content as any)?.hls_manifest_key;
    if (contentHls && (contentHls.includes(".m3u8") || contentHls.includes("/hls/"))) {
      setActiveSrc(formatStreamUrl(contentHls));
      return;
    }

    if (!content?.id) {
      if (propSrc && (propSrc.includes(".m3u8") || propSrc.includes("/hls/"))) {
        setActiveSrc(formatStreamUrl(propSrc));
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    streamingApi
      .getPlaybackAuth(content.id, episodeId)
      .then((res) => {
        if (!isMounted) return;
        const streamUrl = res.data?.stream_url;
        const isHls = Boolean(
          streamUrl &&
            (streamUrl.includes(".m3u8") ||
              streamUrl.includes("/hls/") ||
              (res.data as any)?.is_hls)
        );

        if (isHls && streamUrl) {
          setIsProcessing(false);
          setActiveSrc(formatStreamUrl(streamUrl));
        } else if (
          res.data?.is_processing ||
          (res.data as any)?.status === "PROCESSING" ||
          (content as any)?.status === "PROCESSING" ||
          ((content as any)?.master_storage_key && !(content as any)?.hls_manifest_key)
        ) {
          setIsProcessing(true);
          setRawPreviewUrl(streamUrl || "");
          setIsLoading(false);
          setHasError(false);
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = setTimeout(() => {
            if (isMounted) setReloadKey((prev) => prev + 1);
          }, 6000);
        } else {
          console.error("No adaptive HLS stream available for this title.");
          setHasError(true);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Playback authorization failed:", err);
        const hlsFallback = (content as any)?.hls_manifest_key;
        if (hlsFallback && (hlsFallback.includes(".m3u8") || hlsFallback.includes("/hls/"))) {
          setIsProcessing(false);
          setActiveSrc(formatStreamUrl(hlsFallback));
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [content?.id, episodeId, propSrc, (content as any)?.hls_manifest_key, reloadKey]);

  // Attach media stream (Capability-based Adaptive HLS: MSE with Hls.js -> Native HLS for iOS -> Graceful error)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    setHasError(false);
    setIsLoading(true);
    retryCount.current = 0;

    // Destroy existing Hls instance if present
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeSrc.includes(".m3u8") || activeSrc.includes("/hls/");

    if (isHls) {
      if (Hls.isSupported()) {
        // 1. MSE-supported environments (Desktop Chrome, Safari, Firefox, Edge, Android Chrome, Samsung Internet)
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          startLevel: -1, // Auto ABR by default
          abrEwmaDefaultEstimate: 1000000, // 1 Mbps default bandwidth estimate for smooth start
          capLevelToPlayerSize: true,
          testBandwidth: true,
        });

        hls.loadSource(activeSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setIsLoading(false);
          setHasError(false);
          if (data.levels && data.levels.length > 0) {
            const mapped = data.levels.map((lvl, idx) => ({
              id: idx,
              label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
              height: lvl.height || 0,
              bitrate: lvl.bitrate || 0,
            }));
            setQualities(mapped);
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (hls.levels && hls.levels[data.level]) {
            const lvl = hls.levels[data.level];
            setActiveResolution(lvl.height ? `${lvl.height}p` : "");
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn("HLS fatal error occurred:", data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (retryCount.current < MAX_AUTO_RETRIES) {
                  retryCount.current += 1;
                  console.info(`HLS network error recovery attempt ${retryCount.current}/${MAX_AUTO_RETRIES}...`);
                  triggerBuffering();
                  hls.startLoad();
                } else {
                  console.error("HLS network error: exhausted auto-retries.");
                  hls.destroy();
                  hlsRef.current = null;
                  clearBuffering();
                  setHasError(true);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                if (retryCount.current < MAX_AUTO_RETRIES) {
                  retryCount.current += 1;
                  console.info(`HLS media error recovery attempt ${retryCount.current}/${MAX_AUTO_RETRIES}...`);
                  triggerBuffering();
                  hls.recoverMediaError();
                } else {
                  console.error("HLS media error: exhausted auto-retries.");
                  hls.destroy();
                  hlsRef.current = null;
                  clearBuffering();
                  setHasError(true);
                }
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                clearBuffering();
                setHasError(true);
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // 2. Native HLS for iOS Safari and iOS WebViews (where MSE is unsupported)
        video.src = activeSrc;
        video.load();
      } else {
        // 3. Graceful handling of unsupported browser environments
        console.error("Adaptive HLS streaming is not supported on this browser.");
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      // Standard Progressive MP4 video
      video.src = activeSrc;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [activeSrc, reloadKey]);

  /*
   * ---------------------------------------------------------
   * CONTROLS VISIBILITY
   * ---------------------------------------------------------
   */

  const showPlayerControls = useCallback(() => {
    setShowControls(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    // Only auto-hide while video is actively playing!
    // When paused, controls remain permanently visible.
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    showPlayerControls();
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [showPlayerControls, isPlaying]);

  /*
   * ---------------------------------------------------------
   * PLAY / PAUSE
   * ---------------------------------------------------------
   */

  const togglePlayPause = useCallback(
    async (event?: React.MouseEvent | React.TouchEvent) => {
      event?.stopPropagation();

      const video = videoRef.current;
      if (!video) return;

      try {
        if (video.paused) {
          isAttemptingPlay.current = true;
          if (video.readyState < 3) {
            triggerBuffering();
          }
          await video.play();
          setIsPlaying(true);
        } else {
          isAttemptingPlay.current = false;
          video.pause();
          setIsPlaying(false);
          clearBuffering();
          setShowControls(true);
        }
      } catch (error) {
        isAttemptingPlay.current = false;
        clearBuffering();
        console.error("Playback error:", error);
      }
    },
    [clearBuffering, triggerBuffering]
  );

  /*
   * ---------------------------------------------------------
   * SKIP BACKWARD / FORWARD
   * ---------------------------------------------------------
   */

  const skipBackward = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      event?.stopPropagation();

      const video = videoRef.current;
      if (!video) return;

      const newTime = Math.max(0, video.currentTime - 10);
      video.currentTime = newTime;
      setCurrentTime(newTime);
      clearBuffering();
      setHasError(false);
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
      showPlayerControls();
    },
    [showPlayerControls, clearBuffering]
  );

  const skipForward = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      event?.stopPropagation();

      const video = videoRef.current;
      if (!video) return;

      const maxDuration = video.duration || duration || Infinity;
      const newTime = Math.min(
        maxDuration,
        video.currentTime + 10
      );
      video.currentTime = newTime;
      setCurrentTime(newTime);
      clearBuffering();
      setHasError(false);
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
      showPlayerControls();
    },
    [showPlayerControls, clearBuffering, duration]
  );

  /*
   * ---------------------------------------------------------
   * SEEK
   * ---------------------------------------------------------
   */

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    const newTime = Number(event.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    clearBuffering();
    setHasError(false);
    if (hlsRef.current) {
      hlsRef.current.startLoad();
    }
    showPlayerControls();
  };

  /*
   * ---------------------------------------------------------
   * VOLUME
   * ---------------------------------------------------------
   */

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.volume === 0) {
      video.volume = 1;
      setVolume(1);
    }

    showPlayerControls();
  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    const newVolume = Number(event.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;

    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    showPlayerControls();
  };

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  const toggleFullscreen = async (event?: React.MouseEvent) => {
    event?.stopPropagation();

    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      (video as any)?.webkitDisplayingFullscreen
    );

    try {
      if (!isCurrentlyFullscreen) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          // Native fullscreen on iOS Safari iPhone
          (video as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
        await lockMobileToLandscape();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else if (video && (video as any).webkitExitFullscreen) {
          (video as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        await restoreMobileOrientation();
      }
    } catch (error) {
      console.warn("Fullscreen toggle non-fatal notice:", error);
    }

    showPlayerControls();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const video = videoRef.current;
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement ||
        (video as any)?.webkitDisplayingFullscreen
      );

      setIsFullscreen(isFs);

      if (!isFs) {
        restoreMobileOrientation().catch(() => {});
      }
    };

    const handleIOSBeginFullscreen = () => {
      setIsFullscreen(true);
    };

    const handleIOSEndFullscreen = () => {
      setIsFullscreen(false);
      restoreMobileOrientation().catch(() => {});
    };

    const video = videoRef.current;

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleIOSBeginFullscreen);
      video.addEventListener("webkitendfullscreen", handleIOSEndFullscreen);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);

      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleIOSBeginFullscreen);
        video.removeEventListener("webkitendfullscreen", handleIOSEndFullscreen);
      }

      restoreMobileOrientation().catch(() => {});
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * PROGRESS PERSISTENCE
   * ---------------------------------------------------------
   */

  const reportProgress = useCallback(
    (sec: number, total: number) => {
      if (!content?.id || sec <= 0) return;
      const pct = Math.min(100, (sec / (total || 1)) * 100);

      streamingApi
        .updateProgress({
          content_id: content.id,
          episode_id: episodeId,
          progress_seconds: Math.floor(sec),
          duration_seconds: Math.max(1, Math.floor(total)),
        })
        .catch(() => {});

      historyApi
        .upsert({
          contentId: content.id,
          episodeId: episodeId,
          progress: pct,
          completed: pct >= 95,
        })
        .catch(() => {});
    },
    [content?.id, episodeId]
  );

  /*
   * ---------------------------------------------------------
   * VIDEO EVENTS
   * ---------------------------------------------------------
   */

  const handlePlay = () => {
    setIsPlaying(true);
    setHasError(false);
    const video = videoRef.current;
    if (video && video.readyState < 3) {
      triggerBuffering();
    } else {
      clearBuffering();
    }
  };

  const handlePlaying = () => {
    isAttemptingPlay.current = false;
    setIsPlaying(true);
    clearBuffering();
    setHasError(false);
    retryCount.current = 0;
  };

  const handlePause = () => {
    isAttemptingPlay.current = false;
    setIsPlaying(false);
    clearBuffering();
    setShowControls(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Video is advancing, so clear any lingering buffering state immediately
    if (isBuffering || isLoading) {
      clearBuffering();
    }

    setCurrentTime(video.currentTime);

    // Update ahead buffer calculation
    try {
      const buffered = video.buffered;
      if (buffered && buffered.length > 0) {
        for (let i = 0; i < buffered.length; i++) {
          if (buffered.start(i) <= video.currentTime && video.currentTime <= buffered.end(i)) {
            setBufferedEnd(buffered.end(i));
            break;
          }
        }
      }
    } catch {}

    // Debounced watch history reporting
    if (!saveTimeout.current && video.currentTime > 0) {
      saveTimeout.current = setTimeout(() => {
        saveTimeout.current = null;
        reportProgress(video.currentTime, video.duration || duration);
      }, 15000);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    clearBuffering();
    setHasError(false);

    // Initial resume seek
    if (initialResumeSeconds > 0 && !hasResumed.current) {
      video.currentTime = initialResumeSeconds;
      setCurrentTime(initialResumeSeconds);
      hasResumed.current = true;
    }
  };

  const handleWaiting = () => {
    if (isPlaying || isAttemptingPlay.current) {
      triggerBuffering();
    }
  };

  const handleStalled = () => {
    const video = videoRef.current;
    if (!video || (!isPlaying && !isAttemptingPlay.current)) return;

    // In WebKit / iOS Safari, the 'stalled' event fires whenever download pauses,
    // which happens normally when the browser buffer limit is satisfied.
    // If the browser already has forward buffer ahead of current playback, ignore 'stalled'.
    try {
      const buffered = video.buffered;
      if (buffered && buffered.length > 0) {
        for (let i = 0; i < buffered.length; i++) {
          if (buffered.start(i) <= video.currentTime && video.currentTime < buffered.end(i)) {
            if (buffered.end(i) - video.currentTime > 1.5) {
              return;
            }
          }
        }
      }
    } catch {}

    triggerBuffering();
  };

  const handleSelectQuality = useCallback((levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  }, []);

  const handleSeeking = () => {
    if (prolongedBufferTimeoutRef.current) {
      clearTimeout(prolongedBufferTimeoutRef.current);
      prolongedBufferTimeoutRef.current = null;
    }
    const video = videoRef.current;
    if (isPlaying && video && video.readyState < 3) {
      triggerBuffering();
    }
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    }
    if (video.readyState >= 3) {
      clearBuffering();
    }
    setHasError(false);
  };

  const handleCanPlay = () => {
    const video = videoRef.current;
    if (!video || video.readyState >= 3) {
      clearBuffering();
    }
    setHasError(false);
  };

  const handleError = () => {
    const video = videoRef.current;
    if (!video || !video.error) return;

    // Code 1 is MEDIA_ERR_ABORTED (user paused, changed video, or navigated away)
    if (video.error.code === 1) return;

    console.warn("V19Plus media playback warning (code):", video.error.code);

    // Resilient auto-recovery on network stall or dropped connection
    if (retryCount.current < MAX_AUTO_RETRIES) {
      retryCount.current += 1;
      const resumePos = video.currentTime || currentTime;
      console.info(`Attempting seamless stream reconnection ${retryCount.current}/${MAX_AUTO_RETRIES} at ${resumePos.toFixed(1)}s...`);
      triggerBuffering();

      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;

        if (hlsRef.current) {
          hlsRef.current.startLoad();
        } else {
          v.load();
          if (resumePos > 0) {
            v.currentTime = resumePos;
          }
        }

        v.play().catch(() => {
          // Play promise rejection will be caught safely
        });
      }, 1200);

      return;
    }

    // Only show fatal error if repeated retries fail
    console.error("V19Plus video playback exhausted auto-retries:", video.error);
    clearBuffering();
    setHasError(true);
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (onNextEpisode) {
      onNextEpisode();
    }
  };

  /*
   * ---------------------------------------------------------
   * KEYBOARD CONTROLS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlayPause();
          showPlayerControls();
          break;

        case "ArrowLeft":
          event.preventDefault();
          skipBackward();
          break;

        case "ArrowRight":
          event.preventDefault();
          skipForward();
          break;

        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;

        case "m":
        case "M":
          event.preventDefault();
          toggleMute(event as unknown as React.MouseEvent);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [
    togglePlayPause,
    skipBackward,
    skipForward,
  ]);

  /*
   * ---------------------------------------------------------
   * TIME FORMAT
   * ---------------------------------------------------------
   */

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "00:00";
    }

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(
        secs
      ).padStart(2, "0")}`;
    }

    return `${String(mins).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  };

  /*
   * ---------------------------------------------------------
   * IMPORTANT:
   * CLICKING THE VIDEO DOES NOT TOGGLE PLAYBACK.
   * ---------------------------------------------------------
   */

  const handleVideoAreaClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    const now = Date.now();
    // Double click -> Toggle Fullscreen (YouTube style)
    if (now - lastClickTimeRef.current < 300) {
      toggleFullscreen();
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;

    // Single click -> Toggle controls visibility
    if (showControls && isPlaying) {
      setShowControls(false);
    } else {
      showPlayerControls();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black select-none group flex items-center justify-center ${
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      } ${className}`}
      onMouseMove={showPlayerControls}
      onMouseEnter={showPlayerControls}
      onMouseLeave={() => {
        if (isPlaying) {
          if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current);
          }

          hideControlsTimer.current = setTimeout(() => {
            setShowControls(false);
          }, 1500);
        }
      }}
      onClick={handleVideoAreaClick}
    >
      {/* NATIVE VIDEO ELEMENT */}

      <video
        ref={videoRef}
        poster={poster}
        preload="metadata"
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        crossOrigin={activeSrc && (activeSrc.includes(".m3u8") || activeSrc.includes("/hls/")) ? "anonymous" : undefined}
        className="block max-w-full max-h-full w-full h-full object-contain bg-black m-auto"
        onPlay={handlePlay}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onWaiting={handleWaiting}
        onStalled={handleStalled}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={handleEnded}
      />

      {/* JIOHOTSTAR-STYLE CLEAN BUFFERING SPINNER (NO TEXT, PURE FLOATING SPINNER) */}
      {isBuffering && !hasError && (isPlaying || isAttemptingPlay.current) && (
        <div
          data-testid="buffering-spinner"
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-200"
        >
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-[3px] sm:border-4 border-white/20 border-t-[#FF5C00] animate-spin drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]" />
        </div>
      )}

      {/* STREAM PROCESSING / OPTIMIZATION OVERLAY */}
      {isProcessing && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-center z-30 p-6 backdrop-blur-md">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-[3px] sm:border-4 border-white/20 border-t-[#FF5C00] animate-spin drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] mb-4" />
          <div className="mb-2 text-lg font-bold text-white tracking-wide">
            Optimizing Video Stream
          </div>
          <p className="text-sm text-white/70 max-w-sm mb-5 leading-relaxed">
            This title is currently being prepared for high-speed adaptive streaming. Playback will begin automatically once ready.
          </p>
          {rawPreviewUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProcessing(false);
                setActiveSrc(formatStreamUrl(rawPreviewUrl));
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10 active:scale-95 cursor-pointer"
            >
              Watch Raw Master Preview
            </button>
          )}
        </div>
      )}

      {/* ERROR MODAL */}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-center z-30 p-6">
          <div className="mb-4 text-xl font-bold text-white">
            Unable to stream this video
          </div>
          <p className="text-sm text-white/70 max-w-sm mb-6">
            Unable to play this title right now. Please check your connection and try again.
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setHasError(false);
              isAttemptingPlay.current = true;
              setIsBuffering(true);
              retryCount.current = 0;
              setReloadKey((prev) => prev + 1);
            }}
            className="rounded-xl bg-white px-6 py-2.5 font-bold text-black transition hover:bg-white/90 shadow-xl active:scale-95 cursor-pointer"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* PROMINENT PURE-WHITE CENTER PLAY BUTTON WHEN PAUSED */}

      {!isPlaying && !isBuffering && !hasError && !isProcessing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={togglePlayPause}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 sm:h-24 sm:w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 hover:bg-black/90 text-white border-2 border-white/40 shadow-[0_15px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(255,92,0,0.4)] backdrop-blur-xl transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer group/centerplay"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#E04800] flex items-center justify-center shadow-lg transition-transform group-hover/centerplay:scale-105">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 fill-white ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* CONTROLS (ALWAYS 100% VISIBLE WHEN PAUSED OR ACTIVE) */}

      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "pointer-events-none opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* HIGH-CONTRAST MULTI-STOP GRADIENT BACKDROP */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/80 to-transparent" />

        <div className="relative px-3 sm:px-6 pb-4 sm:pb-6 pt-10 sm:pt-14">
          {/* HIGH CONTRAST PROGRESS / SEEKING BAR */}

          <div
            className="relative w-full mb-3 sm:mb-4 group/scrubber flex items-center py-2 cursor-pointer"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverX(e.clientX - rect.left);
              setHoverTime(pos * (duration || 0));
            }}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Hover Time Tooltip */}
            {hoverTime !== null && duration > 0 && (
              <div
                className="absolute -top-7 -translate-x-1/2 rounded-md bg-black/95 px-2.5 py-0.5 text-[11px] font-mono font-bold text-white border border-white/20 shadow-2xl pointer-events-none z-30"
                style={{ left: `${hoverX}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Visual Custom Progress Track Container */}
            <div className="relative w-full h-2 sm:h-2.5 bg-black/70 border border-white/20 rounded-full overflow-hidden transition-all group-hover/scrubber:h-3.5 shadow-inner">
              {/* Buffered Ahead Track */}
              <div
                className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-150"
                style={{ width: `${bufferPercent}%` }}
              />

              {/* Played Progress Track (Vibrant Brand Orange with Glow) */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF5C00] via-[#FF7A00] to-[#FFA84A] rounded-full shadow-[0_0_15px_rgba(255,92,0,0.9)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Glowing Scrubber Thumb Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-white rounded-full border-2 border-[#FF5C00] shadow-[0_0_10px_rgba(0,0,0,0.9)] pointer-events-none transition-all group-hover/scrubber:scale-125"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />

            {/* Interactive Range Input */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={handleSeek}
              aria-label="Video progress"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* HIGH CONTRAST CONTROL BAR */}

          <div className="flex items-center gap-2 sm:gap-3 text-white">
            {/* PLAY / PAUSE BUTTON */}

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlayPause}
              className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] hover:from-[#FF7A00] hover:to-[#FF5C00] text-white shadow-[0_0_20px_rgba(255,92,0,0.5)] border border-white/30 transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
            >
              {isPlaying ? (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 fill-white"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>



            {/* VOLUME & MUTE TOGGLE CAPSULE */}

            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/20 shadow-xl backdrop-blur-xl group/volume flex-shrink-0">
              <button
                type="button"
                aria-label={isMuted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center text-white hover:text-[#FF8A00] transition cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 stroke-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                  >
                    <path d="M11 5 6 9H3v6h3l5 4z" />
                    <path d="m17 9 4 4m0-4-4 4" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 stroke-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                  >
                    <path d="M11 5 6 9H3v6h3l5 4z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18 6a8.5 8.5 0 0 1 0 12" />
                  </svg>
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                className="w-16 sm:w-20 cursor-pointer accent-[#FF5C00] hidden md:block h-1.5 rounded-full bg-white/20"
              />
            </div>

            {/* TIME DISPLAY IN SOLID DARK FROSTED PILL */}

            <div className="ml-1 whitespace-nowrap px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 shadow-xl backdrop-blur-xl text-[10px] sm:text-xs font-mono font-bold text-white tracking-wider flex-shrink-0 flex items-center gap-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/80">{formatTime(duration)}</span>
            </div>

            {/* SPACER */}

            <div className="flex-1" />

            {/* QUALITY / ABR SELECTOR */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Quality settings"
                  onClick={() => setShowQualityMenu((prev) => !prev)}
                  className="flex h-9 sm:h-11 items-center gap-1.5 px-3 rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer flex-shrink-0 text-xs font-bold"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{currentQuality === -1 ? (activeResolution ? `Auto (${activeResolution})` : "Auto") : (qualities.find(q => q.id === currentQuality)?.label || "Auto")}</span>
                </button>

                {showQualityMenu && (
                  <div
                    className="absolute bottom-12 sm:bottom-14 right-0 min-w-[170px] rounded-xl bg-black/95 border border-white/20 p-1.5 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-white/50 tracking-wider border-b border-white/10 mb-1">
                      Stream Quality
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectQuality(-1)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                        currentQuality === -1 ? "bg-[#FF5C00] text-white font-bold" : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>Auto (Adaptive)</span>
                      {currentQuality === -1 && <span>✓</span>}
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSelectQuality(q.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                          currentQuality === q.id ? "bg-[#FF5C00] text-white font-bold" : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span>{q.label}</span>
                        {currentQuality === q.id && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FULLSCREEN BUTTON */}

            <button
              type="button"
              aria-label={
                isFullscreen
                  ? "Exit fullscreen"
                  : "Enter fullscreen"
              }
              onClick={toggleFullscreen}
              className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer flex-shrink-0"
            >
              {isFullscreen ? (
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 stroke-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                >
                  <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 stroke-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                >
                  <path d="M8 3H3v5M21 8V3h-5M3 16v5h5M16 21h5v-5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TOP HEADER: BACK BUTTON & TITLE IN SOLID FROSTED PILL */}

      <div
        className={`absolute left-3 top-3 sm:left-6 sm:top-6 flex items-center gap-2 sm:gap-4 transition-opacity duration-300 z-30 max-w-[90vw] ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.back();
          }}
          aria-label="Go back"
          className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-black/70 hover:bg-black/95 text-white backdrop-blur-xl border border-white/25 hover:border-white/40 transition active:scale-95 cursor-pointer shadow-2xl flex-shrink-0"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {title && (
          <span className="rounded-xl bg-black/70 px-3.5 py-2 text-xs sm:text-sm font-bold text-white border border-white/20 backdrop-blur-xl shadow-2xl truncate max-w-[200px] sm:max-w-md">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
