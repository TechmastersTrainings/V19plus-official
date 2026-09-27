import type { Config } from 'tailwindcss';

export default {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'n-black':   '#0A0806',
        'n-bg':      '#0A0806',
        'n-surface': '#181410',
        'n-raised':  '#14110D',
        'n-divider': 'rgba(255, 255, 255, 0.08)',
        'n-red':     '#FF5C00',
        'n-red-hover':'#E04F00',
        'n-red-dark':'#B83C00',
        'n-text':    '#FAF6EF',
        'n-muted':   '#8C8478',
        'n-white':   '#FAF6EF',
        'v-black':        '#0A0806',
        'v-surface':      '#181410',
        'v-raised':       '#14110D',
        'v-divider':      'rgba(255, 255, 255, 0.08)',
        'v-orange':       '#FF5C00',
        'v-orange-light': '#FF8A00',
        'v-orange-deep':  '#D44900',
        'v-text':         '#FAF6EF',
        'v-muted':        '#8C8478',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
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
        'netflix':    '0 0 0 1px rgba(255,255,255,0.08), 0 8px 42px rgba(0,0,0,0.85)',
        'card':       '0 4px 24px rgba(0,0,0,0.65)',
        'hero':       '0 20px 80px rgba(0,0,0,0.85)',
        'orange-glow':'0 0 25px rgba(255,92,0,0.4), 0 0 50px rgba(255,92,0,0.15)',
        'orange-sm':  '0 0 15px rgba(255,92,0,0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
