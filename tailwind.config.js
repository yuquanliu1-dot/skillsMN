/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Apple Design System Colors
      colors: {
        primary: {
          DEFAULT: '#0071e3',   // Apple Blue - Primary actions
          50: '#EBF5FF',
          100: '#D1EBFF',
          200: '#A8D9FF',
          300: '#7FC7FF',
          400: '#56B5FF',
          500: '#0071e3',      // Apple Blue
          600: '#005BB5',
          700: '#004687',
          800: '#003159',
          900: '#001C2B',
        },
        // Apple Light Gray for backgrounds
        'apple-gray': {
          DEFAULT: '#f5f5f7',
          light: '#fafafb',
          dark: '#e5e5e7',
        },
        // Apple Near Black for text
        'apple-text': {
          DEFAULT: '#1d1d1f',
          secondary: 'rgba(0, 0, 0, 0.8)',
          tertiary: 'rgba(0, 0, 0, 0.48)',
        },
        secondary: {
          DEFAULT: '#6B7280',
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
          DEFAULT: '#f5f5f7',   // Apple Light Gray - App background
          secondary: '#FFFFFF', // White - Cards/panels
          tertiary: '#F3F4F6',  // Gray-100 - Hover states
        },
        surface: {
          DEFAULT: '#FFFFFF',   // White - Surfaces
          elevated: '#f5f5f7',  // Apple Light Gray - Elevated surfaces
        },
        text: {
          primary: '#1d1d1f',   // Apple Near Black - Primary text
          secondary: 'rgba(0, 0, 0, 0.8)', // Apple Black 80%
          muted: '#9CA3AF',     // Gray-400 - Muted text
          disabled: '#D1D5DB',  // Gray-300 - Disabled text
        },
        border: {
          DEFAULT: '#E5E7EB',   // Gray-200 - Default borders
          light: '#F3F4F6',     // Gray-100 - Light borders
          focus: '#0071e3',     // Apple Blue - Focus borders
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
      // Apple Typography System - SF Pro
      fontFamily: {
        sans: [
          'SF Pro Display',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
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
      // Apple Spacing Scale - 8px base unit
      // Scale: 2, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 20, 24
      spacing: {
        '0.5': '2px',     // 2px
        '1': '4px',       // 4px
        '1.5': '5px',     // 5px
        '1.75': '6px',    // 6px
        '2': '8px',       // 8px (base unit)
        '2.25': '9px',    // 9px
        '2.5': '10px',    // 10px
        '2.75': '11px',   // 11px
        '3': '12px',      // Legacy - use 3.5 (14px) instead
        '3.5': '14px',    // 14px
        '4': '16px',      // Not in scale - rounded from 17px
        '5': '20px',      // 20px
        '6': '24px',      // 24px
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      // Apple Border Radius Scale
      borderRadius: {
        'micro': '5px',        // Micro - Small containers
        DEFAULT: '8px',        // Standard - Buttons, product cards
        'comfortable': '11px', // Comfortable - Search inputs
        'lg': '12px',          // Large - Feature panels
        'xl': '16px',
        '2xl': '20px',
        'pill': '980px',       // Full Pill - CTA links
        'full': '9999px',
      },
      // Box Shadows - Apple soft shadow + standard shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        // Apple card shadow - soft, diffused
        'apple-card': 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0px',
        'glow': '0 0 20px rgba(0, 113, 227, 0.15)',
        'glow-lg': '0 0 30px rgba(0, 113, 227, 0.2)',
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
