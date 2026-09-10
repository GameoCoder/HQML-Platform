/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#050406',
          50: '#0c0a0e',
          100: '#09070a',
        },
        panel: '#0b0a0d',
        crimson: {
          950: '#210309',
          900: '#3a0512',
          800: '#54081c',
          700: '#7a0e28',
          600: '#a51434',
          500: '#d81b40',
          400: '#f0355a',
          300: '#ff6b85',
        },
        blush: {
          500: '#ff8fa3',
          400: '#ffabb9',
          300: '#ffc7d1',
          200: '#ffe1e6',
          100: '#fff2f4',
        },
        mist: '#f3eef0',
        success: {
          DEFAULT: '#22e096',
          soft: '#0d3d2c',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 0.55, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.06)' },
        },
        'scan-border': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        'drift': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-40px,-30px,0)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: 0.15 },
          '50%': { opacity: 0.9 },
        },
        'orbit-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'drift': 'drift 30s linear infinite alternate',
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'orbit-spin': 'orbit-spin 12s linear infinite',
      },
      boxShadow: {
        'glow-crimson': '0 0 40px -8px rgba(216,27,64,0.55)',
        'glow-blush': '0 0 30px -6px rgba(255,143,163,0.4)',
        'glow-success': '0 0 30px -6px rgba(34,224,150,0.45)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
