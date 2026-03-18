# AI Skill Creation Feature

## Overview

This feature allows users to create new skills using AI assistance through a conversational interface. When users click "Create New Skill", they can choose between manual creation or AI-powered creation.

## User Flow

1. User opens the "Create New Skill" dialog
2. User selects the target directory (Project or Global)
3. User clicks "AI Create" button
4. AI Creation Dialog opens with:
   - Input field for skill description
   - Streaming preview area
   - Generate/Stop/Retry/Apply controls
5. User enters skill description and clicks "Generate"
6. AI generates the skill.md content with streaming preview
7. User reviews and clicks "Apply" to save the skill
8. Skill is saved to the selected directory

## Technical Implementation

### Components

1. **AISkillCreationDialog.tsx**
   - New component for AI-powered skill creation
   - Reuses existing AI generation infrastructure
   - Integrates with useAIGeneration hook
   - Uses AIStreamingPreview, PromptInput, and AIControls components

2. **CreateSkillDialog.tsx** (Modified)
   - Added "AI Create" button
   - Added onOpenAICreation callback prop
   - Shows divider between AI and manual creation options

3. **App.tsx** (Modified)
   - Added state for AI creation dialog
   - Integrated AISkillCreationDialog component
   - Passes selected directory to AI creation dialog

### Key Features

- **Streaming Preview**: Real-time display of AI-generated content
- **Directory Selection**: Respects user's choice of project/global directory
- **Error Handling**: Validates YAML frontmatter before saving
- **User Feedback**: Toast notifications on successful creation

### File Structure

```
src/renderer/components/
├── AISkillCreationDialog.tsx  (New)
├── CreateSkillDialog.tsx      (Modified)
├── AIStreamingPreview.tsx     (Existing - reused)
├── PromptInput.tsx            (Existing - reused)
└── AIControls.tsx             (Existing - reused)
```

## Design Decisions

1. **Reusability**: Leveraged existing AI generation components instead of creating new ones
2. **Consistency**: Used same UI patterns as AIAssistPanel
3. **User Experience**: Clear separation between AI and manual creation paths
4. **Error Handling**: Comprehensive validation and error messages

## Future Improvements

1. Add skill template selection
2. Support for skill modification after generation
3. Multi-turn conversation for refinement
4. Preview of generated skill structure before saving
