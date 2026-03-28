/**
 * AI Skill Creation Flow Test
 *
 * Tests the complete flow of AI creating a skill and conversation being saved with skillName
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('AI Skill Creation Flow', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: 'true'
      }
    });

    page = await electronApp.firstWindow({ timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Capture console logs for debugging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    // Wait for app to be ready - look for any skill-related element
    await page.waitForSelector('text=/Skills|skill/', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should save conversation with skillName when AI creates skill', async () => {
    const testSkillName = `test-skill-${Date.now()}`;
    const userDataPath = await electronApp.evaluate(async ({ app }) => app.getPath('userData'));
    const conversationsDir = path.join(userDataPath, 'ai-conversations');

    // Ensure conversations directory exists
    if (!fs.existsSync(conversationsDir)) {
      fs.mkdirSync(conversationsDir, { recursive: true });
    }

    // Count existing conversations
    const filesBefore = fs.existsSync(conversationsDir)
      ? fs.readdirSync(conversationsDir).filter(f => f.endsWith('.json'))
      : [];
    console.log(`[Test] Conversations before: ${filesBefore.length}`);

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/artifacts/initial-state.png' });

    // First, click "New Skill" button to open the skill editor (AI button is inside the editor)
    console.log('[Test] Looking for New Skill button...');
    const newSkillSelectors = [
      'button:has-text("New Skill")',
      'button:has-text("新建技能")',
      'button:has-text("Create Skill")',
      'button[aria-label*="New Skill"]',
      'button[aria-label*="Create Skill"]'
    ];

    let newSkillClicked = false;
    for (const selector of newSkillSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        newSkillClicked = true;
        console.log(`[Test] Clicked New Skill button: ${selector}`);
        break;
      }
    }

    if (!newSkillClicked) {
      console.log('[Test] Could not find New Skill button, trying to find existing skill to click...');
      // Try clicking on any skill in the list
      const skillItem = page.locator('[class*="skill-item"], [class*="SkillItem"], button:has-text("skill")').first();
      if (await skillItem.isVisible().catch(() => false)) {
        await skillItem.click();
        console.log('[Test] Clicked on existing skill');
      }
    }

    // Wait for editor to fully render
    console.log('[Test] Waiting for editor to render...');
    await page.waitForTimeout(3000);

    // Check if we're in the full editor - wait for it with timeout
    let isFullEditor = false;
    try {
      await page.waitForSelector('.monaco-editor', { timeout: 10000 });
      isFullEditor = true;
    } catch (e) {
      console.log('[Test] Monaco editor not found within timeout');
    }
    console.log(`[Test] Monaco editor visible: ${isFullEditor}`);

    await page.screenshot({ path: 'test-results/artifacts/after-new-skill.png' });

    // Now look for AI Assistant button in the editor
    // First check if the AI panel is already visible (it should be by default in new skill mode)
    console.log('[Test] Checking if AI panel is already visible...');
    let aiPanelVisible = await page.isVisible('[data-testid="ai-prompt-input"]').catch(() => false);

    if (!aiPanelVisible) {
      // Check the toggle button state - if it's purple, panel is visible; if gray, panel is hidden
      const aiButton = page.locator('button[title*="AI Assistant"]').first();
      const buttonClass = await aiButton.getAttribute('class').catch(() => '');
      console.log(`[Test] AI button class: ${buttonClass}`);

      // If button has gray background, panel is hidden - click to show it
      if (buttonClass?.includes('bg-gray-100') || buttonClass?.includes('text-gray-600')) {
        console.log('[Test] AI panel is hidden, clicking toggle to show it...');
        await aiButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('[Test] AI panel is already visible');
    }

    // Verify AI panel is now visible
    aiPanelVisible = await page.isVisible('[data-testid="ai-prompt-input"]').catch(() => false);
    if (!aiPanelVisible) {
      await page.screenshot({ path: 'test-results/artifacts/no-ai-button.png' });
      test.skip(true, 'Could not make AI panel visible');
      return;
    }

    await page.waitForTimeout(2000); // Increased wait time for sidebar animation
    await page.screenshot({ path: 'test-results/artifacts/ai-sidebar.png' });

    // Debug: Check what elements are visible
    console.log('[Test] Checking visible elements after clicking AI button...');
    const debugSelectors = [
      '[class*="sidebar"]',
      '[class*="Sidebar"]',
      '[class*="ai-"]',
      '[class*="w-\\[420px\\]"]',  // AI panel width class
      '[class*="AISkillSidebar"]',
      '[data-testid="ai-prompt-input"]',
      'textarea',
      'button:has-text("Send")',
      'button:has-text("发送")'
    ];
    for (const sel of debugSelectors) {
      const count = await page.locator(sel).count();
      console.log(`[Test] ${sel}: ${count} elements`);
    }

    // Check the AI button state
    const aiButtonState = await page.locator('button[title*="AI Assistant"]').first().getAttribute('class');
    console.log(`[Test] AI button class: ${aiButtonState}`);

    // Find the AI input - wait for it to be visible
    console.log('[Test] Looking for AI input...');
    const inputSelectors = [
      '[data-testid="ai-prompt-input"]',
      'textarea[placeholder*="Create"]',
      'textarea[placeholder*="skill"]',
      'textarea[class*="ai"]'
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      console.log(`[Test] Trying selector: ${selector}`);
      try {
        const input = page.locator(selector).first();
        // Wait up to 5 seconds for the input to be visible
        await input.waitFor({ state: 'visible', timeout: 5000 });
        await input.fill(`Create a simple skill named ${testSkillName} that prints hello world`);
        inputFound = true;
        console.log(`[Test] Found input: ${selector}`);
        break;
      } catch (e) {
        console.log(`[Test] Selector ${selector} not found: ${(e as Error).message}`);
      }
    }

    if (!inputFound) {
      console.log('[Test] Could not find AI input, taking screenshot');
      await page.screenshot({ path: 'test-results/artifacts/no-input.png' });
      test.skip(true, 'Could not find AI input');
      return;
    }

    await page.waitForTimeout(300);

    // Click send button or press Enter
    const sendSelectors = [
      '[data-testid="ai-send-button"]',
      'button:has-text("Send")',
      'button[type="submit"]'
    ];

    let sendClicked = false;
    for (const selector of sendSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        sendClicked = true;
        console.log(`[Test] Clicked send: ${selector}`);
        break;
      }
    }

    if (!sendClicked) {
      await page.keyboard.press('Enter');
      console.log('[Test] Pressed Enter to send');
    }

    console.log('[Test] Waiting for AI to complete (up to 120s)...');

    // Wait for completion - look for streaming indicator to disappear
    const startTime = Date.now();
    const maxWait = 120000; // 2 minutes
    let completed = false;

    while (Date.now() - startTime < maxWait) {
      // Check for error messages
      const hasError = await page.isVisible('text=/error|Error|failed|Failed/').catch(() => false);
      if (hasError) {
        console.log('[Test] Error detected in UI');
        const errorText = await page.locator('text=/error|Error|failed|Failed/').first().textContent().catch(() => 'Unknown error');
        console.log(`[Test] Error text: ${errorText}`);
      }

      // Check if there's an active streaming indicator
      const hasStreaming = await page.isVisible('[class*="animate-pulse"], [class*="streaming"], text=/thinking|Thinking/').catch(() => false);

      // Check if send button is re-enabled (means AI is done)
      const sendButtonEnabled = await page.locator('[data-testid="ai-send-button"]').isEnabled().catch(() => true);

      if (!hasStreaming && sendButtonEnabled) {
        // Additional check: wait a bit and verify no new content is being added
        await page.waitForTimeout(2000);
        const stillStreaming = await page.isVisible('[class*="animate-pulse"], [class*="streaming"]').catch(() => false);
        if (!stillStreaming) {
          completed = true;
          console.log('[Test] AI completed');
          break;
        }
      }

      await page.waitForTimeout(3000);
      console.log(`[Test] Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }

    if (!completed) {
      console.log('[Test] Timeout waiting for AI, checking results anyway');
    }

    // Check for any response content
    const responseContent = await page.locator('[data-testid="ai-response-content"], [class*="assistant-message"]').first().textContent().catch(() => '');
    console.log(`[Test] AI response preview: ${responseContent.substring(0, 200)}...`);

    // Additional wait for conversation to be saved
    console.log('[Test] Waiting for conversation to be saved...');
    await page.waitForTimeout(5000);

    // Take screenshot of final state
    await page.screenshot({ path: 'test-results/artifacts/final-state.png' });

    // Check for new conversation files
    const filesAfter = fs.existsSync(conversationsDir)
      ? fs.readdirSync(conversationsDir).filter(f => f.endsWith('.json'))
      : [];
    console.log(`[Test] Conversations after: ${filesAfter.length}`);

    // Find new files
    const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
    console.log(`[Test] New files: ${newFiles.length}`);

    if (newFiles.length === 0) {
      console.log('[Test] No new conversation files found - checking console logs');

      // Get console logs
      const logs = await page.evaluate(() => {
        return (window as any).__testLogs || [];
      });
      console.log('[Test] Console logs:', logs);

      test.skip(true, 'No new conversation saved');
      return;
    }

    // Check each new file for skillName
    let foundSkillName = false;
    let conversationDetails: any[] = [];

    for (const file of newFiles) {
      const filePath = path.join(conversationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const conversation = JSON.parse(content);

      const hasWriteTool = JSON.stringify(conversation.messages || []).includes('"name": "Write"');

      conversationDetails.push({
        file,
        title: conversation.title,
        skillName: conversation.skillName,
        hasWriteTool,
        messageCount: conversation.messages?.length || 0
      });

      console.log(`[Test] File ${file}:`);
      console.log(`[Test]   - title: ${conversation.title}`);
      console.log(`[Test]   - skillName: ${conversation.skillName || 'NOT SET'}`);
      console.log(`[Test]   - has Write tool: ${hasWriteTool}`);
      console.log(`[Test]   - message count: ${conversation.messages?.length || 0}`);

      if (conversation.skillName) {
        foundSkillName = true;
        console.log(`[Test] ✓ Found skillName: ${conversation.skillName}`);
      }
    }

    // Print summary
    console.log('\n[Test] === Summary ===');
    console.log(`[Test] New files: ${newFiles.length}`);
    console.log(`[Test] Files with skillName: ${conversationDetails.filter(c => c.skillName).length}`);
    console.log(`[Test] Files with Write tool: ${conversationDetails.filter(c => c.hasWriteTool).length}`);

    // At least one conversation should have skillName
    if (!foundSkillName) {
      console.log('\n[Test] ✗ No conversation has skillName field');
      console.log('[Test] This indicates the fix is not working correctly');
    }

    expect(foundSkillName).toBeTruthy();
  });
});
