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
  const [isLoading, setIsLoading] = useState(true);
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

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

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
          await video.play();
        } else {
          video.pause();
        }
      } catch (error) {
        console.error("Playback error:", error);
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
    setHasError(false);
  };

  const handlePlaying = () => {
    setIsPlaying(true);
    setIsLoading(false);
    setHasError(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
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
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    console.error("V19Plus video playback error");
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
    if (!Number.isFinite(seconds)) {
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
     *
     * This is intentional.
     *
     * Clicking the video itself should only reveal controls.
     * Playback is controlled by the actual Play/Pause button.
     */

    event.stopPropagation();
    showPlayerControls();
  };

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
      {/* VIDEO */}

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

      {/* LOADING */}

      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FF5C00]" />
        </div>
      )}

      {/* ERROR */}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center">
          <div className="mb-4 text-lg font-semibold text-white">
            Unable to play this video
          </div>

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
                .catch((error) => {
                  console.error("Retry playback error:", error);
                });
            }}
            className="rounded-lg bg-white px-5 py-2 font-semibold text-black transition hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* CENTER PLAY BUTTON */}

      {!isPlaying && !hasError && !isLoading && (
        <button
          type="button"
          aria-label="Play video"
          onClick={togglePlayPause}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl transition hover:scale-110 hover:bg-white"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* CONTROLS */}

      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showControls
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* GRADIENT */}

        <div className="pointer-events-none absolute inset-0 -top-24 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div className="relative px-4 pb-3 pt-10">
          {/* PROGRESS */}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label="Video progress"
            className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#FF5C00]"
          />

          {/* CONTROL BAR */}

          <div className="flex items-center gap-3 text-white">
            {/* PLAY / PAUSE */}

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlayPause}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            >
              {isPlaying ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* BACKWARD 10 */}

            <button
              type="button"
              aria-label="Skip backward 10 seconds"
              onClick={skipBackward}
              className="group/skip relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 14 5 10l4-4" />
                <path d="M5 10h7a6 6 0 1 1-5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[10px] opacity-0 transition group-hover/skip:opacity-100">
                10 sec
              </span>
            </button>

            {/* FORWARD 10 */}

            <button
              type="button"
              aria-label="Skip forward 10 seconds"
              onClick={skipForward}
              className="group/skip relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 14 4-4-4-4" />
                <path d="M19 10h-7a6 6 0 1 0 5.2 9" />
              </svg>

              <span className="absolute -top-8 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[10px] opacity-0 transition group-hover/skip:opacity-100">
                10 sec
              </span>
            </button>

            {/* VOLUME */}

            <button
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            >
              {isMuted || volume === 0 ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5 6 9H3v6h3l5 4z" />
                  <path d="m17 9 4 4m0-4-4 4" />
                </svg>
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5 6 9H3v6h3l5 4z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18 6a8.5 8.5 0 0 1 0 12" />
                </svg>
              )}
            </button>

            {/* VOLUME SLIDER */}

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="hidden w-20 cursor-pointer accent-[#FF5C00] sm:block"
            />

            {/* TIME */}

            <div className="ml-1 whitespace-nowrap text-xs text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* SPACER */}

            <div className="flex-1" />

            {/* FULLSCREEN */}

            <button
              type="button"
              aria-label={
                isFullscreen
                  ? "Exit fullscreen"
                  : "Enter fullscreen"
              }
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            >
              {isFullscreen ? (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5" />
                </svg>
              ) : (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3H3v5M21 8V3h-5M3 16v5h5M16 21h5v-5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TITLE & BACK BUTTON */}

      <div
        className={`absolute left-4 top-4 flex items-center gap-3 transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.back();
          }}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {title && (
          <span className="rounded-xl bg-black/60 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-md">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
