const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const owner = 'yuquanliu1-dot';
const repo = 'devops-skills';
const branch = 'main';
const skillDirName = 'pwd';
const fullPath = `${skillDirName}/skill.md`;

async function testUpload() {
  console.log('Testing GitHub API upload...\n');
  console.log('Owner:', owner);
  console.log('Repo:', repo);
  console.log('Branch:', branch);
  console.log('Full Path:', fullPath);

  // Test 1: Check if file exists
  const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`;
  console.log('\nCheck URL:', checkUrl);

  try {
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'skillsMN-App',
      },
    });

    console.log('\nCheck Response Status:', checkResponse.status);
    console.log('Check Response Status Text:', checkResponse.statusText);

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('File exists! SHA:', data.sha);
      console.log('File content (first 100 chars):', atob(data.content).toString().substring(0, 100));
    } else if (checkResponse.status === 404) {
      console.log('File does not exist (will create new)');
    } else {
      const errorText = await checkResponse.text();
      console.log('Check failed:', errorText);
    }
  } catch (error) {
    console.error('Check request failed:', error.message);
  }
}

testUpload();
