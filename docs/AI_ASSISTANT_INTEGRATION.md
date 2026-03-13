# AI Assistant Integration in Skill Editor

## Overview

The Skill Editor now includes two AI-powered context menu actions that allow users to quickly rewrite selected text or insert new content using Claude AI, all without leaving the editor.

## Features

### 1. AI Rewrite (`Ctrl+Alt+R`)
- **When to use**: When you have selected text that needs improvement or modification
- **Context menu**: Appears when text is selected
- **Color theme**: Purple
- **Shows preview**: Displays selected text in popover
- **Operation**: Replaces selected text with AI-generated content

### 2. AI Insert (`Ctrl+Alt+I`)
- **When to use**: When you want to insert new content at cursor position
- **Context menu**: Appears when NO text is selected (cursor positioned)
- **Color theme**: Green
- **Shows preview**: No preview (inserting new content)
- **Operation**: Inserts AI-generated content at cursor position

## Common User Experience

Both features share the same interaction pattern:

1. **Trigger**: Right-click in editor or use keyboard shortcut
2. **Popover**: Small floating dialog appears near cursor
3. **Input**: Enter your requirements/instructions
4. **Processing**: Pulsing indicator shows AI is working (no streaming display)
5. **Completion**: Content is automatically applied to editor
6. **Cleanup**: Popover closes automatically

## Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| AI Rewrite | `Ctrl+Alt+R` | Rewrite selected text |
| AI Insert | `Ctrl+Alt+I` | Insert content at cursor |
| Submit | `Ctrl+Enter` | Submit prompt to AI |
| Cancel | `Escape` | Close popover |

## Technical Architecture

### Shared Components

1. **AIAssistantPopover.tsx**
   - Generic component supporting both modes
   - Props determine mode-specific behavior and styling
   - `mode: 'rewrite' | 'insert'`
   - `selectedText?: string` (only for rewrite)

2. **useAIGeneration.ts** (Hook)
   - Manages AI generation state
   - Handles streaming responses
   - Provides `generate()`, `reset()`, status, and content

3. **AIService.ts** (Backend)
   - Handles AI generation with Claude Agent SDK
   - Supports multiple modes: 'new', 'modify', 'insert', 'replace'
   - Manages API keys and configuration

### State Management

```typescript
// Rewrite state
const [isAIRewritePopoverOpen, setIsAIRewritePopoverOpen] = useState(false);
const [rewriteSelection, setRewriteSelection] = useState<{
  text: string;
  range: monaco.Range;
} | null>(null);
const [rewritePopoverPosition, setRewritePopoverPosition] = useState<{
  x: number;
  y: number;
} | undefined>();

// Insert state
const [isAIInsertPopoverOpen, setIsAIInsertPopoverOpen] = useState(false);
const [insertPosition, setInsertPosition] = useState<{
  line: number;
  column: number;
} | null>(null);
const [insertPopoverPosition, setInsertPopoverPosition] = useState<{
  x: number;
  y: number;
} | undefined>();

// Shared AI hook
const { status, content, generate, reset } = useAIGeneration();
```

### Monaco Editor Integration

Both features are implemented as Monaco Editor actions:

```typescript
editor.addAction({
  id: 'ai-rewrite',
  label: 'AI Rewrite',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
  contextMenuGroupId: 'navigation',
  contextMenuOrder: 1.5,
  run: (ed) => { /* ... */ }
});

editor.addAction({
  id: 'ai-insert',
  label: 'AI Insert',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyI],
  contextMenuGroupId: 'navigation',
  contextMenuOrder: 1.6,
  run: (ed) => { /* ... */ }
});
```

## Implementation Details

### AI Context Passing

**AI Rewrite**:
```typescript
generate(prompt, 'replace', {
  content,                    // Full file content
  selectedText: rewriteSelection.text,  // Selected portion
  cursorPosition: undefined,
});
```

**AI Insert**:
```typescript
generate(prompt, 'insert', {
  content,                    // Full file content (only context)
  selectedText: undefined,
  cursorPosition: undefined,
});
```

### Completion Handling

**AI Rewrite**:
```typescript
useEffect(() => {
  if (status === 'COMPLETE' && content && rewriteSelection && editorRef.current) {
    editorRef.current.executeEdits('ai-rewrite', [{
      range: rewriteSelection.range,
      text: content,
    }]);
    // Cleanup...
  }
}, [status, content, rewriteSelection]);
```

**AI Insert**:
```typescript
useEffect(() => {
  if (status === 'COMPLETE' && content && insertPosition && editorRef.current) {
    editorRef.current.executeEdits('ai-insert', [{
      range: new monaco.Range(
        insertPosition.line,
        insertPosition.column,
        insertPosition.line,
        insertPosition.column
      ),
      text: content,
    }]);
    // Cleanup...
  }
}, [status, content, insertPosition]);
```

## Design Principles

1. **Minimal Disruption**: Small popovers, no large panels
2. **Context Awareness**: Popover appears near cursor
3. **Silent Processing**: No streaming display to keep UI simple
4. **Visual Feedback**: Pulsing animation indicates activity
5. **Keyboard-First**: Full keyboard navigation support
6. **Auto-Apply**: No manual copy-paste needed
7. **Mode Differentiation**: Distinct colors for different operations

## Testing Checklist

- [ ] AI Rewrite appears when text is selected
- [ ] AI Rewrite does NOT appear when no text is selected
- [ ] AI Insert appears when NO text is selected
- [ ] AI Insert does NOT appear when text is selected
- [ ] Popover appears near cursor position
- [ ] Keyboard shortcuts work (`Ctrl+Alt+R`, `Ctrl+Alt+I`)
- [ ] `Ctrl+Enter` submits prompt
- [ ] `Escape` cancels operation
- [ ] Pulsing indicator shows during processing
- [ ] Content is correctly replaced (rewrite)
- [ ] Content is correctly inserted at cursor (insert)
- [ ] Unsaved changes indicator appears after operation
- [ ] Popover closes automatically on completion
- [ ] Error handling works correctly

## Related Documentation

- [AI Rewrite Feature](./AI_REWRITE_FEATURE.md) - Detailed rewrite feature documentation
- [AI Insert Feature](./AI_INSERT_FEATURE.md) - Detailed insert feature documentation
- [AI Service](../src/main/services/AIService.ts) - Backend AI implementation
- [AI Assist Panel](./AI_SKILL_CREATION.md) - Full AI panel for complex operations

## Future Enhancements

1. **Smart Suggestions**: Context-aware suggestions based on cursor position
2. **History**: Track recent AI operations for quick access
3. **Templates**: Pre-defined prompts for common operations
4. **Preview Mode**: Show diff before applying changes
5. **Multi-Cursor**: Support simultaneous operations at multiple cursors
6. **Batch Operations**: Apply AI to multiple selections
7. **Custom Prompts**: Save and reuse custom prompts
8. **Voice Input**: Dictate prompts instead of typing
