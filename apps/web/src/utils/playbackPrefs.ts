const PLAYBACK_KEY = 'v19-playback-prefs';

export interface PlaybackPrefs {
  autoplayNext: boolean;
  defaultSpeed: number;
  subtitles: boolean;
}

export function loadPlaybackPrefs(): PlaybackPrefs {
  if (typeof window === 'undefined') {
    return { autoplayNext: true, defaultSpeed: 1, subtitles: false };
  }
  try {
    const raw = localStorage.getItem(PLAYBACK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { autoplayNext: true, defaultSpeed: 1, subtitles: false };
}

export function getPlaybackPrefs(): PlaybackPrefs {
  return loadPlaybackPrefs();
}

export function savePlaybackPrefs(prefs: PlaybackPrefs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYBACK_KEY, JSON.stringify(prefs));
}
