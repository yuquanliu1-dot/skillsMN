/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Developer Tools Color System - Light Mode
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
          DEFAULT: '#6B7280',   // Gray-500 - Secondary text
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        background: {
          DEFAULT: '#F9FAFB',   // Gray-50 - App background
          secondary: '#FFFFFF', // White - Cards/panels
          tertiary: '#F3F4F6',  // Gray-100 - Hover states
        },
        surface: {
          DEFAULT: '#FFFFFF',   // White - Surfaces
          elevated: '#F9FAFB',  // Gray-50 - Elevated surfaces
        },
        text: {
          primary: '#111827',   // Gray-900 - Primary text
          secondary: '#6B7280', // Gray-500 - Secondary text
          muted: '#9CA3AF',     // Gray-400 - Muted text
          disabled: '#D1D5DB',  // Gray-300 - Disabled text
        },
        border: {
          DEFAULT: '#E5E7EB',   // Gray-200 - Default borders
          light: '#F3F4F6',     // Gray-100 - Light borders
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
      // Box Shadows for Light Mode
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.2)',
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
