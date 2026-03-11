# AI Configuration UI Verification Guide

## How to Find the AI Configuration Tab

### Step 1: Locate the Settings Button
- Look at the **top-right corner** of the application window
- You should see a button labeled **"Settings"** with a gear icon ⚙️
- The button is in the header bar next to the "skillsMN" title

### Step 2: Open Settings Dialog
- Click the **Settings** button
- A dialog/modal window should appear in the center of the screen
- The dialog has a dark background (slate-800) with the title "Settings"

### Step 3: Navigate to AI Configuration Tab
- At the top of the Settings dialog, you'll see **three tab buttons**:
  1. **General** (currently selected by default)
  2. **Private Repositories**
  3. **AI Configuration** ← This is the new tab
- Click on **"AI Configuration"** to access the AI settings

### Step 4: AI Configuration Form
The AI Configuration tab should display:
- **API Base URL** (optional) - text input field
- **API Key** - password input field
- **Model** - dropdown selector (Claude 3 Opus/Sonnet/Haiku)
- **Enable Streaming** - checkbox
- **Timeout (ms)** - number input
- **Max Retries** - number input
- **Test Connection** button
- **Save Configuration** button

## Troubleshooting

### If Settings button is not visible:
1. Check if the application window is maximized
2. Try resizing the window to ensure the button isn't hidden
3. Look for any error messages in the application

### If AI Configuration tab is not visible:
1. Make sure you've clicked the Settings button first
2. Look for the three tabs at the top of the Settings dialog
3. Try clicking different tabs to verify they work

### Console Debugging
I've added console.log statements to help debug:
1. Open Developer Tools (DevTools) in the application
2. Click the Settings button
3. Click the AI Configuration tab
4. Check the Console for these messages:
   - `[Settings] Component rendering`
   - `[Settings] Current state`
   - `[Settings] AI Configuration tab clicked`
   - `[Settings] Rendering AI Configuration tab`

## What to Report
If you still cannot see the AI Configuration tab, please tell me:
1. Can you see the Settings button in the top-right?
2. Does the Settings dialog open when you click it?
3. How many tabs do you see in the Settings dialog?
4. What are the names of the tabs you can see?
5. Any error messages in the DevTools Console?
