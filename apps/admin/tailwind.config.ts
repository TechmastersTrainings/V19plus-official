import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'admin-bg':      '#0f0f0f',
        'admin-surface': '#1a1a1a',
        'admin-raised':  '#252525',
        'admin-divider': '#333333',
        'admin-accent':  '#FF5C00',
        'admin-accent-hover': '#FF7A00',
        'admin-text':    '#e5e5e5',
        'admin-muted':   '#808080',
      },
      fontFamily: {
        sans: ['"Inter"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
