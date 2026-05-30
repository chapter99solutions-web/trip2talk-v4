import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Latin glyphs render in DM Sans; Thai glyphs auto-fall back to Sarabun
        // (DM Sans has no Thai glyphs), so English keeps its font and Thai uses Sarabun.
        sans: ['DM Sans', 'Sarabun', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Sarabun', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      // Enlarged, more readable scale (target: Thai users 40+). Body sizes use a
      // generous 1.7 line-height for Thai; headings stay tighter.
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.65' }], // 12 → 14 (captions/small)
        sm: ['1rem', { lineHeight: '1.7' }], // 14 → 16 (buttons)
        base: ['1.125rem', { lineHeight: '1.7' }], // 16 → 18 (body)
        lg: ['1.35rem', { lineHeight: '1.55' }], // 18 → ~21.6 (+20%, section headings)
        xl: ['1.5rem', { lineHeight: '1.5' }], // 20 → 24 (+20%, section headings)
        '2xl': ['1.725rem', { lineHeight: '1.4' }], // 24 → ~27.6 (+15%, hero)
        '3xl': ['2.156rem', { lineHeight: '1.3' }], // 30 → ~34.5 (+15%, hero)
        '4xl': ['2.588rem', { lineHeight: '1.2' }], // 36 → ~41.4 (+15%, hero)
        '5xl': ['3.45rem', { lineHeight: '1.1' }], // 48 → ~55.2 (+15%)
        '6xl': ['4.3125rem', { lineHeight: '1.05' }], // 60 → ~69 (+15%)
        '7xl': ['5.175rem', { lineHeight: '1' }], // 72 → ~82.8 (+15%)
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
