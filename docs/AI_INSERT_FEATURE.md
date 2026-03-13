# AI Insert Feature - Right-Click Menu Integration

## Overview

This feature adds an "AI Insert" option to the Monaco Editor's right-click context menu, allowing users to quickly insert AI-generated content at the cursor position in skill files.

## User Flow

1. User positions cursor in the skill editor (no text selected)
2. User right-clicks at the cursor position
3. Context menu appears with "AI Insert" option (or use `Ctrl+Alt+I` shortcut)
4. User clicks "AI Insert"
5. Small floating popover appears near the cursor position
6. User enters insert instructions (e.g., "Add code examples", "Insert troubleshooting section")
7. User clicks "Insert" button (or `Ctrl+Enter`)
8. Popover shows processing indicator (pulsing icon)
9. AI generates content in background (no streaming display), considering entire file as context
10. Generated content is automatically inserted at cursor position
11. Popover closes automatically
12. Editor shows unsaved changes indicator

## Technical Implementation

### Components

1. **AIAssistantPopover.tsx** (Shared component)
   - Generic floating dialog component supporting both 'rewrite' and 'insert' modes
   - Mode-specific styling: green theme for insert mode
   - Textarea for insert instructions
   - Processing indicator (pulsing icon + "AI is thinking..." text)
   - Keyboard shortcuts: `Ctrl+Enter` to submit, `Escape` to cancel
   - Auto-focus on input when opened

2. **SkillEditor.tsx** (Modified)
   - Added Monaco Editor context menu action for AI Insert
   - Integrated AIAssistantPopover component with mode="insert"
   - Added state management for insert position and popover
   - Uses `useAIGeneration` hook with 'insert' mode
   - Passes entire file content as context for AI generation
   - Automatically inserts generated content at cursor position on completion

### Key Features

- **Context-Aware Positioning**: Popover appears near cursor position
- **No Streaming UI**: Processing happens silently in background
- **Visual Feedback**: Pulsing animation and "AI is thinking..." message
- **Keyboard Shortcuts**: `Ctrl+Alt+I` to trigger, `Ctrl+Enter` to submit
- **Full File Context**: AI considers entire file content when generating insertions
- **Auto-Close**: Popover closes automatically when insert completes
- **Green Theme**: Distinct visual styling (green) to differentiate from rewrite (purple)

### State Management

```typescript
// Insert state
const [isAIInsertPopoverOpen, setIsAIInsertPopoverOpen] = useState<boolean>(false);
const [insertPosition, setInsertPosition] = useState<{ line: number; column: number } | null>(null);
const [insertPopoverPosition, setInsertPopoverPosition] = useState<{ x: number; y: number } | undefined>();

// AI generation hook (shared with rewrite)
const { status: aiStatus, content: aiContent, generate, reset: resetAI } = useAIGeneration();
```

### Context Menu Integration

```typescript
editor.addAction({
  id: 'ai-insert',
  label: 'AI Insert',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyI],
  contextMenuGroupId: 'navigation',
  contextMenuOrder: 1.6,
  run: (ed) => {
    const selection = ed.getSelection();
    // Only show if there's NO selection (cursor positioned)
    if (!selection || !selection.isEmpty()) {
      return;
    }
    // Get cursor position and open popover
  },
});
```

### AI Insert Flow

1. User confirms insert with prompt
2. `handleAIInsertConfirm()` calls `generate()` with mode='insert' and entire file content
3. AI processes in background (no UI updates during streaming)
4. `useEffect` watches for completion:
   ```typescript
   useEffect(() => {
     if (aiStatus === 'COMPLETE' && aiContent && insertPosition && editorRef.current) {
       // Insert AI content at cursor position
       editorRef.current.executeEdits('ai-insert', [{
         range: new monaco.Range(
           insertPosition.line,
           insertPosition.column,
           insertPosition.line,
           insertPosition.column
         ),
         text: aiContent,
       }]);
       // Cleanup
     }
   }, [aiStatus, aiContent, insertPosition, resetAI]);
   ```

## UI Layout

```
┌─────────────────────────────────────┐
│  ✨ AI Insert               [X]     │
├─────────────────────────────────────┤
│  What would you like to insert?     │
│  ┌───────────────────────────────┐ │
│  │ Add a troubleshooting section  │ │
│  │ with common errors and...      │ │
│  └───────────────────────────────┘ │
│  Ctrl+Enter to submit               │
│                    [Cancel] [+ Insert] │
└─────────────────────────────────────┘
```

## Design Decisions

1. **Minimalist UI**: Small, focused popover instead of large panel
2. **Background Processing**: No streaming display to keep UI simple
3. **Context-Aware**: Popover appears at cursor position for better UX
4. **Visual Feedback**: Pulsing animation indicates AI is working
5. **Keyboard-Friendly**: Full keyboard navigation support
6. **Auto-Insert**: Seamless integration without manual copy-paste
7. **Full File Context**: AI has access to entire file for better contextual insertions
8. **Distinct Styling**: Green theme differentiates from AI Rewrite (purple)

## Differences from AI Rewrite

| Feature | AI Rewrite | AI Insert |
|---------|-----------|-----------|
| **Trigger Condition** | Text selected | No selection (cursor only) |
| **Menu Order** | 1.5 | 1.6 |
| **Keyboard Shortcut** | `Ctrl+Alt+R` | `Ctrl+Alt+I` |
| **Color Theme** | Purple | Green |
| **Selected Text Preview** | Yes | No |
| **Context** | Selected text + full file | Full file only |
| **Operation** | Replace selection | Insert at cursor |

## Future Improvements

1. Add insert history/suggestions
2. Support multiple insert variants to choose from
3. Add "Smart Insert" quick action (one-click insert with context-aware suggestions)
4. Show preview before applying changes
5. Support undo/redo for AI inserts
6. Add insert templates (e.g., "Add header", "Insert example")
7. Multi-cursor insert support
8. Insert at multiple positions simultaneously
