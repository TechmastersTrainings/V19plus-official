interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`h-1 bg-white/20 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-n-red transition-all duration-300 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
