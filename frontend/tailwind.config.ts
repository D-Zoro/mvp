import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: '#F9F7F2',
        foreground: '#1A1A1A',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F3F1ED',
        },
        border: {
          DEFAULT: '#E5E7EB',
          focus: '#4F46E5',
        },
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
        },
        muted: {
          DEFAULT: '#A4ACAF',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      transitionTimingFunction: {
        'ease-out-custom': '[0.4, 0, 0.2, 1]',
      },
    },
  },
  plugins: [],
}

export default config
