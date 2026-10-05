interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'orange' | 'new' | 'top' | 'original' | 'quality';
}

const variants = {
  red:      'bg-[#E50914] text-white',
  orange:   'bg-[#FF5C00] text-white',
  new:      'bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-bold',
  top:      'bg-[#E50914] text-white font-bold',
  original: 'bg-gradient-to-r from-[#E50914] to-[#FF5C00] text-white font-bold',
  quality:  'bg-black/70 text-white border border-white/20',
};

export function Badge({ children, variant = 'red' }: BadgeProps) {
  return (
    <span
      className={`
        inline-block px-2 py-0.5 text-2xs font-bold uppercase tracking-widest rounded-sm
        ${variants[variant]}
      `}
    >
      {children}
    </span>
  );
}
