# UI/UX Research Report: Private Repository Dashboard

**Feature**: 005 - Private Repository Sync
**Research Date**: 2026-03-11
**Researcher**: Claude Sonnet 4.6 (via ui-ux-pro-max skill)

---

## Executive Summary

This research provides UI/UX guidelines for the skillsMN Electron desktop application's private repository management feature. The application follows professional developer tool patterns with a focus on usability, accessibility, and performance.

### Key Findings

1. **Style**: Dark Mode (OLED) + Minimalism for developer tools
2. **Layout**: Card-based dashboard with sidebar navigation
3. **Typography**: Lexend + Source Sans 3 for professional readability
4. **Colors**: Developer Tool palette (Dark syntax theme + Blue focus)
5. **Accessibility**: WCAG AAA compliance with reduced motion support

---

## 1. Product Type Analysis

### Developer Tool / IDE Pattern

**Primary Style**: Dark Mode (OLED) + Minimalism
**Secondary Styles**: Flat Design, Bento Box Grid

**Characteristics**:
- Dark background (#0F172A) for reduced eye strain
- High contrast text (#F1F5F9) for code readability
- Blue focus indicators (#3B82F6) for interaction
- Minimal visual clutter for focus on content
- Grid-based layouts for organized information display

**Dashboard Types**:
- Real-Time Monitor for repository sync status
- Terminal-style interfaces for technical operations
- Data-Dense layouts for skill/repository lists

**Performance**: Excellent (optimized for developer workflows)

---

## 2. Style Guidelines

### Dark Mode (OLED) Implementation

**Primary Colors**:
```css
--background: #000000;  /* Deep Black */
--surface: #121212;      /* Dark Grey */
--accent: #0A0E27;       /* Midnight Blue */
```

**Effects & Animations**:
- Minimal glow: `text-shadow: 0 0 10px rgba(59, 130, 246, 0.3)`
- Dark-to-light transitions (not light-to-dark)
- Low white emission for OLED efficiency
- High readability with 4.5:1 contrast ratio minimum
- Visible focus states for keyboard navigation

**Performance**: ⚡ Excellent
**Accessibility**: ✓ WCAG AAA

### Minimalism & Swiss Style

**Design Principles**:
- Clean, simple, spacious layouts
- High contrast for visual hierarchy
- Grid-based organization
- Essential information only
- Sharp shadows (if any): `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)`

**Animation Guidelines**:
- Subtle hover effects: 200-250ms duration
- Smooth transitions for state changes
- Clear typography hierarchy
- Fast loading (minimal visual elements)

**Performance**: ⚡ Excellent
**Accessibility**: ✓ WCAG AAA

---

## 3. Typography Recommendations

### Font Pairing: Corporate Trust

**Heading Font**: Lexend
- **Weights**: 300, 400, 500, 600, 700
- **Purpose**: Repository names, section headers, buttons
- **Characteristics**: Designed for readability, excellent accessibility

**Body Font**: Source Sans 3
- **Weights**: 300, 400, 500, 600, 700
- **Purpose**: Skill descriptions, metadata, body text
- **Characteristics**: Clean, professional, highly readable

**CSS Import**:
```css
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

**Tailwind Configuration**:
```javascript
fontFamily: {
  heading: ['Lexend', 'sans-serif'],
  body: ['Source Sans 3', 'sans-serif']
}
```

**Usage Guidelines**:
- **Headings**: Lexend 500-600 for repository/skill names
- **Body**: Source Sans 3 400 for descriptions
- **Metadata**: Source Sans 3 300 for timestamps, authors
- **Buttons**: Lexend 500 for CTAs

---

## 4. Color Palette

### Developer Tool / IDE Palette

**Primary Colors**:
```css
--primary: #3B82F6;     /* Blue - Actions, links */
--secondary: #1E293B;   /* Slate - Secondary elements */
--cta: #2563EB;         /* Bright Blue - Call to action */
```

**Background & Surface**:
```css
--background: #0F172A;  /* Dark Slate - App background */
--surface: #1E293B;     /* Lighter Slate - Cards, panels */
--hover: #334155;       /* Slate - Hover states */
```

**Text Colors**:
```css
--text-primary: #F1F5F9;   /* Light - Primary text */
--text-secondary: #CBD5E1; /* Medium - Secondary text */
--text-muted: #94A3B8;     /* Muted - Metadata */
```

**Border Colors**:
```css
--border: #334155;      /* Subtle - Borders */
--border-hover: #475569; /* Hover - Border highlight */
```

**Semantic Colors**:
```css
--success: #10B981;     /* Green - Success states */
--warning: #F59E0B;     /* Amber - Warnings */
--error: #EF4444;       /* Red - Errors */
--info: #3B82F6;        /* Blue - Information */
```

**Application in skillsMN**:
- Repository cards: `bg-slate-800 border-slate-700`
- Skill cards: `bg-slate-800 border-slate-700`
- Primary buttons: `bg-blue-600 hover:bg-blue-700`
- Error states: `text-red-400 bg-red-500/10`
- Success states: `text-green-400 bg-green-500/10`

---

## 5. Layout Patterns

### Dashboard Layout Structure

**Main Container**:
```
┌─────────────────────────────────────────┐
│ Sidebar (240px) │ Content Area (flex-1) │
│                 │                        │
│ - Repositories  │ - Repository Selector  │
│ - Skills        │ - Search Bar           │
│ - Settings      │ - Skills Grid/List     │
│                 │ - Pagination           │
└─────────────────────────────────────────┘
```

**Grid System**:
- 12-column grid for flexible layouts
- `gap: 1rem` for consistent spacing
- Responsive breakpoints: 1024px (min), 1280px, 1440px

### Card-Based UI Pattern

**Card Structure**:
```jsx
<article className="p-4 bg-slate-800 border border-slate-700 rounded-lg
                    hover:border-blue-400 transition-colors duration-200">
  {/* Header */}
  <div className="flex items-start justify-between mb-2">
    <h4 className="text-sm font-medium text-slate-100">{skill.name}</h4>
    <button className="btn btn-primary text-xs">Install</button>
  </div>

  {/* Metadata */}
  <div className="flex items-center gap-4 text-xs text-slate-400">
    <span>{skill.author}</span>
    <time>{skill.date}</time>
  </div>

  {/* Footer */}
  <div className="mt-2 pt-2 border-t border-slate-700">
    <p className="text-xs text-slate-500 font-mono">{skill.sha}</p>
  </div>
</article>
```

**Card States**:
- **Default**: `border-slate-700`
- **Hover**: `border-blue-400` (no layout shift)
- **Active**: `border-blue-500 bg-blue-500/5`
- **Error**: `border-red-400 bg-red-500/10`

### Sidebar Navigation Pattern

**Structure**:
```jsx
<aside className="w-60 bg-slate-900 border-r border-slate-700">
  <nav className="p-4">
    <div className="space-y-1">
      <NavItem icon={<HomeIcon />} label="Repositories" active />
      <NavItem icon={<SkillsIcon />} label="Skills" />
      <NavItem icon={<SettingsIcon />} label="Settings" />
    </div>
  </nav>
</aside>
```

**Navigation Items**:
- **Icon + Label**: Clear visual + text indication
- **Active state**: `bg-slate-800 text-blue-400`
- **Hover**: `bg-slate-800/50 text-slate-100`
- **Padding**: `px-3 py-2` for touch targets

---

## 6. Interaction Patterns

### Hover States

**Guidelines**:
- Use color/opacity transitions only
- Avoid scale transforms (causes layout shift)
- Duration: 150-300ms
- Easing: `transition-colors duration-200`

**Implementation**:
```jsx
// ✅ Good
<div className="hover:border-blue-400 transition-colors duration-200">

// ❌ Bad (layout shift)
<div className="hover:scale-105 transition-transform">
```

### Cursor Feedback

**Rules**:
- All clickable elements: `cursor-pointer`
- All interactive cards: `cursor-pointer`
- Form inputs: `cursor-text` (default)
- Disabled elements: `cursor-not-allowed`

**Implementation**:
```jsx
<button className="cursor-pointer">Click Me</button>
<article className="cursor-pointer">Skill Card</article>
```

### Loading States

**Spinner Pattern**:
```jsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
```

**Skeleton Loading**:
```jsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
</div>
```

---

## 7. Accessibility Guidelines

### WCAG AAA Compliance

**Contrast Ratios**:
- **Text**: Minimum 7:1 (AAA) for body text
- **Large Text**: Minimum 4.5:1 (AA) for headings
- **Interactive**: Minimum 3:1 for UI components

**Color Contrast Verification**:
```css
/* ✅ Passes AAA */
color: #F1F5F9;  /* Light text on dark bg */
background: #0F172A;

/* ✅ Passes AA for large text */
color: #94A3B8;  /* Muted text */
background: #0F172A;
```

### Keyboard Navigation

**Focus Indicators**:
```css
/* Visible focus ring */
*:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

**Tab Order**:
- Logical sequence through interactive elements
- Skip links for main content
- Modal focus trapping

### Screen Reader Support

**ARIA Labels**:
```jsx
<button aria-label="Install skill: {skill.name}">
  Install
</button>

<nav aria-label="Repository navigation">
  <ul role="list">
    <li>...</li>
  </ul>
</nav>
```

**Live Regions**:
```jsx
<div role="status" aria-live="polite">
  Loading skills...
</div>

<div role="alert" aria-live="assertive">
  Installation failed
</div>
```

### Reduced Motion

**Media Query**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Implementation**:
```jsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
```

---

## 8. Performance Guidelines

### Animation Performance

**GPU-Accelerated Properties**:
- ✅ `transform`, `opacity`
- ❌ `width`, `height`, `top`, `left`

**Smooth Transitions**:
- Duration: 150-300ms (avoid >500ms)
- Easing: `ease-out` for entering, `ease-in` for exiting
- Avoid linear motion (feels robotic)

### Virtual Scrolling

**For Large Lists (>100 items)**:
- Render only visible items
- Use pagination with 50 items per page
- Implement "Load More" button
- Performance monitoring with `performance.now()`

**Implementation** (Already implemented):
```jsx
const [visibleCount, setVisibleCount] = useState(50);

{skills.slice(0, visibleCount).map(skill => (
  <SkillCard key={skill.path} skill={skill} />
))}

{skills.length > visibleCount && (
  <button onClick={() => setVisibleCount(prev => prev + 50)}>
    Load More ({skills.length - visibleCount} remaining)
  </button>
)}
```

### Performance Monitoring

**Target**: All UI interactions <100ms

**Implementation** (Already implemented):
```typescript
function logPerformance(operation: string, startTime: number, targetMs: number = 100): void {
  const elapsed = performance.now() - startTime;
  if (elapsed > targetMs) {
    console.warn(`[Performance] ${operation} took ${elapsed.toFixed(2)}ms`);
  }
}
```

---

## 9. Component Patterns

### Repository Card Pattern

```jsx
<article className="p-4 bg-slate-800 border border-slate-700 rounded-lg
                   hover:border-blue-400 transition-colors duration-200 cursor-pointer">
  {/* Header with status indicator */}
  <div className="flex items-center gap-2 mb-2">
    <div className="w-2 h-2 rounded-full bg-green-400" title="Connected" />
    <h3 className="text-sm font-medium text-slate-100">
      {repo.displayName || `${repo.owner}/${repo.repo}`}
    </h3>
  </div>

  {/* Metadata */}
  <div className="text-xs text-slate-400 space-y-1">
    <p>{repo.owner}/{repo.repo}</p>
    <p>Added {formatDate(repo.addedAt)}</p>
  </div>

  {/* Actions */}
  <div className="mt-3 flex gap-2">
    <button className="btn btn-secondary text-xs">Edit</button>
    <button className="btn btn-secondary text-xs text-red-400">Remove</button>
  </div>
</article>
```

### Skill Card Pattern

```jsx
<article className="p-4 bg-slate-800 border border-slate-700 rounded-lg
                   hover:border-blue-400 transition-colors duration-200">
  {/* Header */}
  <div className="flex items-start justify-between mb-2">
    <div className="flex-1">
      <h4 className="text-sm font-medium text-slate-100 mb-1">{skill.name}</h4>
      <p className="text-xs text-slate-400">{skill.path}</p>
    </div>
    <button className="btn btn-primary text-xs ml-2">Install</button>
  </div>

  {/* Commit info */}
  {skill.lastCommitMessage && (
    <p className="text-xs text-slate-400 mb-2">{skill.lastCommitMessage}</p>
  )}

  {/* Metadata row */}
  <div className="flex items-center gap-4 text-xs text-slate-400">
    {skill.lastCommitAuthor && (
      <span className="flex items-center gap-1">
        <UserIcon className="w-3.5 h-3.5" />
        By {skill.lastCommitAuthor}
      </span>
    )}
    {skill.lastCommitDate && (
      <time>{formatDate(skill.lastCommitDate)}</time>
    )}
    {skill.fileCount && (
      <span>{skill.fileCount} files</span>
    )}
  </div>

  {/* SHA footer */}
  {skill.directoryCommitSHA && (
    <div className="mt-2 pt-2 border-t border-slate-700">
      <p className="text-xs text-slate-500 font-mono">
        SHA: {skill.directoryCommitSHA.substring(0, 8)}
      </p>
    </div>
  )}
</article>
```

### Error State Pattern

```jsx
<div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md"
     role="alert" aria-live="polite">
  <div className="flex items-start gap-2">
    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true">
      {/* Error icon */}
    </svg>
    <div className="flex-1">
      <p className="text-sm text-red-400">{error}</p>
      {isAuthError && (
        <p className="text-xs text-red-300 mt-1">
          Go to <a href="#settings" className="underline">Settings</a> to update your PAT.
        </p>
      )}
    </div>
    <button className="btn btn-secondary text-xs">Retry</button>
  </div>
</div>
```

---

## 10. Implementation Checklist

### Before Delivery

**Visual Quality**:
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Hover states don't cause layout shift
- [ ] Dark mode text has sufficient contrast (7:1 minimum)

**Interaction**:
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

**Accessibility**:
- [ ] All interactive elements have ARIA labels
- [ ] Live regions for dynamic content updates
- [ ] Keyboard navigation works throughout
- [ ] `prefers-reduced-motion` respected
- [ ] Screen reader tested with NVDA/JAWS

**Performance**:
- [ ] Virtual scrolling for lists >50 items
- [ ] Performance monitoring active
- [ ] All interactions <100ms
- [ ] No unnecessary re-renders

**Layout**:
- [ ] Responsive at 1024x768 minimum
- [ ] No horizontal scroll on mobile
- [ ] Proper spacing from fixed elements
- [ ] Consistent max-width containers

---

## 11. Research Conclusions

### Recommended Implementation

**Style**: Dark Mode (OLED) + Minimalism
- Excellent for developer tools
- WCAG AAA accessibility
- High performance

**Typography**: Lexend + Source Sans 3
- Professional and readable
- Excellent accessibility
- Clean modern look

**Colors**: Developer Tool Palette
- Dark syntax theme (#0F172A background)
- Blue focus (#3B82F6 primary)
- High contrast text (#F1F5F9)

**Layout**: Card-based dashboard with sidebar
- Grid-based organization
- Clear visual hierarchy
- Responsive and flexible

**Performance**: Virtual scrolling + monitoring
- 50 items per page
- <100ms interaction target
- Performance logging for optimization

### Alignment with Existing Implementation

✅ **Already Implemented**:
- Dark mode color scheme
- Card-based UI patterns
- Virtual scrolling (50 items/page)
- Performance monitoring
- Accessibility features (ARIA, semantic HTML)
- Smooth transitions (200ms)
- Cursor pointer on interactive elements

⚠️ **Potential Enhancements**:
- Typography: Consider Lexend + Source Sans 3 (currently using system fonts)
- Icon set: Verify all icons from Heroicons/Lucide (currently using SVG)
- Sidebar navigation: Could be enhanced with collapsible sections

### Next Steps

1. **Typography Update** (Optional):
   - Import Google Fonts: Lexend + Source Sans 3
   - Update Tailwind config
   - Test readability across the app

2. **Icon Audit** (Optional):
   - Verify all icons from Heroicons or Lucide
   - Replace any emoji icons with SVG
   - Ensure consistent sizing (w-6 h-6)

3. **Sidebar Enhancement** (Optional):
   - Add collapsible sections
   - Improve visual hierarchy
   - Add keyboard shortcuts

4. **Performance Validation**:
   - Monitor console warnings
   - Optimize any slow operations
   - Profile rendering performance

---

**Research Complete**: All UI/UX research tasks (T004-T007) have been addressed with comprehensive guidelines aligned with professional developer tool standards and the existing skillsMN implementation.
