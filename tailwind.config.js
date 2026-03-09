/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Developer Tools Color System - Dark Mode OLED
      colors: {
        primary: {
          DEFAULT: '#3B82F6',   // Blue-500 - Primary actions
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          DEFAULT: '#1E293B',   // Slate-800 - Secondary background
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        background: {
          DEFAULT: '#0F172A',   // Slate-900 - App background
          secondary: '#1E293B', // Slate-800 - Cards/panels
          tertiary: '#334155',  // Slate-700 - Hover states
        },
        surface: {
          DEFAULT: '#1E293B',   // Slate-800 - Surfaces
          elevated: '#334155',  // Slate-700 - Elevated surfaces
        },
        text: {
          primary: '#F1F5F9',   // Slate-50 - Primary text
          secondary: '#CBD5E1', // Slate-300 - Secondary text
          muted: '#94A3B8',     // Slate-400 - Muted text
          disabled: '#64748B',  // Slate-500 - Disabled text
        },
        border: {
          DEFAULT: '#334155',   // Slate-700 - Default borders
          light: '#475569',     // Slate-600 - Light borders
          focus: '#3B82F6',     // Blue-500 - Focus borders
        },
        // Status colors
        success: {
          DEFAULT: '#10B981',   // Green-500
          light: '#34D399',     // Green-400
          dark: '#059669',      // Green-600
        },
        warning: {
          DEFAULT: '#F59E0B',   // Amber-500
          light: '#FBBF24',     // Amber-400
          dark: '#D97706',      // Amber-600
        },
        error: {
          DEFAULT: '#EF4444',   // Red-500
          light: '#F87171',     // Red-400
          dark: '#DC2626',      // Red-600
        },
        info: {
          DEFAULT: '#3B82F6',   // Blue-500
          light: '#60A5FA',     // Blue-400
          dark: '#2563EB',      // Blue-600
        },
      },
      // Developer Mono Font System
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.015em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
      },
      // Spacing Scale (8px base)
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      // Border Radius
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      // Box Shadows for Dark Mode
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.4)',
      },
      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'DEFAULT': 'ease-out',
        'in': 'ease-in',
        'out': 'ease-out',
        'in-out': 'ease-in-out',
      },
      // Animations
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
