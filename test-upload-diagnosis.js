const fetch = require('node-fetch');

// Test GitHub API upload
const owner = 'yuquanliu1-dot';
const repo = 'devops-skills';
const branch = 'main';
const skillDirName = 'pwd';
const fullPath = `${skillDirName}/skill.md`;

// You need to set this to your actual PAT
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_PAT_HERE';

async function testUpload() {
  console.log('=== Testing GitHub API Upload ===\n');
  console.log('Repository:', `${owner}/${repo}`);
  console.log('Branch:', branch);
  console.log('Skill Path:', fullPath);
  console.log('\n--- Step 1: Test Repository Access ---');

  // Test 1: Check repository access
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  console.log('Testing repo URL:', repoUrl);

  try {
    const repoResponse = await fetch(repoUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'skillsMN-App',
      },
    });

    console.log('Repo Access Status:', repoResponse.status);

    if (repoResponse.status === 401) {
      console.log('❌ Authentication failed - Invalid or expired PAT');
      const error = await repoResponse.json();
      console.log('Error:', error.message);
      return;
    } else if (repoResponse.status === 404) {
      console.log('❌ Repository not found - Check owner/repo name');
      const error = await repoResponse.json();
      console.log('Error:', error.message);
      return;
    } else if (!repoResponse.ok) {
      console.log('❌ Failed to access repository');
      const error = await repoResponse.json();
      console.log('Error:', error.message);
      return;
    }

    const repoData = await repoResponse.json();
    console.log('✅ Repository accessible');
    console.log('Default branch:', repoData.default_branch);
    console.log('Permissions:', repoData.permissions);

    // Test 2: Check if branch exists
    console.log('\n--- Step 2: Check Branch ---');
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
    const branchResponse = await fetch(branchUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'skillsMN-App',
      },
    });

    if (branchResponse.ok) {
      console.log('✅ Branch exists:', branch);
    } else if (branchResponse.status === 404) {
      console.log('❌ Branch not found:', branch);
      const error = await branchResponse.json();
      console.log('Error:', error.message);
      return;
    }

    // Test 3: Check if file exists
    console.log('\n--- Step 3: Check File ---');
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`;
    console.log('File URL:', fileUrl);

    const fileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'skillsMN-App',
      },
    });

    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      console.log('✅ File exists');
      console.log('SHA:', fileData.sha);
      console.log('Size:', fileData.size, 'bytes');
    } else if (fileResponse.status === 404) {
      console.log('ℹ️ File does not exist (will create new file)');
    } else {
      console.log('⚠️ Unexpected status:', fileResponse.status);
    }

    // Test 4: Try upload (dry run - just test auth)
    console.log('\n--- Step 4: Test Upload Permission ---');
    console.log('To test upload, we need to actually create/update a file.');
    console.log('Set GITHUB_TOKEN environment variable and run this script to test upload.');

    if (GITHUB_TOKEN === 'YOUR_PAT_HERE') {
      console.log('\n⚠️ Please set GITHUB_TOKEN environment variable:');
      console.log('Windows: set GITHUB_TOKEN=your_token_here');
      console.log('Linux/Mac: GITHUB_TOKEN=your_token_here node test-upload.js');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpload();
