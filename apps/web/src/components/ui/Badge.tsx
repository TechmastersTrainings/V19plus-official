interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'orange' | 'new' | 'top' | 'original' | 'quality';
}

const variants = {
  red:      'bg-n-red text-white',
  orange:   'bg-n-red text-white',
  new:      'bg-emerald-600 text-white',
  top:      'bg-n-red text-white',
  original: 'bg-n-red text-white',
  quality:  'bg-black/60 text-white border border-white/20',
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
