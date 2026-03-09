# Design Specification: Local Skill Management

**Date**: 2026-03-09
**Feature**: 002-local-skill-management

This document defines the visual design system for the Local Skill Management desktop application based on UI/UX research.

## Design Philosophy

**Product Type**: Desktop Developer Tool
**Primary Style**: Dark Mode (OLED) + Minimalism
**Design Approach**: Clean, functional, developer-focused with high performance

## Typography

### Font Stack
- **Code/Monospace**: JetBrains Mono (for skill content editor, code snippets)
- **UI Body**: IBM Plex Sans (for interface elements, labels, descriptions)
- **Fallback**: System monospace, sans-serif

### Font Weights
- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Labels, navigation
- **Semibold (600)**: Headings, emphasis
- **Bold (700)**: Active states, important actions

### Font Sizes
- **xs (12px)**: Metadata, timestamps, resource counts
- **sm (14px)**: Labels, secondary text
- **base (16px)**: Body text, skill descriptions
- **lg (18px)**: Skill names, section headings
- **xl (20px)**: Page titles
- **2xl (24px)**: Modal titles

## Color Palette

### Primary Colors
- **Primary**: `#3B82F6` (Blue - Focus, interactive elements)
- **Secondary**: `#1E293B` (Dark slate - Cards, containers)
- **CTA/Accent**: `#2563EB` (Blue - Call-to-action buttons)

### Background Colors
- **App Background**: `#0F172A` (Slate-900 - Deep dark)
- **Card Background**: `#1E293B` (Slate-800 - Elevated surfaces)
- **Hover Background**: `#334155` (Slate-700 - Interactive states)

### Text Colors
- **Primary Text**: `#F1F5F9` (Slate-100 - Headings, important)
- **Secondary Text**: `#CBD5E1` (Slate-300 - Body text)
- **Muted Text**: `#94A3B8` (Slate-400 - Metadata, hints)
- **Disabled Text**: `#64748B` (Slate-500 - Inactive elements)

### Border Colors
- **Default Border**: `#334155` (Slate-700 - Subtle dividers)
- **Focus Border**: `#3B82F6` (Blue - Active inputs)
- **Hover Border**: `#475569` (Slate-600 - Interactive cards)

### Semantic Colors
- **Success**: `#10B981` (Green - Confirmations, success states)
- **Warning**: `#F59E0B` (Amber - Warnings, cautions)
- **Error**: `#EF4444` (Red - Errors, destructive actions)
- **Info**: `#06B6D4` (Cyan - Information, tips)

## Spacing System

Based on Tailwind's spacing scale:
- **0.5 (2px)**: Tight spacing (icon gaps)
- **1 (4px)**: Compact spacing (inline elements)
- **2 (8px)**: Small spacing (label gaps)
- **3 (12px)**: Medium spacing (card padding)
- **4 (16px)**: Standard spacing (section gaps)
- **6 (24px)**: Large spacing (component gaps)
- **8 (32px)**: Extra large spacing (page sections)

## Border Radius

- **sm (2px)**: Subtle rounding (buttons, inputs)
- **DEFAULT (4px)**: Standard rounding (cards)
- **md (6px)**: Medium rounding (modals)
- **lg (8px)**: Large rounding (dropdowns)
- **xl (12px)**: Extra large rounding (special containers)
- **full (9999px)**: Circular (avatars, badges)

## Shadows

Dark mode optimized shadows:
- **SM**: `shadow-sm` - Subtle lift (cards, hover)
- **DEFAULT**: `shadow` - Standard lift (dropdowns)
- **LG**: `shadow-lg` - Prominent lift (modals)
- **Glow**: `shadow-[0_0_10px_rgba(59,130,246,0.5)]` - Blue glow for focus states

## Component Design Specifications

### 1. SkillList Component

**Layout**: Virtual scrolling with react-window
**Item Height**: 80px (fixed)
**Spacing**: 2 (8px) between items

**Skill Card Design**:
```
┌─────────────────────────────────────────────────────┐
│ 📁 [Icon]  Skill Name [Badge: Project/Global]       │
│            Description text...                       │
│            🕐 Modified: 2 hours ago  📎 3 resources  │
└─────────────────────────────────────────────────────┘
```

**States**:
- **Default**: bg-slate-800, border-slate-700
- **Hover**: bg-slate-700, border-slate-600, cursor-pointer
- **Active**: border-blue-500, bg-slate-700/50
- **Selected**: border-blue-500, bg-blue-500/10

**Badges**:
- **Project**: bg-blue-500/20 text-blue-300 border-blue-500/30
- **Global**: bg-purple-500/20 text-purple-300 border-purple-500/30

### 2. SkillEditor Component (Monaco Editor)

**Container**: Full height with header
**Theme**: vs-dark (Monaco built-in)
**Options**:
- Line numbers: on
- Word wrap: on
- Minimap: enabled
- Font size: 14px
- Font family: JetBrains Mono

**Header Bar**:
```
┌─────────────────────────────────────────────────────┐
│ 📝 skill.md                    [Save] [Cancel]      │
└─────────────────────────────────────────────────────┘
```

**Actions**:
- Save button: Primary blue, icon: checkmark
- Cancel button: Ghost slate, icon: X
- Keyboard shortcut hint: Ctrl+S

### 3. SetupDialog Component

**Modal Design**: Centered, max-width 2xl (672px)
**Overlay**: bg-slate-900/80 backdrop-blur-sm

**Structure**:
```
┌─────────────────────────────────────────────────────┐
│  Welcome to skillsMN                                 │
│                                                      │
│  Select your Claude project directory to get         │
│  started. This is where your local skills are        │
│  stored.                                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📁 /Users/user/projects/my-project           │  │
│  └──────────────────────────────────────────────┘  │
│                  [Browse]                            │
│                                                      │
│                              [Cancel] [Continue]    │
└─────────────────────────────────────────────────────┘
```

**Validation**:
- Invalid directory: border-red-500, error message below
- Valid directory: border-green-500, checkmark icon

### 4. Settings Component

**Layout**: Sidebar navigation + content area
**Sidebar Width**: 240px

**Structure**:
```
┌──────────────┬──────────────────────────────────────┐
│ General      │  Default Install Directory          │
│ Appearance   │  ○ Project directory                │
│ Shortcuts    │  ● Global directory                 │
│ About        │                                      │
│              │  Editor Default Mode                │
│              │  ● Edit mode                         │
│              │  ○ Preview mode                      │
│              │                                      │
│              │  Auto Refresh                        │
│              │  ☑ Refresh skill list on changes     │
│              │                                      │
│              │              [Reset] [Save]          │
└──────────────┴──────────────────────────────────────┘
```

**Form Controls**:
- Radio buttons: Custom styled, blue accent
- Toggle switch: Blue when active
- Buttons: Primary (blue), Ghost (slate), Destructive (red)

## Interaction Patterns

### Cursor States
- **Interactive elements**: cursor-pointer (all buttons, cards, links)
- **Text selection**: cursor-text (editor, input fields)
- **Default**: cursor-default (static content)

### Hover Effects
- **Transition duration**: 150ms (fast), 200ms (standard)
- **Property**: background-color, border-color, opacity
- **Avoid**: scale transforms (causes layout shift)

### Focus States
- **Focus ring**: ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900
- **Tab order**: Logical flow (top-to-bottom, left-to-right)
- **Skip links**: None needed (desktop app, not web)

### Loading States
- **Initial load**: Skeleton screens with animate-pulse
- **Button loading**: Spinner icon + disabled state
- **List loading**: Progress bar at top

### Notifications/Toast
- **Position**: Bottom-right corner
- **Duration**: 3s (success), 5s (error), persistent (warnings)
- **Animation**: Slide-in from right
- **Style**: bg-slate-800, border-l-4 (colored by type)

## Accessibility Requirements

### Color Contrast
- **Text on background**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Visible focus indicators

### Keyboard Navigation
- **Tab**: Move between interactive elements
- **Enter/Space**: Activate buttons, cards
- **Escape**: Close modals, cancel actions
- **Arrow keys**: Navigate lists, radio groups

### Screen Reader Support
- **Alt text**: All icons have aria-label
- **Labels**: All inputs have associated labels
- **Headings**: Proper hierarchy (h1 → h2 → h3)
- **Live regions**: For dynamic content updates

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Icon Guidelines

### Icon Library
- **Primary**: Heroicons (outline variant)
- **Alternative**: Lucide React
- **Brand logos**: Simple Icons (for GitHub, etc.)

### Icon Sizing
- **Small**: w-4 h-4 (16px) - Inline with text
- **Default**: w-5 h-5 (20px) - Standard UI
- **Medium**: w-6 h-6 (24px) - Card icons, buttons
- **Large**: w-8 h-8 (32px) - Feature icons

### Icon Usage
- **File/folder**: folder icon (Heroicons)
- **Skill**: document-text icon (Heroicons)
- **Settings**: cog-6-tooth icon (Heroicons)
- **Edit**: pencil-square icon (Heroicons)
- **Delete**: trash icon (Heroicons)
- **Create**: plus icon (Heroicons)
- **Close**: x-mark icon (Heroicons)
- **Save**: check icon (Heroicons)

## Responsive Design

### Minimum Window Size
- **Width**: 1024px (desktop minimum)
- **Height**: 768px (desktop minimum)

### Breakpoints (for future enhancements)
- **sm**: 640px (not used - desktop only)
- **md**: 768px (minimum height)
- **lg**: 1024px (minimum width)
- **xl**: 1280px (comfortable)
- **2xl**: 1536px (large screens)

### Resize Behavior
- **Horizontal**: Scroll appears if < 1024px
- **Vertical**: Scroll appears if < 768px
- **Optimal**: Fluid layout, no fixed widths

## Performance Standards

### Interaction Latency
- **Button click to response**: < 100ms
- **List scroll**: 60fps (virtual scrolling)
- **File operations**: < 100ms save, < 200ms delete
- **Initial load**: < 3s for 500 skills

### Animation Performance
- **Transitions**: GPU-accelerated (opacity, transform)
- **Avoid**: Layout thrashing, forced reflows
- **Virtual scrolling**: Only render visible items

### Bundle Size
- **Target**: < 5MB initial bundle (Electron app)
- **Code splitting**: Lazy load Monaco Editor
- **Tree shaking**: Remove unused Tailwind classes

## Quality Checklist

Before implementing any component, verify:

### Visual Quality
- [ ] No emojis used as icons (SVG only)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] Cursor pointer on all interactive elements

### Color & Contrast
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in dark mode
- [ ] Borders visible in dark mode
- [ ] Test both light and dark modes (if applicable)

### Interaction
- [ ] All interactive elements have cursor-pointer
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Accessibility
- [ ] All images have alt text / aria-label
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] prefers-reduced-motion respected

### Layout
- [ ] No content hidden behind fixed elements
- [ ] Responsive at 1024x768 minimum resolution
- [ ] No horizontal scroll on normal widths

## Implementation Notes

1. **Dark Mode Default**: Application uses dark theme by default (per spec)
2. **No Light Mode**: Single theme (dark) for simplicity
3. **Monaco Editor**: Lazy load to reduce initial bundle size
4. **Virtual Scrolling**: Use react-window for skill list
5. **Icons**: Prefer Heroicons outline variant for consistency
6. **Animations**: Keep minimal, focus on performance
7. **Accessibility**: WCAG AAA compliance for dark mode

## Resources

- **Tailwind CSS**: https://tailwindcss.com
- **Heroicons**: https://heroicons.com
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **react-window**: https://github.com/bvaughn/react-window
- **JetBrains Mono**: https://www.jetbrains.com/lp/mono/
- **IBM Plex Sans**: https://www.ibm.com/plex/
