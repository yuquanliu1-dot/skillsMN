# Skills Registry Search - UI/UX Design Specification

**Feature**: 006-skills-registry-search
**Created**: 2026-03-12
**Design Research Source**: ui-ux-pro-max skill

## Design System Overview

### Product Type
**Desktop Application - Developer Tool**
- **Category**: Productivity Tool / Developer IDE
- **Primary Style**: Flat Design + Minimalism
- **Secondary Styles**: Clean, functional, high contrast
- **Landing Pattern**: Feature-Rich Showcase

### Target Audience
- Claude Code users
- Developers using desktop skill management tools
- Users seeking to discover and install community skills

---

## Typography

### Font Pairing: Developer Mono
**Heading Font**: JetBrains Mono
- Use for: Code snippets, skill names, technical identifiers
- Weights: 400 (regular), 500 (medium), 600 (semibold)
- Style: Technical, precise, functional

**Body Font**: IBM Plex Sans
- Use for: UI text, descriptions, labels, instructions
- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Style: Clean, professional, highly readable

**Google Fonts Import**:
```html
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

**Tailwind Configuration**:
```javascript
fontFamily: {
  mono: ['JetBrains Mono', 'monospace'],
  sans: ['IBM Plex Sans', 'sans-serif']
}
```

---

## Color Palette

### Primary Colors
| Role | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Primary** | #3B82F6 | `bg-blue-500`, `text-blue-500` | Primary actions, active states, |
| **Primary Hover** | #2563EB | `hover:bg-blue-600` | Hover states for primary elements |
| **Secondary** | #1E293B | `text-slate-800` | Secondary text, labels |

### Background & Surface
| Role | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Background Light** | #F8FAFC | `bg-slate-50` | Light mode background |
| **Background Dark** | #0F172A | `bg-slate-900` | Dark mode background |
| **Card Light** | #FFFFFF | `bg-white` | Card backgrounds light mode |
| **Card Dark** | #1E293B | `bg-slate-800` | Card backgrounds dark mode |

### Accent & Actions
| Role | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **CTA** | #F97316 | `bg-orange-500` | Call-to-action buttons |
| **Success** | #10B981 | `bg-green-500` | Success states, installed indicators |
| **Border Light** | #E2E8F0 | `border-slate-200` | Borders in light mode |
| **Border Dark** | #334155 | `border-slate-700` | Borders in dark mode |

### Text Hierarchy
| Role | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Heading Light** | #0F172A | `text-slate-900` | Headings in light mode |
| **Heading Dark** | #F1F5F9 | `text-slate-100` | Headings in dark mode |
| **Body Light** | #475569 | `text-slate-600` | Body text in light mode (min contrast 4.5:1) |
| **Body Dark** | #CBD5E1 | `text-slate-300` | Body text in dark mode |
| **Muted Light** | #94A3B8 | `text-slate-400` | Muted text, placeholders |
| **Muted Dark** | #64748B | `text-slate-500` | Muted text in dark mode |

---

## Component Specifications

### 1. Search Input Component (RegistrySearch)

**Structure**:
```
Container (relative)
└── Input Group (flex items-center)
    ├── Search Icon (SVG, 24x24, left-3)
    ├── Input (h-10, flex-1, px-3)
    └── Clear Button (optional, right-3)
```

**Tailwind Classes**:
```html
<!-- Container -->
<div class="relative w-full">

  <!-- Input Group -->
  <div class="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
    <!-- Search Icon -->
    <svg class="w-6 h-6 ml-3 text-slate-400" viewBox="0 0 24 24">
      <!-- Heroicon search icon path -->
    </svg>

    <!-- Input -->
    <input
      type="text"
      class="h-10 flex-1 px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
      placeholder="Search for skills..."
    />

    <!-- Loading Spinner (when loading) -->
    <svg class="w-5 h-5 mr-3 animate-spin text-blue-500">
      <!-- Spinner icon -->
    </svg>
  </div>
</div>
```

**States**:
- **Default**: Border slate-200/700
- **Focus**: Ring-2 ring-blue-500
- **Loading**: Show spinner on right
- **Error**: Border red-500, show error message below

**Debounce Behavior**:
- Delay: 400ms
- Show loading state after 300ms if no response
- Cancel pending request on new input

---

### 2. Search Results List (SearchResultsList)

**Structure**:
```
Container (space-y-3)
├── Results Count (text-sm, text-slate-600)
└── Results Grid (grid gap-4)
    └── Skill Cards (repeated)
```

**Tailwind Classes**:
```html
<!-- Container -->
<div class="space-y-3">

  <!-- Results Count -->
  <p class="text-sm text-slate-600 dark:text-slate-400">
    Found 15 skills
  </p>

  <!-- Results Grid -->
  <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
    <!-- SkillResultCard components -->
  </div>
</div>
```

**Virtual Scrolling**:
- Use for 20+ items
- Implement with `react-window` or similar
- Fixed item height: 120px

**Empty State**:
```html
<div class="flex flex-col items-center justify-center py-12 text-center">
  <!-- Icon -->
  <svg class="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4">
    <!-- Empty search icon -->
  </svg>

  <!-- Title -->
  <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
    No skills found
  </h3>

  <!-- Description -->
  <p class="text-sm text-slate-600 dark:text-slate-400">
    Try searching for different keywords
  </p>
</div>
```

---

### 3. Skill Result Card (SkillResultCard)

**Structure**:
```
Card Container (rounded-lg, shadow-md, hover:shadow-lg)
├── Header (flex justify-between)
│   ├── Skill Name (font-semibold, clickable)
│   └── Install Count Badge (text-xs)
├── Metadata (flex gap-4, text-sm)
│   ├── Source Repository
│   └── Author (if available)
└── Actions (flex gap-2, mt-4)
    ├── View Details (secondary button)
    └── Install (primary button)
```

**Tailwind Classes**:
```html
<!-- Card Container -->
<div class="rounded-2xl shadow-md p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
  <!-- Header -->
  <div class="flex justify-between items-start mb-3">
    <!-- Skill Name (clickable) -->
    <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-500 transition-colors duration-200 cursor-pointer">
      My Awesome Skill
    </h3>

    <!-- Install Count -->
    <span class="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
      1.5k installs
    </span>
  </div>

  <!-- Metadata -->
  <div class="flex gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
    <span class="flex items-center gap-1">
      <!-- GitHub icon SVG -->
      skills-org/skills-collection
    </span>
  </div>

  <!-- Actions -->
  <div class="flex gap-2">
    <!-- View Details (secondary) -->
    <button class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200">
      View Details
    </button>

    <!-- Install (primary) -->
    <button class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors duration-200">
      Install
    </button>
  </div>
</div>
```

**States**:
- **Default**: shadow-md, border slate-200/700
- **Hover**: shadow-lg, cursor-pointer
- **Installed**: Green badge "Installed", Install button becomes "Reinstall"
- **Loading**: Disabled buttons, spinner

**Transition Timing**:
- Hover shadow: 200ms
- Color changes: 200ms
- No layout shifts on hover

---

### 4. Install Dialog (InstallDialog)

**Structure**:
```
Modal Overlay (fixed inset-0, bg-black/50)
└── Dialog Container (centered, max-w-md)
    ├── Header
    │   ├── Title
    │   └── Close Button
    ├── Body
    │   ├── Skill Info
    │   └── Tool Selection (radio group)
    └── Footer
        ├── Cancel Button
        └── Install Button
```

**Tailwind Classes**:
```html
<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <!-- Dialog Container -->
  <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
    <!-- Header -->
    <div class="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Install Skill
      </h2>
      <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <!-- Close icon -->
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 space-y-4">
      <!-- Skill Info -->
      <div class="text-sm text-slate-600 dark:text-slate-400">
        Installing <strong class="text-slate-900 dark:text-slate-100">My Awesome Skill</strong>
      </div>

      <!-- Tool Selection -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Select target tool:
        </label>
        <div class="space-y-2">
          <!-- Radio options -->
          <label class="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500">
            <input type="radio" class="w-4 h-4 text-blue-500">
            <span class="ml-3">Claude Desktop</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-3 p-6 bg-slate-50 dark:bg-slate-900/50">
      <button class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
        Cancel
      </button>
      <button class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600">
        Install
      </button>
    </div>
  </div>
</div>
```

**Accessibility**:
- Focus trap enabled
- Escape key closes
- Tab navigation works
- Screen reader announcements

**Progress States**:
```html
<!-- Installation Progress -->
<div class="space-y-3">
  <div class="flex items-center gap-3">
    <svg class="w-5 h-5 animate-spin text-blue-500">
      <!-- Spinner -->
    </svg>
    <span class="text-sm text-slate-600 dark:text-slate-400">
      Cloning repository...
    </span>
  </div>

  <!-- Progress Bar -->
  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
    <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 60%"></div>
  </div>
</div>
```

---

## Layout Guidelines

### Responsive Breakpoints
- **Mobile** (<768px): Single column layout
- **Desktop** (≥768px): Two column grid for results
- **Large Desktop** (≥1024px): Optimized for minimum resolution

### Container Width
```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Content -->
</div>
```

### Navbar Spacing
- Floating navbar: `top-4 left-4 right-4`
- Account for fixed navbar height in content padding

---

## Interaction Patterns

### Search Debouncing
- **Delay**: 400ms
- **Implementation**: Custom React hook
- **Feedback**: Show loading spinner after 300ms if no response
- **Cancelation**: Cancel pending request on new input

### Loading States
- **Skeleton screens**: For initial page load
- **Inline spinners**: For search in progress
- **Progress bars**: For installation progress
- **Button states**: Disabled with spinner for actions in progress

### Empty States
- **No results**: "No skills found. Try searching for different keywords."
- **No skills installed**: Guide to search for skills
- **Actionable**: Include suggestion or action button

### Hover States
- **Cards**: Shadow transition (shadow-md → shadow-lg)
- **Buttons**: Color transition (bg-blue-500 → bg-blue-600)
- **Links**: Color transition (text-slate-900 → text-blue-500)
- **Duration**: 200ms for all transitions

### Cursor Feedback
- **All interactive elements**: `cursor-pointer`
- **Cards**: Entire card clickable
- **Skill names**: Link to details
- **Buttons**: Pointer cursor

---

## Icon Usage

### Icon Library
**Primary**: Heroicons (outline variant)
- Search icon
- X circle icon (close)
- Arrow down circle (install)
- External link (view details)
- Spinner (loading)

**Secondary**: Simple Icons
- GitHub logo (for source repos)

### Icon Sizing
- **Standard**: 24x24 viewBox with `w-6 h-6` classes
- **Small**: 20x20 viewBox with `w-5 h-5` classes
- **Large**: 48x48 viewBox with `w-12 h-12` classes

### Icon Rules
- ✅ **DO**: Use SVG icons from Heroicons
- ❌ **DON'T**: Use emojis as icons
- ✅ **DO**: Consistent sizing across similar elements
- ❌ **DON'T**: Mix icon libraries randomly

---

## Accessibility

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear focus indicators
- **Both modes**: Test light and dark mode

### Keyboard Navigation
- **Tab order**: Logical flow through interactive elements
- **Focus indicators**: Visible ring on focus (`ring-2 ring-blue-500`)
- **Enter key**: Activate buttons and cards
- **Escape key**: Close modals and dialogs

### Screen Readers
- **Alt text**: All icons and images
- **Labels**: Form inputs with associated labels
- **Announcements**: Loading states, errors, success messages
- **Landmarks**: Semantic HTML structure

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Standards

### Interaction Latency
- **UI interactions**: <100ms response time
- **Search results**: <3s API + <0.5s render = <3.5s total
- **Installation**: <30s (excluding network time)
- **Hover effects**: Immediate visual feedback

### List Performance
- **Virtual scrolling**: For 20+ items
- **Efficient rendering**: React.memo for cards
- **Debounced search**: Max 1 API call per 400ms
- **Image lazy loading**: If skill icons added later

### Memory Management
- **Component unmount**: Cancel pending requests
- **Event listeners**: Clean up on unmount
- **Large lists**: Virtualization to limit DOM nodes

---

## Error Handling UI

### Error Display Pattern
```html
<div class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
  <div class="flex gap-3">
    <!-- Error Icon -->
    <svg class="w-5 h-5 text-red-500 flex-shrink-0">
      <!-- Error icon path -->
    </svg>

    <!-- Content -->
    <div class="flex-1">
      <h4 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
        Installation Failed
      </h4>
      <p class="text-sm text-red-700 dark:text-red-300">
        Git is not installed. Please install Git and restart the application.
      </p>

      <!-- Action -->
      <button class="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700">
        Learn how to install Git →
      </button>
    </div>
  </div>
</div>
```

### Error Types & Messages
1. **Git not found**: "Git is required. Install Git and restart."
2. **Repo not found**: "Repository not found or deleted. Try another skill."
3. **Network error**: "Unable to connect. Check your internet connection."
4. **Invalid skill**: "Invalid skill structure. Contact the author."

---

## Animation Guidelines

### Transition Timing
- **Fast**: 150ms (color changes, opacity)
- **Standard**: 200ms (hover states, shadows)
- **Slow**: 300ms (modals, complex transitions)
- **Maximum**: 500ms (avoid longer transitions)

### Animation Types
- **Color transitions**: `transition-colors duration-200`
- **Shadow transitions**: `transition-shadow duration-200`
- **Opacity transitions**: `transition-opacity duration-200`
- **Transform**: Avoid scale transforms that cause layout shifts

### Anti-Patterns to Avoid
- ❌ Scale transforms on hover (causes layout shift)
- ❌ Animations >500ms (feels sluggish)
- ❌ Multiple simultaneous animations
- ❌ Layout shifts during state changes

---

## Light/Dark Mode

### Implementation
```html
<!-- Toggle Button -->
<button class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
  <!-- Sun icon (light mode) -->
  <svg class="w-6 h-6 text-slate-600 dark:hidden">
    <!-- Sun icon path -->
  </svg>

  <!-- Moon icon (dark mode) -->
  <svg class="w-6 h-6 text-slate-300 hidden dark:block">
    <!-- Moon icon path -->
  </svg>
</button>
```

### Color Mapping
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | bg-slate-50 | bg-slate-900 |
| Card | bg-white | bg-slate-800 |
| Text Primary | text-slate-900 | text-slate-100 |
| Text Secondary | text-slate-600 | text-slate-400 |
| Border | border-slate-200 | border-slate-700 |

### Testing Checklist
- [ ] All text readable in both modes (4.5:1 contrast)
- [ ] Borders visible in both modes
- [ ] Cards distinguishable from background
- [ ] Hover states work in both modes
- [ ] Focus indicators visible in both modes

---

## Pre-Implementation Checklist

Before implementing any UI component, verify:

### Visual Quality
- [ ] No emojis used as icons
- [ ] All icons from Heroicons (consistent set)
- [ ] GitHub logo correct (Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] All interactive elements have `cursor-pointer`

### Contrast & Accessibility
- [ ] Light mode text contrast ≥4.5:1
- [ ] Dark mode text contrast ≥4.5:1
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Focus states visible for keyboard navigation

### Interaction
- [ ] Debounce implemented (400ms)
- [ ] Loading states for all async operations
- [ ] Empty states helpful and actionable
- [ ] Error messages clear and actionable
- [ ] Transitions smooth (150-300ms)

### Performance
- [ ] Virtual scrolling for 20+ items
- [ ] Component memoization where needed
- [ ] Event listener cleanup on unmount
- [ ] Request cancellation on new input

### Responsive
- [ ] Works at 1024x768 (minimum)
- [ ] Works at 1440x900 (standard)
- [ ] Single column on mobile (<768px)
- [ ] Two column grid on desktop (≥768px)

---

## Implementation Notes

### Component Library
- **React 18.2+**: Hooks, concurrent rendering
- **Tailwind CSS 3.4+**: Utility-first styling
- **TypeScript 5.x**: Strict typing
- **Electron**: Desktop application framework

### Recommended Libraries
- **react-window**: Virtual scrolling for large lists
- **@heroicons/react**: SVG icon components
- **simple-icons**: Brand logos (GitHub)

### File Structure
```
src/renderer/components/
├── RegistrySearch.tsx         # Main search container
├── SearchInput.tsx            # Search input with debounce
├── SearchResultsList.tsx      # Results container with virtualization
├── SkillResultCard.tsx        # Individual skill card
├── InstallDialog.tsx          # Installation modal
├── EmptyState.tsx             # Empty results state
└── ErrorDisplay.tsx           # Error message component
```

---

## Design Sign-Off

**Design reviewed and approved**: ✅
**Ready for implementation**: ✅
**Follows ui-ux-pro-max recommendations**: ✅

This design specification ensures professional, accessible, and performant UI that follows industry best practices for developer tools.
