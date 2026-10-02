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

  const [activeSrc, setActiveSrc] = useState<string>(() => {
    const raw =
      propSrc ||
      content?.videoUrl ||
      (content as any)?.hls_manifest_key ||
      "";
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
  const [isProlongedBuffer, setIsProlongedBuffer] = useState(false);
  const [hasError, setHasError] = useState(false);
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
    setIsBuffering(false);
    setIsProlongedBuffer(false);
    setIsLoading(false);
  }, []);

  const triggerBuffering = useCallback(() => {
    if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    bufferTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        setIsBuffering(true);
        if (!prolongedBufferTimeoutRef.current) {
          prolongedBufferTimeoutRef.current = setTimeout(() => {
            setIsProlongedBuffer(true);
          }, 8000);
        }
      }
    }, 350);
  }, []);

  // Derive poster and title
  const poster =
    propPoster ||
    content?.thumbnailUrl ||
    (content as any)?.bannerUrl ||
    "";
  const title = propTitle || content?.title || "V19Plus";

  // Fetch authorized streaming URL from backend if not provided directly
  useEffect(() => {
    if (propSrc) {
      setActiveSrc(formatStreamUrl(propSrc));
      return;
    }

    if (!content?.id) return;

    let isMounted = true;
    streamingApi
      .getPlaybackAuth(content.id, episodeId)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.stream_url) {
          setActiveSrc(formatStreamUrl(res.data.stream_url));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback =
          content.videoUrl ||
          (content as any)?.hls_manifest_key ||
          "";
        if (fallback) setActiveSrc(formatStreamUrl(fallback));
      });

    return () => {
      isMounted = false;
    };
  }, [content?.id, episodeId, propSrc, content?.videoUrl]);

  // Attach media stream (Adaptive HLS with Hls.js or Native Safari HLS / MP4)
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
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS for Safari (macOS & iOS)
        video.src = activeSrc;
        video.load();
      } else if (Hls.isSupported()) {
        // Hls.js for Chrome, Firefox, Edge, Android
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
        });

        hls.loadSource(activeSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn("HLS fatal error occurred:", data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (retryCount.current < MAX_AUTO_RETRIES) {
                  retryCount.current += 1;
                  console.info(`HLS network error recovery attempt ${retryCount.current}/${MAX_AUTO_RETRIES}...`);
                  hls.startLoad();
                } else {
                  setHasError(true);
                  setIsLoading(false);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.info("HLS media error, recovering media stream...");
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setHasError(true);
                setIsLoading(false);
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        video.src = activeSrc;
        video.load();
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
    };
  }, [activeSrc]);

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
          setIsLoading(true);
          await video.play();
          setIsPlaying(true);
          setIsLoading(false);
        } else {
          video.pause();
          setIsPlaying(false);
          setShowControls(true);
        }
      } catch (error) {
        console.error("Playback error:", error);
        setIsLoading(false);
      }
    },
    []
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

      video.currentTime = Math.max(0, video.currentTime - 10);
      setCurrentTime(video.currentTime);
      showPlayerControls();
    },
    [showPlayerControls]
  );

  const skipForward = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      event?.stopPropagation();

      const video = videoRef.current;
      if (!video) return;

      video.currentTime = Math.min(
        video.duration || Infinity,
        video.currentTime + 10
      );
      setCurrentTime(video.currentTime);
      showPlayerControls();
    },
    [showPlayerControls]
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
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }

    showPlayerControls();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
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
    clearBuffering();
    setHasError(false);
  };

  const handlePlaying = () => {
    setIsPlaying(true);
    clearBuffering();
    setHasError(false);
    retryCount.current = 0;
  };

  const handlePause = () => {
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
    if (isPlaying) {
      triggerBuffering();
    }
  };

  const handleStalled = () => {
    if (isPlaying) {
      triggerBuffering();
    }
  };

  const handleCanPlay = () => {
    clearBuffering();
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
      setIsLoading(true);

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
    setIsLoading(false);
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
      className={`relative w-full h-full overflow-hidden bg-black select-none group ${
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
        src={activeSrc && !activeSrc.includes(".m3u8") ? activeSrc : undefined}
        poster={poster}
        preload="metadata"
        playsInline
        crossOrigin={activeSrc && (activeSrc.includes(".m3u8") || activeSrc.includes("/hls/")) ? "anonymous" : undefined}
        className="block h-full w-full object-contain bg-black"
        onPlay={handlePlay}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onStalled={handleStalled}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={handleEnded}
      />

      {/* ACTIVE PLAYBACK BUFFERING INDICATOR (NETFLIX STYLE) */}

      {isBuffering && isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/75 backdrop-blur-md px-7 py-5 shadow-2xl border border-white/10 max-w-sm text-center pointer-events-auto">
            <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-3 sm:border-4 border-white/20 border-t-white shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
            <span className="text-xs font-semibold text-white/90 tracking-wider">
              {isProlongedBuffer ? "Buffering high-bitrate stream..." : "Buffering..."}
            </span>
            {isProlongedBuffer && (
              <div className="flex flex-col items-center gap-2 mt-1">
                <p className="text-[11px] text-white/60 leading-relaxed">
                  This video stream is waiting on incoming packets.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = videoRef.current;
                    if (v) {
                      v.currentTime = Math.max(0, v.currentTime - 0.5);
                      v.play().catch(() => {});
                    }
                  }}
                  className="mt-1 px-3 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-xs font-medium transition cursor-pointer border border-white/10"
                >
                  Force Resume
                </button>
              </div>
            )}
          </div>
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
              const video = videoRef.current;
              if (!video) return;

              setHasError(false);
              setIsLoading(true);
              retryCount.current = 0;

              const resumePos = currentTime;
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              } else {
                video.load();
                if (resumePos > 0) {
                  video.currentTime = resumePos;
                }
              }

              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                })
                .catch((error) => {
                  console.warn("Retry playback caught rejected promise:", error);
                  setIsLoading(false);
                });
            }}
            className="rounded-xl bg-white px-6 py-2.5 font-bold text-black transition hover:bg-white/90 shadow-xl active:scale-95 cursor-pointer"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* PROMINENT PURE-WHITE CENTER PLAY BUTTON WHEN PAUSED */}

      {!isPlaying && !hasError && (
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

            {/* BACKWARD 10 SECONDS */}

            <button
              type="button"
              aria-label="Skip backward 10 seconds"
              onClick={skipBackward}
              className="group/skip relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer flex-shrink-0"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 stroke-white"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 14 5 10l4-4" />
                <path d="M5 10h7a6 6 0 1 1-5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded-md bg-black/95 text-white border border-white/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold opacity-0 transition group-hover/skip:opacity-100 shadow-md">
                -10s
              </span>
            </button>

            {/* FORWARD 10 SECONDS */}

            <button
              type="button"
              aria-label="Skip forward 10 seconds"
              onClick={skipForward}
              className="group/skip relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer flex-shrink-0"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 stroke-white"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 14 4-4-4-4" />
                <path d="M19 10h-7a6 6 0 1 0 5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded-md bg-black/95 text-white border border-white/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold opacity-0 transition group-hover/skip:opacity-100 shadow-md">
                +10s
              </span>
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
