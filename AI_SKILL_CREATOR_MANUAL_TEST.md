# AI Skill Creator Path Fix - Manual Testing Guide

## Prerequisites
- Application is running in development mode
- AI API key is configured
- Application skills directory is set to: `D:\skillsMN\skills`

## Test Scenario: Create a New Skill with AI

### Step 1: Open AI Skill Creator
1. Click the **AI Skill Creator** button (✨ icon) in the toolbar
2. The AI Skill Creator dialog should open

### Step 2: Enter Prompt
Enter a simple test prompt like:
```
Create a skill called "test-ls" that lists files in the current directory
```

### Step 3: Generate Skill
1. Click the **⚡ Generate** button (purple lightning icon)
2. Watch the preview window for:
   - Tool calls (you should see AI using Bash and Write tools)
   - Generated content streaming in

### Step 4: Verify Path in Logs

**What to look for in the console logs:**

✅ **Correct behavior:**
```
[DEBUG] [AIService] Agent using tool | {
  "tool": "Write",
  "input": {
    "file_path": "D:\skillsMN\skills\test-ls\skill.md",
    ...
  }
}
```

❌ **Incorrect behavior (OLD bug):**
```
[DEBUG] [AIService] Agent using tool | {
  "tool": "Write",
  "input": {
    "file_path": "/Users/xiokun/.claude/skills/test-ls/skill.md",
    ...
  }
}
```

### Step 5: Verify File Creation
After generation completes, check that the skill was created in the correct location:

**Expected location:**
```
D:\skillsMN\skills\test-ls\skill.md
```

**How to verify:**
1. Open File Explorer
2. Navigate to `D:\skillsMN\skills\`
3. You should see a new folder `test-ls`
4. Inside that folder, there should be `skill.md`

### Step 6: Verify Skill Appears in List
1. The skill "test-ls" should appear in the skills list
2. It should have the source label: "Application"
3. Click on it to view/edit

## Success Indicators

✅ File created at: `D:\skillsMN\skills\<skill-name>\skill.md`
✅ Skill appears in application list
✅ No errors in console
✅ Path in logs shows `D:\skillsMN\skills\` NOT `~/.claude/skills/`

