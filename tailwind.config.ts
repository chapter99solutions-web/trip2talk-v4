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
      colors: {
        navy: { DEFAULT: '#0d1b2a', light: '#1a3a5a', dark: '#080f17' },
        teal: { DEFAULT: '#4dd8a0', dark: '#0F6E56', light: '#E1F5EE' },
        gold: { DEFAULT: '#d4af37', dark: '#9a7d1e' },
        pink: { DEFAULT: '#D4537E', dark: '#993556', light: '#FBEAF0' },
      },
    },
  },
  plugins: [],
} satisfies Config;
