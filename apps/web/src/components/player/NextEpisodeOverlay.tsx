import { useEffect, useState } from 'react';

interface NextEpisodeOverlayProps {
  onNext: () => void;
  onCancel: () => void;
  title?: string;
}

export function NextEpisodeOverlay({ onNext, onCancel, title }: NextEpisodeOverlayProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      onNext();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onNext]);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
      <div className="bg-v-surface border border-v-divider rounded-xl p-8 text-center max-w-sm">
        <p className="text-v-muted text-sm mb-2">Up next</p>
        <p className="text-lg font-semibold mb-4">{title || 'Next Episode'}</p>
        <p className="text-3xl font-bold text-v-orange mb-6">{countdown}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onNext}
            className="px-5 py-2 bg-v-orange text-white rounded-lg text-sm"
          >
            Play Now
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-v-raised text-v-text rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
