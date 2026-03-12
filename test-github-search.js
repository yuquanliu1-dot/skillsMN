/**
 * Test GitHub search functionality with configured token
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Read config
const configPath = path.join(
  process.env.APPDATA ||
  (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') :
   path.join(process.env.HOME, '.config')),
  'skillsMN',
  'config.json'
);

async function testGitHubSearch() {
  try {
    // Load config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = config.githubToken;

    console.log('='.repeat(60));
    console.log('Testing GitHub Search');
    console.log('='.repeat(60));
    console.log('Config path:', configPath);
    console.log('Token configured:', !!token);
    console.log('Token format:', token ? `${token.substring(0, 7)}...${token.substring(token.length - 4)}` : 'N/A');
    console.log();

    if (!token) {
      console.log('❌ No GitHub token found in config');
      console.log('Please configure token in Settings → General');
      process.exit(1);
    }

    // Test search
    const query = 'code review "skill.md" in:path';
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=5`;

    console.log('Search URL:', url);
    console.log();

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'skillsMN-App',
      Authorization: `token ${token}`
    };

    console.log('Sending request...');
    const startTime = Date.now();

    const response = await fetch(url, { headers });
    const latency = Date.now() - startTime;

    console.log('Response status:', response.status, response.statusText);
    console.log('Latency:', latency, 'ms');
    console.log();

    // Check rate limit headers
    const rateLimit = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset')
    };

    console.log('Rate Limit:');
    console.log('  Limit:', rateLimit.limit, 'requests/hour');
    console.log('  Remaining:', rateLimit.remaining, 'requests');
    console.log('  Reset:', rateLimit.reset ? new Date(parseInt(rateLimit.reset) * 1000).toLocaleString() : 'N/A');
    console.log();

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Request failed');
      console.log('Error:', error);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Search successful!');
    console.log('Total results:', data.total_count);
    console.log('Results returned:', data.items ? data.items.length : 0);
    console.log();

    if (data.items && data.items.length > 0) {
      console.log('Sample results:');
      console.log('─'.repeat(60));

      data.items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.repository.full_name}`);
        console.log(`   Path: ${item.path}`);
        console.log(`   ⭐ ${item.repository.stargazers_count} stars`);
        console.log(`   🔗 ${item.repository.html_url}`);
        console.log();
      });
    }

    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGitHubSearch();
