import { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Settings, FastForward, PictureInPicture2, Check } from 'lucide-react';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerControlsProps {
  duration: number;
  onSeek: (time: number) => void;
  onNextEpisode?: () => void;
  showNext?: boolean;
  onPiP?: () => void;
  // Per-instance state overrides for multi-player isolation
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  isMuted?: boolean;
  showControls?: boolean;
  playbackSpeed?: number;
  subtitles?: boolean;
  isFullscreen?: boolean;
  qualities?: { height: number; bitrate?: number; index: number; label?: string; url?: string }[];
  currentQuality?: number;
  onTogglePlay?: () => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onToggleSubtitles?: () => void;
  onSetPlaybackSpeed?: (speed: number) => void;
  onSetVolume?: (volume: number) => void;
  onSetQuality?: (qualityIndex: number) => void;
}

export function PlayerControls({
  duration,
  onSeek,
  onNextEpisode,
  showNext,
  onPiP,
  isPlaying: propIsPlaying,
  progress: propProgress,
  volume: propVolume,
  isMuted: propIsMuted,
  showControls: propShowControls,
  playbackSpeed: propPlaybackSpeed,
  subtitles: propSubtitles,
  isFullscreen: propIsFullscreen,
  qualities: propQualities,
  currentQuality: propCurrentQuality,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onToggleSubtitles,
  onSetPlaybackSpeed,
  onSetVolume,
  onSetQuality,
}: PlayerControlsProps) {
  const store = usePlayerStore();

  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : store.isPlaying;
  const progress = propProgress !== undefined ? propProgress : store.progress;
  const volume = propVolume !== undefined ? propVolume : store.volume;
  const isMuted = propIsMuted !== undefined ? propIsMuted : store.isMuted;
  const showControls = propShowControls !== undefined ? propShowControls : store.showControls;
  const playbackSpeed = propPlaybackSpeed !== undefined ? propPlaybackSpeed : store.playbackSpeed;
  const subtitles = propSubtitles !== undefined ? propSubtitles : store.subtitles;
  const isFullscreen = propIsFullscreen !== undefined ? propIsFullscreen : store.isFullscreen;
  const qualities = propQualities !== undefined ? propQualities : store.qualities;
  const currentQuality = propCurrentQuality !== undefined ? propCurrentQuality : store.currentQuality;

  const handleTogglePlay = onTogglePlay || (() => (isPlaying ? store.pause() : store.resume()));
  const handleToggleMute = onToggleMute || store.toggleMute;
  const handleToggleFullscreen = onToggleFullscreen || store.toggleFullscreen;
  const handleToggleSubtitles = onToggleSubtitles || store.toggleSubtitles;
  const handleSetSpeed = onSetPlaybackSpeed || store.setPlaybackSpeed;
  const handleSetVolume = onSetVolume || store.setVolume;
  const handleSetQuality = onSetQuality || store.setQuality;

  const [showSettings, setShowSettings] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  // Close settings on outside click
  useEffect(() => {
    const handler = () => setShowSettings(false);
    if (showSettings) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showSettings]);

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(pct * duration);
    setHoverX(e.clientX);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * duration);
  };

  if (!showControls) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 animate-fade-in select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none h-48 -top-20" />

      <div className="relative px-6 sm:px-12 pb-6 pt-10">
        {/* Seek Bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-white/20 rounded-full mb-5 cursor-pointer group/progress transition-all hover:h-2.5"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onClick={handleProgressClick}
        >
          {/* Filled with brand orange */}
          <div
            className="absolute left-0 top-0 h-full bg-[#FF5C00] rounded-full shadow-[0_0_12px_#FF5C00]"
            style={{ width: `${pct}%` }}
          />

          {/* Scrubber Knob */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,92,0,0.8)] border-2 border-[#FF5C00]"
            style={{ left: `${pct}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-9 -translate-x-1/2 bg-[#14110D]/95 border border-white/10 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg pointer-events-none shadow-xl backdrop-blur-md"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Play / Pause Toggle */}
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,92,0,0.4)] active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => onSeek(Math.max(0, progress - 10))}
              className="text-[#C8C2B8] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors hidden sm:flex items-center justify-center"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => onSeek(Math.min(duration, progress + 10))}
              className="text-[#C8C2B8] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors hidden sm:flex items-center justify-center"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={handleToggleMute}
                className="text-[#C8C2B8] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Toggle mute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="hidden sm:block w-0 group-hover/vol:w-24 overflow-hidden transition-all duration-300">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleSetVolume(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#FF5C00' }}
                />
              </div>
            </div>

            {/* Playback Time */}
            <span className="text-xs sm:text-sm text-[#A49C90] font-mono font-medium hidden sm:inline-block">
              <span className="text-white font-bold">{formatTime(progress)}</span> / {formatTime(duration)}
            </span>
          </div>

          {/* Skip Intro Button */}
          {progress > 10 && progress < 85 && duration > 150 && (
            <button
              onClick={() => onSeek(85)}
              className="absolute right-8 sm:right-14 -top-14 z-30 px-5 py-2.5 bg-[#14110D]/90 border border-white/20 hover:border-[#FF5C00] text-white text-xs sm:text-sm font-black rounded-xl backdrop-blur-xl transition-all active:scale-95 shadow-2xl flex items-center gap-2 hover:text-[#FF5C00]"
            >
              <FastForward className="w-4 h-4 text-[#FF5C00]" />
              <span>Skip Intro</span>
            </button>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Next Episode Button */}
            {showNext && onNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-white/10 hover:bg-[#FF5C00] text-white rounded-xl transition-colors border border-white/10"
              >
                <span>Next Ep</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Subtitles CC */}
            <button
              onClick={handleToggleSubtitles}
              className={`text-xs font-black px-2.5 py-1.5 rounded-xl border transition-all ${subtitles
                  ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-[0_0_10px_rgba(255,92,0,0.4)]'
                  : 'text-[#C8C2B8] border-white/15 hover:border-white/30 hover:text-white bg-white/5'
                }`}
              aria-label="Toggle Subtitles"
            >
              CC
            </button>

            {/* Settings (Speed & Quality) */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                className={`p-2 rounded-xl transition-colors ${showSettings ? 'text-[#FF5C00] bg-white/10' : 'text-[#C8C2B8] hover:text-white hover:bg-white/5'
                  }`}
                aria-label="Player Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && (
                <div
                  className="absolute bottom-full right-0 mb-3 bg-[#14110D]/98 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl min-w-[220px] flex flex-col p-3 gap-2.5 text-white z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Speed Selector */}
                  <div>
                    <p className="text-[10px] font-black text-[#8C8478] uppercase tracking-wider px-2 mb-1.5">
                      Playback Speed
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          onClick={() => { handleSetSpeed(s); setShowSettings(false); }}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${playbackSpeed === s
                              ? 'bg-[#FF5C00] text-white'
                              : 'bg-white/5 text-[#C8C2B8] hover:bg-white/10 hover:text-white'
                            }`}
                        >
                          {s === 1 ? 'Normal' : `${s}×`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Quality Selector */}
                  <div className="border-t border-white/10 pt-2.5">
                    <p className="text-[10px] font-black text-[#8C8478] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                      <span>Stream Quality</span>
                      <span className="text-[9px] text-[#FF5C00] font-semibold">
                        {currentQuality === -1 ? 'Auto (ABR)' : 'Locked'}
                      </span>
                    </p>
                    <button
                      onClick={() => { handleSetQuality(-1); setShowSettings(false); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${currentQuality === -1 ? 'text-[#FF5C00] font-bold bg-[#FF5C00]/10' : 'text-[#C8C2B8] hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <div>
                        <div className="font-bold">Auto (Recommended)</div>
                        <div className="text-[10px] text-white/50">Adaptive bitrate • Continuous stream</div>
                      </div>
                      {currentQuality === -1 && <Check className="w-4 h-4 text-[#FF5C00] shrink-0" />}
                    </button>
                    {(qualities.length > 0
                      ? qualities
                      : [
                        { height: 1080, index: 0, label: '1080p' },
                        { height: 720, index: 1, label: '720p' },
                        { height: 480, index: 2, label: '480p' },
                        { height: 360, index: 3, label: '360p' },
                        { height: 240, index: 4, label: '240p' },
                        { height: 180, index: 5, label: '180p' },
                      ]
                    ).map((q) => (
                      <button
                        key={q.index}
                        onClick={() => { handleSetQuality(q.index); setShowSettings(false); }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${currentQuality === q.index ? 'text-[#FF5C00] font-bold bg-[#FF5C00]/10' : 'text-[#C8C2B8] hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        <div>
                          <div className="font-bold">{q.label || `${q.height}p`}</div>
                          <div className="text-[10px] text-white/40">
                            {q.bitrate ? `${Math.round(q.bitrate / 1000)} kbps` : ''}
                          </div>
                        </div>
                        {currentQuality === q.index && <Check className="w-4 h-4 text-[#FF5C00] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            {onPiP && (
              <button
                onClick={onPiP}
                className="text-[#C8C2B8] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors hidden md:block"
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={handleToggleFullscreen}
              className="text-[#C8C2B8] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

