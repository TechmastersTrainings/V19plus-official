export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

export function calculateProgressPercentage(currentSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.min(Math.round((currentSeconds / totalSeconds) * 100), 100);
}
