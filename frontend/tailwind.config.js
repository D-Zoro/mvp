/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Primary colors
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          on: 'var(--on-primary)',
          'on-container': 'var(--on-primary-container)',
          fixed: 'var(--primary-fixed)',
          'fixed-dim': 'var(--primary-fixed-dim)',
          'on-fixed': 'var(--on-primary-fixed)',
          'on-fixed-variant': 'var(--on-primary-fixed-variant)',
        },
        // Surface colors
        surface: {
          DEFAULT: 'var(--surface)',
          bright: 'var(--surface-bright)',
          container: 'var(--surface-container)',
          'container-high': 'var(--surface-container-high)',
          'container-highest': 'var(--surface-container-highest)',
          'container-low': 'var(--surface-container-low)',
          'container-lowest': 'var(--surface-container-lowest)',
          dim: 'var(--surface-dim)',
          tint: 'var(--surface-tint)',
          variant: 'var(--surface-variant)',
          on: 'var(--on-surface)',
          'on-variant': 'var(--on-surface-variant)',
        },
        // Background colors
        background: {
          DEFAULT: 'var(--background)',
          on: 'var(--on-background)',
        },
        // Secondary colors
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
          on: 'var(--on-secondary)',
          'on-container': 'var(--on-secondary-container)',
        },
        // Tertiary colors
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
          on: 'var(--on-tertiary)',
          'on-container': 'var(--on-tertiary-container)',
          fixed: 'var(--tertiary-fixed)',
        },
        // Error colors
        error: {
          DEFAULT: 'var(--error)',
          container: 'var(--error-container)',
          on: 'var(--on-error)',
          'on-container': 'var(--on-error-container)',
        },
        // Outline colors
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)',
        },
        // Inverse colors
        inverse: {
          surface: 'var(--inverse-surface)',
          'on-surface': 'var(--inverse-on-surface)',
          primary: 'var(--inverse-primary)',
        },
        // Utility colors
        scrim: 'var(--scrim)',
        shadow: 'var(--shadow)',
      },
      spacing: {
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
      },
      boxShadow: {
        'ambient': '0 20px 40px rgba(115, 46, 228, 0.06)',
        'ambient-lg': '0 30px 60px rgba(115, 46, 228, 0.08)',
      },
      backdropBlur: {
        'glass': '20px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
}
