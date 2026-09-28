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

  const [activeSrc, setActiveSrc] = useState<string>(() => {
    return (
      propSrc ||
      content?.videoUrl ||
      (content as any)?.hls_manifest_key ||
      ""
    );
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

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
      setActiveSrc(propSrc);
      return;
    }

    if (!content?.id) return;

    let isMounted = true;
    streamingApi
      .getPlaybackAuth(content.id, episodeId)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.stream_url) {
          setActiveSrc(res.data.stream_url);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback =
          content.videoUrl ||
          (content as any)?.hls_manifest_key ||
          "";
        if (fallback) setActiveSrc(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [content?.id, episodeId, propSrc, content?.videoUrl]);

  // Ensure video element loads when source becomes available
  useEffect(() => {
    if (activeSrc && videoRef.current) {
      videoRef.current.load();
    }
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
    setIsLoading(false);
    setHasError(false);
  };

  const handlePlaying = () => {
    setIsPlaying(true);
    setIsLoading(false);
    setHasError(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
    setIsLoading(false);
    setShowControls(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

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
    setIsLoading(false);
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
      setIsLoading(true);
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    const video = videoRef.current;
    // Autoplay or abort is not a real stream failure
    if (video && video.error && video.error.code !== 1) {
      console.error("V19Plus video playback error:", video.error);
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    }
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
    /*
     * Do NOT call togglePlayPause() here.
     * Clicking the video itself only reveals controls.
     * Playback is controlled by the actual Play/Pause button.
     */
    event.stopPropagation();
    showPlayerControls();
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black select-none group ${className}`}
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
        src={activeSrc}
        poster={poster}
        preload="metadata"
        playsInline
        className="block h-full w-full object-contain bg-black"
        onPlay={handlePlay}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={handleEnded}
      />

      {/* ACTIVE PLAYBACK BUFFERING INDICATOR */}

      {isLoading && isPlaying && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}

      {/* ERROR MODAL */}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-center z-30 p-6">
          <div className="mb-4 text-xl font-bold text-white">
            Unable to stream this video
          </div>
          <p className="text-sm text-white/70 max-w-sm mb-6">
            The video connection was interrupted or is still being prepared by the server.
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const video = videoRef.current;
              if (!video) return;

              setHasError(false);
              setIsLoading(true);
              video.load();
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                })
                .catch((error) => {
                  console.error("Retry playback error:", error);
                  setIsLoading(false);
                });
            }}
            className="rounded-xl bg-white px-6 py-2.5 font-bold text-black transition hover:bg-white/90 shadow-xl active:scale-95"
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
          className="absolute left-1/2 top-1/2 flex h-20 w-20 sm:h-24 sm:w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.7)] transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer group/centerplay"
        >
          <svg
            className="w-10 h-10 sm:w-12 sm:h-12 fill-black ml-1.5 transition-transform group-hover/centerplay:scale-105"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* CONTROLS (ALWAYS 100% VISIBLE WHEN PAUSED) */}

      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "pointer-events-none opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* HIGH-CONTRAST GRADIENT BACKDROP */}

        <div className="pointer-events-none absolute inset-0 -top-28 bg-gradient-to-t from-black via-black/80 to-transparent" />

        <div className="relative px-6 pb-6 pt-12">
          {/* HIGH CONTRAST WHITE PROGRESS / SEEKING BAR */}

          <div className="relative w-full mb-4 group/scrubber flex items-center">
            {/* Visual Custom White Progress Track */}
            <div className="w-full h-2 bg-white/25 rounded-full overflow-hidden transition-all group-hover/scrubber:h-3">
              <div
                className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Glowing White Thumb Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-black shadow-[0_0_8px_white] pointer-events-none transition-all group-hover/scrubber:scale-125"
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

          {/* HIGH CONTRAST WHITE CONTROL BAR */}

          <div className="flex items-center gap-4 text-white">
            {/* PLAY / PAUSE BUTTON */}

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlayPause}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5 fill-black"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 fill-black ml-0.5"
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
              className="group/skip relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/20 transition cursor-pointer"
            >
              <svg
                className="w-6 h-6 stroke-white"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 14 5 10l4-4" />
                <path d="M5 10h7a6 6 0 1 1-5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded-md bg-white text-black px-2 py-0.5 text-[11px] font-bold opacity-0 transition group-hover/skip:opacity-100 shadow-md">
                -10s
              </span>
            </button>

            {/* FORWARD 10 SECONDS */}

            <button
              type="button"
              aria-label="Skip forward 10 seconds"
              onClick={skipForward}
              className="group/skip relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/20 transition cursor-pointer"
            >
              <svg
                className="w-6 h-6 stroke-white"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 14 4-4-4-4" />
                <path d="M19 10h-7a6 6 0 1 0 5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded-md bg-white text-black px-2 py-0.5 text-[11px] font-bold opacity-0 transition group-hover/skip:opacity-100 shadow-md">
                +10s
              </span>
            </button>

            {/* VOLUME & MUTE TOGGLE */}

            <div className="flex items-center gap-2 group/volume">
              <button
                type="button"
                aria-label={isMuted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/20 transition cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <svg
                    className="w-6 h-6 stroke-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                  >
                    <path d="M11 5 6 9H3v6h3l5 4z" />
                    <path d="m17 9 4 4m0-4-4 4" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 stroke-white"
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
                className="w-20 cursor-pointer accent-white hidden sm:block h-1.5 rounded-full"
              />
            </div>

            {/* TIME DISPLAY IN BRIGHT WHITE */}

            <div className="ml-2 whitespace-nowrap text-xs sm:text-sm font-mono font-bold text-white tracking-wider">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/60 mx-1.5">/</span>
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/20 transition cursor-pointer"
            >
              {isFullscreen ? (
                <svg
                  className="w-6 h-6 stroke-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                >
                  <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 stroke-white"
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

      {/* TOP HEADER: BACK BUTTON & TITLE IN CRISP WHITE */}

      <div
        className={`absolute left-6 top-6 flex items-center gap-4 transition-opacity duration-300 z-30 ${
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30 transition hover:bg-white/35 active:scale-95 cursor-pointer shadow-lg"
        >
          <svg className="h-5 w-5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {title && (
          <span className="rounded-xl bg-black/70 px-4 py-2 text-sm sm:text-base font-bold text-white border border-white/20 backdrop-blur-md shadow-xl">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
