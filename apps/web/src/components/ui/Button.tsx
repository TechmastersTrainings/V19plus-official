import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:   'bg-n-white hover:bg-n-white/80 text-n-black font-bold',
  secondary: 'bg-n-muted/30 hover:bg-n-muted/50 text-n-white border border-n-white/20 backdrop-blur-sm',
  ghost:     'bg-transparent hover:bg-n-white/10 text-n-text',
  danger:    'bg-n-red hover:bg-n-red-hover text-white font-semibold',
  outline:   'bg-transparent border border-n-text/60 hover:border-n-white text-n-text hover:text-n-white',
};

const sizes = {
  sm: 'px-4 py-1.5 text-sm gap-1.5',
  md: 'px-6 py-2.5 text-sm gap-2',
  lg: 'px-8 py-3.5 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center rounded font-semibold
        transition-all duration-200 active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
