interface SubtitleOverlayProps {
  visible: boolean;
  text?: string;
}

export function SubtitleOverlay({ visible, text }: SubtitleOverlayProps) {
  if (!visible || !text) return null;

  return (
    <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20">
      <p className="bg-black/70 text-white text-lg px-4 py-2 rounded max-w-2xl text-center">
        {text}
      </p>
    </div>
  );
}
