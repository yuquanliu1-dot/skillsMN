# AI Rewrite Feature - Right-Click Menu Integration

## Overview

This feature adds an "AI Rewrite" option to the Monaco Editor's right-click context menu, allowing users to quickly rewrite selected text using AI assistance.

## User Flow

1. User selects text in the skill editor
2. User right-clicks on the selection
3. Context menu appears with "AI Rewrite" option (or use `Ctrl+Alt+R` shortcut)
4. User clicks "AI Rewrite"
5. Small floating popover appears near the cursor position
6. User enters rewrite instructions (e.g., "Make it more concise", "Fix grammar")
7. User clicks "Rewrite" button (or `Ctrl+Enter`)
8. Popover shows processing indicator (pulsing icon)
9. AI generates rewritten content in background (no streaming display)
10. Selected text is automatically replaced with AI-generated content
11. Popover closes automatically
12. Editor shows unsaved changes indicator

## Technical Implementation

### Components

1. **AIRewritePopover.tsx** (New)
   - Small floating dialog component
   - Shows selected text preview (truncated if too long)
   - Textarea for rewrite instructions
   - Processing indicator (pulsing icon + "AI is thinking..." text)
   - Keyboard shortcuts: `Ctrl+Enter` to submit, `Escape` to cancel
   - Auto-focus on input when opened

2. **SkillEditor.tsx** (Modified)
   - Added Monaco Editor context menu action
   - Integrated AIRewritePopover component
   - Added state management for rewrite selection and popover
   - Uses `useAIGeneration` hook with 'replace' mode
   - Automatically replaces selected text on completion

### Key Features

- **Context-Aware Positioning**: Popover appears near cursor position
- **No Streaming UI**: Processing happens silently in background
- **Visual Feedback**: Pulsing animation and "AI is thinking..." message
- **Keyboard Shortcuts**: `Ctrl+Alt+R` to trigger, `Ctrl+Enter` to submit
- **Smart Text Handling**: Shows preview of selected text (truncated if > 150 chars)
- **Auto-Close**: Popover closes automatically when rewrite completes

### State Management

```typescript
// Popover state
const [isAIRewritePopoverOpen, setIsAIRewritePopoverOpen] = useState<boolean>(false);
const [rewriteSelection, setRewriteSelection] = useState<{ text: string; range: monaco.Range } | null>(null);
const [rewritePopoverPosition, setRewritePopoverPosition] = useState<{ x: number; y: number } | undefined>();

// AI generation hook
const { status: aiStatus, content: aiContent, generate, reset: resetAI } = useAIGeneration();
```

### Context Menu Integration

```typescript
editor.addAction({
  id: 'ai-rewrite',
  label: 'AI Rewrite',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
  contextMenuGroupId: 'navigation',
  contextMenuOrder: 1.5,
  run: (ed) => {
    // Get selection and position
    // Open popover near cursor
  },
});
```

### AI Rewrite Flow

1. User confirms rewrite with prompt
2. `handleAIRewriteConfirm()` calls `generate()` with mode='replace'
3. AI processes in background (no UI updates during streaming)
4. `useEffect` watches for completion:
   ```typescript
   useEffect(() => {
     if (aiStatus === 'COMPLETE' && aiContent && rewriteSelection) {
       // Replace selected text with AI content
       editor.executeEdits('ai-rewrite', [{
         range: rewriteSelection.range,
         text: aiContent,
       }]);
       // Cleanup
     }
   }, [aiStatus, aiContent, rewriteSelection]);
   ```

## UI Layout

```
┌─────────────────────────────────────┐
│  ✨ AI Rewrite              [X]     │
├─────────────────────────────────────┤
│  Selected text:                     │
│  ┌───────────────────────────────┐ │
│  │ function hello() {            │ │
│  │   console.log("Hello...       │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  How would you like to rewrite it? │
│  ┌───────────────────────────────┐ │
│  │ Make it more concise and      │ │
│  │ add error handling...         │ │
│  └───────────────────────────────┘ │
│  Ctrl+Enter to submit               │
│                    [Cancel] [⚡ Rewrite] │
└─────────────────────────────────────┘
```

## Design Decisions

1. **Minimalist UI**: Small, focused popover instead of large panel
2. **Background Processing**: No streaming display to keep UI simple
3. **Context-Aware**: Popover appears at cursor position for better UX
4. **Visual Feedback**: Pulsing animation indicates AI is working
5. **Keyboard-Friendly**: Full keyboard navigation support
6. **Auto-Replace**: Seamless integration without manual copy-paste

## Future Improvements

1. Add rewrite history/suggestions
2. Support multiple rewrite variants to choose from
3. Add "Improve" quick action (one-click rewrite with default prompt)
4. Show diff preview before applying changes
5. Support undo/redo for AI rewrites
6. Add rewrite templates (e.g., "Fix grammar", "Make formal")
