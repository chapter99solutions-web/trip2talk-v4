import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
      colors: {
        navy: { DEFAULT: '#0d1b2a', light: '#1a3a5a', dark: '#080f17' },
        teal: { DEFAULT: '#4dd8a0', dark: '#0F6E56', light: '#E1F5EE' },
        gold: { DEFAULT: '#d4af37', dark: '#9a7d1e' },
        pink: { DEFAULT: '#D4537E', dark: '#993556', light: '#FBEAF0' },
        sage: {
          50: '#EFF3EE',
          100: '#E2E8E0',
          200: '#D0D7CE',
          500: '#639922',
          700: '#3B6D11',
          900: '#1C1C1E',
        },
        messenger: '#0a7cff',
      },
    },
  },
  plugins: [],
} satisfies Config;
