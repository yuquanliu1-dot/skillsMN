/**
 * Test script to validate AI configuration with custom API endpoint
 */

const Anthropic = require('@anthropic-ai/sdk').default;

// Test configuration
const testConfig = {
  apiKey: 'f8b3db6f0e6c8ed9c7890fe4d3c43be6.6tNmJ4ncX8h3JKdw',
  baseURL: 'https://open.bigmodel.cn/api/anthropic'
};

// List of models to test
const modelsToTest = [
  'claude-sonnet-4-6-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet',
  'claude-3-sonnet',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229'
];

async function testAIConnection() {
  console.log('='.repeat(60));
  console.log('Testing AI Configuration');
  console.log('='.repeat(60));
  console.log('Base URL:', testConfig.baseURL);
  console.log('API Key:', testConfig.apiKey.substring(0, 10) + '...');
  console.log();

  try {
    // Initialize Anthropic client with custom base URL
    const client = new Anthropic({
      apiKey: testConfig.apiKey,
      baseURL: testConfig.baseURL
    });

    console.log('✓ Client initialized successfully');
    console.log();

    // Test each model
    for (const model of modelsToTest) {
      console.log(`Testing model: ${model}...`);

      try {
        const startTime = Date.now();

        const message = await client.messages.create({
          model: model,
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Say "OK" if you can read this.'
            }
          ]
        });

        const latency = Date.now() - startTime;

        console.log(`  ✓ SUCCESS with model: ${model}`);
        console.log(`    Latency: ${latency}ms`);
        console.log(`    Response: ${message.content[0].text}`);
        console.log();
        console.log('='.repeat(60));
        console.log(`SUCCESS: Found working model - ${model}`);
        console.log('='.repeat(60));

        return { success: true, latency, model };
      } catch (error) {
        console.log(`  ✗ Failed with ${model}: ${error.message}`);
      }
    }

    // If all models failed
    console.log();
    console.log('='.repeat(60));
    console.log('FAILED: No working models found');
    console.log('This could mean:');
    console.log('  1. The API key is invalid or expired');
    console.log('  2. The endpoint does not support these models');
    console.log('  3. The endpoint URL is incorrect');
    console.log('='.repeat(60));

    return { success: false, error: 'No working models found' };
  } catch (error) {
    console.error('✗ Client initialization failed');
    console.error('  Error:', error.message);

    if (error.status) {
      console.error('  Status:', error.status);
    }

    console.log();
    console.log('='.repeat(60));
    console.log('FAILED: AI configuration test failed');
    console.log('='.repeat(60));

    return { success: false, error: error.message };
  }
}

// Run the test
testAIConnection()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
