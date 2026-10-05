import type { Config } from 'tailwindcss';

export default {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'n-black':   '#080808',
        'n-bg':      '#080808',
        'n-surface': '#141414',
        'n-raised':  '#1C1C1C',
        'n-divider': 'rgba(255, 255, 255, 0.08)',
        'n-red':     '#E50914',
        'n-red-hover':'#FF2236',
        'n-red-dark':'#B80710',
        'n-orange':  '#FF5C00',
        'n-text':    '#FFFFFF',
        'n-muted':   '#A3A3A3',
        'n-white':   '#FFFFFF',
        'v-black':        '#080808',
        'v-charcoal':     '#0C0C0C',
        'v-surface':      '#141414',
        'v-raised':       '#1E1E1E',
        'v-divider':      'rgba(255, 255, 255, 0.08)',
        'v-red':          '#E50914',
        'v-red-bright':   '#FF2236',
        'v-red-dark':     '#B80710',
        'v-orange':       '#FF5C00',
        'v-orange-light': '#FF7A00',
        'v-orange-deep':  '#E04800',
        'v-pure-white':   '#FFFFFF',
        'v-text':         '#FFFFFF',
        'v-muted':        '#A3A3A3',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '68': '17rem',
        '76': '19rem',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease forwards',
        'fade-up':   'fadeUp 0.4s ease forwards',
        'slide-up':  'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'scale-in':  'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer':   'shimmer 1.8s infinite linear',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      boxShadow: {
        'netflix':     '0 0 0 1px rgba(255,255,255,0.08), 0 8px 42px rgba(0,0,0,0.85)',
        'card':        '0 4px 24px rgba(0,0,0,0.65)',
        'hero':        '0 20px 80px rgba(0,0,0,0.85)',
        'red-glow':    '0 0 25px rgba(229,9,20,0.45), 0 0 50px rgba(229,9,20,0.15)',
        'red-sm':      '0 0 15px rgba(229,9,20,0.35)',
        'orange-glow': '0 0 25px rgba(255,92,0,0.45), 0 0 50px rgba(255,92,0,0.15)',
        'orange-sm':   '0 0 15px rgba(255,92,0,0.3)',
        'white-glow':  '0 0 25px rgba(255,255,255,0.3), 0 0 50px rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
