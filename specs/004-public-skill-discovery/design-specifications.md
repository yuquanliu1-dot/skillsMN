# Design Specifications: Public Skill Discovery

**Feature**: 004-public-skill-discovery
**Date**: 2026-03-10
**Design System**: React + Tailwind CSS (Electron Desktop App)

## Overview

This document provides detailed design specifications for all UI components in the Public Skill Discovery feature, following the ui-ux-pro-max workflow and professional design standards.

---

## Design System Foundation

### Product Type

**Category**: Desktop Application - Developer Tool
**Sub-category**: Search & Discovery Interface

**Design Philosophy**:
- Clean, professional interface with clear visual hierarchy
- Minimal aesthetic with focus on content readability
- Efficient for technical users (developers)
- Accessible across Windows/macOS/Linux

---

## Style Direction

**Primary Style**: Minimalism + Professional
**Visual Approach**: Clean, functional, efficient

**Key Characteristics**:
- Ample whitespace for content breathing room
- Clear visual hierarchy through size and spacing
- Subtle shadows and borders for depth
- Smooth transitions for professional feel
- No decorative elements - focus on functionality

---

## Typography

### Primary Font: Inter (System Font)
**Use for**: Body text, UI labels
**Classes**: `font-inter`, `font-sans` (Tailwind defaults)

**Rationale**:
- Inter provides excellent readability for technical content
- System font ensures consistent cross-platform rendering
- Variable weight (300, 400, 500, 600) for hierarchy

### Monospace Font: JetBrains Mono / Fira Code
**Use for**: Code snippets, file paths, technical identifiers
**Classes**: `font-mono`

**Rationale**:
- Monospace fonts align code content properly
- Improves readability of skill.md previews
- Professional appearance for code-related UI elements

---

## Color Palette

### Primary Color Scale

**Brand Color**: Blue-600 (#2563EB)
**Use for**: Primary actions, key CTAs, focus states

**Gray Scale**:
- **gray-50**: Backgrounds (light mode: #F9FAFB
- **gray-100**: Borders (#E5E7EB)
- **gray-200**: Borders (hover state: #E5E7EB
- **gray-300**: Borders (active state: #D1D5DB
- **gray-500**: Secondary text (#6B728A)
- **gray-600**: Body text (#4B5563)
- **gray-700**: Headings (#374151)
- **gray-900**: High-contrast text (#111827)

**Background Colors**:
- **white**: Primary background (#FFFFFF)
- **gray-50**: Secondary background (#F9FAFB)
- **gray-100**: Tertiary background (#F3F4F6)

### Semantic Colors

**Success**: green-500, green-600
**Warning**: yellow-500, yellow-600
**Error**: red-500, red-600
**Info**: blue-500, blue-600

---

## Component Specifications

### 1. SearchPanel

**Layout**: Full-width main content area
**Background**: white with subtle shadow

**Structure**:
```
┌─────────────────────────────────────────┐
│  Search Input (large, centered)          │
│  [🔍] [________________________] [×]   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Results Grid                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Card    │ │ Card    │ │ Card    │  │
│  └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────┘
```

**Search Input**:
- Height: 48px
- Background: gray-50
- Border: 1px gray-200
- Border-radius: 8px
- Icon: Search (Heroicons outline, 20x20)
- Debounce: 500ms
- Placeholder: "Search skills..."

**States**:
- Empty: Icon + gray-300, text "Search for skills..."
- Typing: Input active, blue-600 border
- Loading: Spinner animation, disabled state
- Error: Red border, error icon

---

### 2. SearchResultCard

**Layout**: Card with hover effects
**Background**: white
**Border**: 1px gray-100 (default), gray-300 (hover)

**Structure**:
```
┌─────────────────────────────────────────┐
│  Skill Name (text-lg, font-semibold)     │
│  Repository (text-sm, text-gray-500)     │
│  Description (text-sm, text-gray-600)    │
│  ──────────────────────────────────────  │
│  Stars: 1.2k  Updated: 2 days ago           │
│  ──────────────────────────────────────  │
│  [Preview] [Install] [Open in GitHub]      │
└─────────────────────────────────────────┘
```

**Hover State**:
- Border: gray-300
- Shadow: shadow-sm
- Cursor: pointer
- Transition: 150ms ease-in-out

**Actions**:
- **Preview**: Ghost button (gray-500), hover: gray-700
- **Install**: Primary button (blue-600), hover: blue-700
- **Open in GitHub**: Ghost button (gray-500), hover: gray-700

---

### 3. SkillPreview (Modal)

**Layout**: Split-panel modal
**Overlay**: Black with 50% opacity

**Structure**:
```
┌────────────┬──────────────────────────┐
│  [×] Close  │                             │
├────────────┤                             │
│  File Tree  │  Content Preview            │
│  (gray-50   │  (white bg)                 │
│  w-1/3)     │  (w-2/3)                    │
│            │                             │
│  └─ file1.md (rendered)           │
│  └─ file2.js                      │
│  └─ ...                          │
└────────────┴──────────────────────────┘
```

**File Tree Panel** (left, 33% width):
- Background: gray-50
- Tree: Collapsible nodes
- Icons: Folder (gray-500), File (gray-400)
- Active file: blue-600 background
- Scroll: Overflow-y auto

**Content Panel** (right, 67% width):
- Background: white
- Markdown: Rendered skill.md content
- Scroll: Overflow-y auto
- Padding: 24px

**Close Actions**:
- Click outside modal
- Press Escape key
- X button (top-right)

---

### 4. InstallDialog

**Layout**: Centered modal
**Width**: 480px max

**Structure**:
```
┌─────────────────────────────────────────┐
│  Install Skill                          │
│  [skill-name]                            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Target Directory                        │
│  ○ Project Skills                        │
│  ○ Global Skills                          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Progress Bar                            │
│  [████████░░░░░░░░░░░░░░░░] 50%        │
│  5/10 files                               │
└─────────────────────────────────────────┘
│  [Cancel]                                │
└─────────────────────────────────────────┘
```

**Directory Selection**:
- Radio buttons with descriptions
- Project: "Install to current project"
- Global: "Install for all projects"
- Default: Based on config

**Progress Bar**:
- Height: 8px
- Background: gray-200
- Fill: blue-600
- Border-radius: 4px
- Text: gray-500 text-sm

**Cancel Button**:
- Ghost button (gray-500)
- Hover: gray-700
- Disabled during completion phase

---

### 5. ConflictResolutionDialog

**Layout**: Centered modal
**Width**: 480px max

**Structure**:
```
┌─────────────────────────────────────────┐
│  Skill Already Exists                  │
│  A skill named "react-hooks" already    │
│  exists in your project directory.       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  What would you like to do?             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ○ Overwrite                       │ │
│  │   Replace existing skill           │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ ○ Rename (recommended)            │ │
│  │   Save as react-hooks-20260310  │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ ○ Skip                             │ │
│  │   Cancel installation               │ │
│  └───────────────────────────────────┘ │
│  ☐ Apply to all subsequent conflicts    │
└─────────────────────────────────────────┘
│  [Cancel] [Continue]                      │
└─────────────────────────────────────────┘
```

**Option Cards**:
- Border: 2px gray-200 (default), blue-600 (selected)
- Hover: gray-50 background
- Selected: Blue border, blue-50 background
- Icon: Radio circle (gray-400 default, blue-600 selected)

**Apply to All**:
- Checkbox with label
- Position: Bottom of options
- Default: unchecked

**Actions**:
- **Cancel**: Ghost button (gray-500)
- **Continue**: Primary button (blue-600)
- Disabled if no option selected

---

### 6. Sidebar (Curated Sources)

**Layout**: Right sidebar,**Width**: 320px fixed

**Structure**:
```
┌─────────────────────────────┐
│  Curated Sources             │
│  Discover high-quality       │
│  skill repositories            │
└─────────────────────────────┘
┌─────────────────────────────┐
│  ┌─────────────────────┐  │
│  │ Source 1             │  │
│  │ Description...       │  │
│  │ [tags]               │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Source 2             │  │
│  └─────────────────────┘  │
└─────────────────────────────┘
```

**Source Cards**:
- Background: white
- Border-radius: 8px (rounded-xl)
- Border: 1px gray-200 (default), gray-300 (hover)
- Padding: 16px
- Hover: gray-50 background,- Cursor: pointer
- Transition: 150ms

**Source Content**:
- **Icon**: GitHub (gray-400), 24x24
- **Name**: Font-semibold text-gray-900
- **Description**: text-sm text-gray-600
- **Tags**: Pill badges (gray-100, gray-200, gray-300)

---

### 7. Empty State

**Layout**: Centered in content area
**Background**: transparent

**Structure**:
```
┌─────────────────────────────────────────┐
│              [🔍]                     │
│        (gray-100, 48x48)                     │
│                                         │
│      No skills found                        │
│      Try different keywords              │
│                                         │
└─────────────────────────────────────────┘
```

**Icon**: Search icon (Heroicons outline)
- Size: 48x48
- Color: gray-100
- Background: gray-50
- Border-radius: full (rounded-full)

**Text**:
- "No skills found": text-lg font-semibold text-gray-900
- "Try different keywords": text-sm text-gray-500

---

## Interaction Patterns

### Debounce Behavior

**Search Input**: 500ms debounce
**Why**: Prevent excessive GitHub API calls while user types
**Implementation**: Use lodash.debounce or React useEffect with cleanup

### Infinite Scroll

**Trigger**: Intersection Observer when user scrolls near bottom
**Load More**: Fetch next page of results (20 per page)
**Implementation**: Intersection Observer API with threshold 0.1

### Modal Interactions

**Open**:
- Click on search result card
- Click preview button
- Programmatic: `openPreviewDialog(data)`

**Close**:
- Click outside modal
- Press Escape key
- Click X button
- Programmatic: `closePreviewDialog()`

**Focus Management**: Auto-focus on first input when modal opens

### Conflict Resolution Flow

**Trigger**: Install attempt detects existing skill
**Show dialog**: ConflictResolutionDialog appears
**User selects**: Overwrite, Rename, or Skip
**Continue**: Resume installation with chosen resolution
**Apply to all**: If checked, apply to all subsequent conflicts
**Close**: Dialog closes,**Continue**: Installation proceeds

---

## Animation Specifications

### Transitions

**Standard Transition**: `transition-colors duration-200`
**Fast Transition**: `transition-colors duration-150`
**Smooth Transition**: `transition-all duration-300 ease-in-out`

**Applied To**:
- Hover states on cards,- Modal open/close animations
- Progress bar fill animations
- Button state changes

### Loading States

**Spinner**: Animated rotation
**Skeleton Cards**: Pulse animation
**Progress Bar**: Fill animation (width transition)

---

## Accessibility Standards

### Keyboard Navigation

**Tab Order**: Search input → Results → Preview → Install
**Focus Indicators**: Visible ring around focused elements
**Skip Links**: Skip to main content, main actions

**Screen Readers**:
- All buttons have aria-labels
- All cards have aria-describedby
- Modal overlay has aria-modal="true"
- Progress bars have aria-valuenow

### Color Contrast

**Minimum Ratio**: 4.5:1 (WCAG AA)
**Focus Indicators**: Visible in both light and dark modes
**Interactive Elements**: Clear hover/focus states

---

## Responsive Breakpoints

**Desktop (≥1024px)**: Full layout
**Tablet (768-1024px)**: Sidebar collapses to drawer
**Small Tablet (<768px)**: Single column, stacked layout

---

## Icon Usage

### Icon Set: Heroicons (Outline)
**Why**: Consistent, professional, lightweight

**Required Icons**:
- `search` (SearchPanel)
- `x` (Close buttons)
- `folder` (File tree directories)
- `document` (File tree files)
- `star` (Star count)
- `clock` (Update time)
- `arrow-right` (External links)
- `download` (Install action)
- `eye` (Preview action)
- `check` (Completed state)
- `exclamation` (Warning/error)

**Sizing**: Fixed 20x20 viewBox, with w-5 h-5 classes

---

## Anti-Patterns to Avoid

### ❌ No Emoji Icons
**Problem**: Emojis look unprofessional and inconsistent across platforms
**Solution**: Use SVG icons from Heroicons/Lucide

### ❌ No Scale Transforms on Hover
**Problem**: Layout shifts when hovering over cards
**Solution**: Use color/opacity transitions only (bg-color, border-color)

### ❌ No Missing Cursor Pointers
**Problem**: Users don't know elements are clickable
**Solution**: Add `cursor-pointer` to all interactive elements

### ❌ No Instant State Changes
**Problem**: Jarring user experience
**Solution**: Add `transition-colors duration-200` to all state changes

### ❌ No Low-Contrast Text
**Problem**: Text hard to read in light mode
**Solution**: Use gray-900 for text, ensure 4.5:1 contrast ratio

### ❌ No Hidden Content on Scroll
**Problem**: Fixed navbars hide content
**Solution**: Add top padding to body equal to navbar height

---

## Quality Checklist

Before finalizing each component, verify:

### Visual
- [ ] No emojis used as icons
- [ ] All icons from Heroicons (consistent set)
- [ ] Hover states don't cause layout shift
- [ ] Smooth transitions on all interactions
- [ ] Proper contrast in light mode

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Clear hover feedback (color, border, shadow)
- [ ] Transitions are 150-300ms (not >500ms)
- [ ] Keyboard navigation works

### Layout
- [ ] No content hidden behind fixed elements
- [ ] Consistent spacing and alignment
- [ ] Responsive at different screen sizes
- [ ] No horizontal scroll on desktop

### Accessibility
- [ ] All images have alt text
- [ ] Form elements have labels
- [ ] Focus states are visible
- [ ] Screen reader compatible

---

## Implementation Notes

### State Management

**Search State**:
- Query string
- Results array
- Loading boolean
- Error state
- Pagination (current page, hasMore)

**Preview State**:
- Preview content
- Loading boolean
- Error state
- Selected file in tree

**Install State**:
- Install progress
- Target directory
- Conflict state
- Error state

### Error Handling

**Network Errors**:
- Show retry button
- Display user-friendly message
- Log error details

**GitHub API Errors**:
- Rate limit: Show wait time and PAT prompt
- 404: Show "skill not found" message
- Network: Show connection error

**Validation Errors**:
- Empty skill: Show validation error
- Invalid path: Show error before attempting install

---

## File Structure

```
src/renderer/components/
├── SearchPanel.tsx           # Main search interface
├── SearchResultCard.tsx      # Individual result card
├── SkillPreview.tsx          # Preview modal
├── InstallDialog.tsx         # Installation dialog
├── ConflictResolutionDialog.tsx # Conflict handling
└── Sidebar.tsx               # Curated sources sidebar
```

---

## Next Steps

1. ✅ Review design specifications
2. ⬜ Implement SearchPanel component
3. ⬜ Implement SearchResultCard component
4. ⬜ Implement SkillPreview modal
5. ⬜ Implement InstallDialog
6. ⬜ Implement ConflictResolutionDialog
7. ⬜ Implement Sidebar component
8. ⬜ Test all components
9. ⬜ Verify accessibility
10. ⬜ Test responsive layouts
