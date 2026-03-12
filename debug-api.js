/**
 * Debug script to test API authentication with detailed logging
 */

const https = require('https');
const http = require('http');

const testConfig = {
  apiKey: 'f8b3db6f0e6c8ed9c7890fe4d3c43be6.6tNmJ4ncX8h3JKdw',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  model: 'glm-5'
};

// Parse URL
const url = new URL(testConfig.baseURL);
const path = `${url.pathname}/v1/messages`;

console.log('='.repeat(60));
console.log('API Debug Test');
console.log('='.repeat(60));
console.log('Base URL:', testConfig.baseURL);
console.log('Full Path:', path);
console.log('API Key:', testConfig.apiKey.substring(0, 15) + '...');
console.log('Model:', testConfig.model);
console.log();

// Prepare request
const requestData = JSON.stringify({
  model: testConfig.model,
  max_tokens: 10,
  messages: [
    {
      role: 'user',
      content: 'Say "OK" if you can read this.'
    }
  ]
});

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'x-api-key': testConfig.apiKey,
    'anthropic-version': '2023-06-01'
  }
};

console.log('Request Options:');
console.log(JSON.stringify(options, null, 2));
console.log();

// Make request
const protocol = url.protocol === 'https:' ? https : http;

const req = protocol.request(options, (res) => {
  console.log('Response Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  console.log();

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
    console.log();
    console.log('='.repeat(60));
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
  console.log();
  console.log('='.repeat(60));
});

req.write(requestData);
req.end();
