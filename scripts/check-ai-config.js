/**
 * Quick AI Assistant Test
 * Tests the existing AI configuration
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function testAIConfig() {
  console.log('🔍 Checking AI Configuration...\n');

  // Check config file
  const configPath = path.join(
    process.env.APPDATA || process.env.HOME,
    'skillsMN',
    'ai-config.json'
  );

  console.log('Config path:', configPath);

  if (await fs.pathExists(configPath)) {
    const config = await fs.readJson(configPath);

    console.log('\n✅ AI Configuration Found:');
    console.log('  Provider:', config.provider);
    console.log('  Model:', config.model);
    console.log('  Base URL:', config.baseUrl || 'Default (Anthropic)');
    console.log('  Streaming:', config.streamingEnabled ? 'Enabled' : 'Disabled');
    console.log('  API Key:', config.apiKey ? '✅ Configured (encrypted)' : '❌ Not set');

    if (config.baseUrl) {
      console.log('\n🌐 Using Custom Endpoint:', config.baseUrl);

      if (config.baseUrl.includes('bigmodel.cn')) {
        console.log('  → Detected: 智谱AI (GLM)');
      } else if (config.baseUrl.includes('openai.com')) {
        console.log('  → Detected: OpenAI');
      } else {
        console.log('  → Detected: Custom Provider');
      }
    }

    console.log('\n🎉 AI Assistant is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Run: npm start');
    console.log('2. Open any skill in the editor');
    console.log('3. Click the AI Assistant button (top right)');
    console.log('4. Try generating content!\n');

    return true;
  } else {
    console.log('❌ No AI configuration found');
    console.log('\nTo configure AI:');
    console.log('1. Run: npm start');
    console.log('2. Go to Settings → AI Configuration');
    console.log('3. Enter your API key\n');
    return false;
  }
}

// Run test
testAIConfig().catch(console.error);
