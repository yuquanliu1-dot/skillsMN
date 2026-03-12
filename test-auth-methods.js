/**
 * Test different authentication methods
 */

const https = require('https');

const testConfig = {
  apiKey: 'f8b3db6f0e6c8ed9c7890fe4d3c43be6.6tNmJ4ncX8h3JKdw',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  model: 'glm-5'
};

const url = new URL(testConfig.baseURL);

// Test different auth header variations
const authMethods = [
  { name: 'x-api-key', headers: { 'x-api-key': testConfig.apiKey } },
  { name: 'Authorization Bearer', headers: { 'Authorization': `Bearer ${testConfig.apiKey}` } },
  { name: 'Authorization (no Bearer)', headers: { 'Authorization': testConfig.apiKey } },
  { name: 'api-key', headers: { 'api-key': testConfig.apiKey } }
];

async function testAuthMethod(authMethod) {
  return new Promise((resolve) => {
    const requestData = JSON.stringify({
      model: testConfig.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK' }]
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}/v1/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'anthropic-version': '2023-06-01',
        ...authMethod.headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          authMethod: authMethod.name,
          status: res.statusCode,
          success: res.statusCode === 200,
          data: data.substring(0, 200)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        authMethod: authMethod.name,
        success: false,
        error: error.message
      });
    });

    req.write(requestData);
    req.end();
  });
}

async function runTests() {
  console.log('Testing different authentication methods...\n');

  for (const authMethod of authMethods) {
    console.log(`Testing: ${authMethod.name}`);
    const result = await testAuthMethod(authMethod);

    if (result.success) {
      console.log(`  ✓ SUCCESS (${result.status})`);
      console.log(`  Response: ${result.data.substring(0, 100)}...\n`);
      console.log('='.repeat(60));
      console.log(`Working auth method: ${authMethod.name}`);
      console.log('='.repeat(60));
      process.exit(0);
    } else {
      console.log(`  ✗ FAILED (${result.status || 'error'})`);
      if (result.error) console.log(`  Error: ${result.error}`);
    }
  }

  console.log('\nNo working auth method found!');
}

runTests();
