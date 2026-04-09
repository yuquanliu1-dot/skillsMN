/**
 * 贡献统计调试工具 - 模拟应用逻辑
 */

const fetch = require('node-fetch');
const https = require('https');
const path = require('path');
const fs = require('fs');

// 创建自定义HTTPS agent
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// 读取配置
function loadConfig() {
  const configPath = path.join(process.env.HOME, 'Library/Application Support/skillsmn/config.json');
  if (!fs.existsSync(configPath)) {
    console.log('❌ 配置文件不存在');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config;
}

async function main() {
  console.log('🔍 贡献统计调试工具\n');

  const pat = process.env.GITLAB_PAT;
  if (!pat) {
    console.log('❌ 请设置GITLAB_PAT环境变量');
    process.exit(1);
  }

  const config = loadConfig();

  if (!config.privateRepos || !config.privateRepos.repositories) {
    console.log('❌ 没有配置私有仓库');
    return;
  }

  const gitlabRepos = config.privateRepos.repositories.filter(repo => repo.provider === 'gitlab');
  if (gitlabRepos.length === 0) {
    console.log('❌ 没有GitLab仓库');
    return;
  }

  const repo = gitlabRepos[0];
  console.log(`📋 仓库: ${repo.displayName}`);
  console.log(`   实例: ${repo.instanceUrl}\n`);

  try {
    // 1. 获取当前用户信息（模拟应用逻辑）
    console.log('👤 步骤1: 获取GitLab用户信息...');
    const userResponse = await fetch(`${repo.instanceUrl}/api/v4/user`, {
      agent: httpsAgent,
      headers: { 'PRIVATE-TOKEN': pat }
    });

    if (userResponse.status !== 200) {
      console.log('❌ 获取用户信息失败');
      return;
    }

    const currentUser = await userResponse.json();
    console.log('✅ GitLab用户信息:');
    console.log(`   用户名: ${currentUser.username}`);
    console.log(`   姓名: ${currentUser.name}`);
    console.log(`   邮箱: ${currentUser.email}`);
    console.log(`   ID: ${currentUser.id}`);

    // 模拟应用中存储的用户信息
    const currentUserGitInfo = {
      username: currentUser.username,
      email: currentUser.email,
      userId: currentUser.id,
      instanceUrl: repo.instanceUrl,
    };
    console.log('   存储的用户信息:', JSON.stringify(currentUserGitInfo, null, 2));
    console.log('');

    // 2. 获取项目信息
    console.log('📁 步骤2: 获取项目信息...');
    const projectPath = encodeURIComponent(`${repo.owner}/${repo.repo}`);
    const projectResponse = await fetch(`${repo.instanceUrl}/api/v4/projects/${projectPath}`, {
      agent: httpsAgent,
      headers: { 'PRIVATE-TOKEN': pat }
    });

    if (projectResponse.status !== 200) {
      console.log('❌ 获取项目信息失败');
      return;
    }

    const project = await projectResponse.json();
    console.log(`✅ 项目ID: ${project.id}\n`);

    // 3. 获取仓库技能列表
    console.log('📂 步骤3: 获取技能列表...');
    const treeResponse = await fetch(
      `${repo.instanceUrl}/api/v4/projects/${project.id}/repository/tree`,
      {
        agent: httpsAgent,
        headers: { 'PRIVATE-TOKEN': pat }
      }
    );

    if (treeResponse.status !== 200) {
      console.log('❌ 获取技能列表失败');
      return;
    }

    const tree = await treeResponse.json();
    const skills = Array.isArray(tree) ? tree.filter(item => item.type === 'tree') : [];
    console.log(`✅ 找到 ${skills.length} 个技能\n`);

    // 4. 获取所有提交记录（模拟应用逻辑）
    console.log('📝 步骤4: 获取提交记录并统计贡献...');
    const allCommits = new Map();
    const contributorMap = new Map();

    for (const skill of skills.slice(0, 5)) {  // 只检查前5个技能
      const commitsResponse = await fetch(
        `${repo.instanceUrl}/api/v4/projects/${project.id}/repository/commits?path=${encodeURIComponent(skill.path)}`,
        {
          agent: httpsAgent,
          headers: { 'PRIVATE-TOKEN': pat }
        }
      );

      if (commitsResponse.status === 200) {
        const commits = await commitsResponse.json();
        allCommits.set(skill.path, commits);

        // 模拟应用的贡献者统计逻辑
        for (const commit of commits) {
          const authorEmail = commit.author_email || '';
          const authorName = commit.author_name || 'Unknown';
          const authorUsername = commit.author_username || undefined;  // 可能是 undefined

          // 使用与 ContributionStatsService.ts 相同的 key 生成逻辑
          const key = authorEmail || authorUsername || authorName;

          if (!contributorMap.has(key)) {
            contributorMap.set(key, {
              username: authorUsername,
              displayName: authorName,
              email: authorEmail,
              commitCount: 0,
            });
          }

          const contributor = contributorMap.get(key);
          contributor.commitCount += 1;
        }
      }
    }

    console.log(`✅ 处理了 ${allCommits.size} 个技能的提交记录\n`);

    // 5. 匹配当前用户（模拟应用逻辑）
    console.log('🎯 步骤5: 匹配当前用户...');
    console.log('   当前用户信息:');
    console.log(`     - 用户名: ${currentUserGitInfo.username}`);
    console.log(`     - 邮箱: ${currentUserGitInfo.email}`);
    console.log('');

    const userLogin = currentUserGitInfo.username?.toLowerCase();
    const userEmail = currentUserGitInfo.email?.toLowerCase();

    console.log('   贡献者列表:');
    let matchedContributor = null;

    contributorMap.forEach((contributor, key) => {
      const cEmail = contributor.email?.toLowerCase();
      const cUsername = contributor.username?.toLowerCase();

      // 使用与 ContributionStatsService.ts 相同的匹配逻辑
      let isMatch = false;

      // 1. 邮箱精确匹配
      if (userEmail && cEmail === userEmail) {
        isMatch = true;
        console.log(`     ✅ ${contributor.displayName} (${contributor.email}) - 邮箱匹配`);
      }
      // 2. 用户名精确匹配
      else if (userLogin && cUsername === userLogin) {
        isMatch = true;
        console.log(`     ✅ ${contributor.displayName} (${contributor.username}) - 用户名匹配`);
      }
      // 3. 邮箱作为用户名匹配
      else if (userEmail && cUsername === userEmail) {
        isMatch = true;
        console.log(`     ✅ ${contributor.displayName} - 邮箱作为用户名匹配`);
      }
      else {
        console.log(`     ❌ ${contributor.displayName} (${contributor.email || contributor.username || 'N/A'}) - ${contributor.commitCount} 次提交`);
      }

      if (isMatch && !matchedContributor) {
        matchedContributor = contributor;
      }
    });

    console.log('');

    // 6. 计算贡献分数
    if (matchedContributor) {
      const contributionScore = matchedContributor.commitCount * 10;
      console.log('🎉 匹配成功！');
      console.log(`   找到贡献者: ${matchedContributor.displayName}`);
      console.log(`   提交次数: ${matchedContributor.commitCount}`);
      console.log(`   贡献积分: ${contributionScore} 分`);
      console.log('');
      console.log('✅ 如果应用中仍显示0分，可能的原因:');
      console.log('   1. 应用缓存未清除 - 请重启应用');
      console.log('   2. 前端显示错误 - 请检查浏览器控制台');
      console.log('   3. 配置文件损坏 - 请删除 ~/Library/Application Support/skillsmn/config.json 中的 contributionStats 部分');
    } else {
      console.log('❌ 未找到匹配的贡献者');
      console.log('');
      console.log('调试信息:');
      console.log(`   当前用户邮箱: ${userEmail}`);
      console.log(`   当前用户名: ${userLogin}`);
      console.log(`   贡献者数量: ${contributorMap.size}`);
    }

  } catch (error) {
    console.log('❌ 错误:', error.message);
    console.log(error.stack);
  }
}

main().catch(console.error);
