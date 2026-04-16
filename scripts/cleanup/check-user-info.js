/**
 * 检查当前用户信息是否正确存储
 */

const path = require('path');
const fs = require('fs');

const configPath = path.join(process.env.HOME, 'Library/Application Support/skillsmn/config.json');

if (!fs.existsSync(configPath)) {
  console.log('❌ 配置文件不存在');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('📋 配置文件中的贡献统计信息:\n');

if (config.contributionStats) {
  console.log('✅ 找到 contributionStats 配置:');
  console.log(JSON.stringify(config.contributionStats, null, 2));

  if (config.contributionStats.currentUserGitInfo) {
    console.log('\n👤 当前存储的Git用户信息:');
    console.log(JSON.stringify(config.contributionStats.currentUserGitInfo, null, 2));
  } else {
    console.log('\n❌ 没有找到 currentUserGitInfo');
    console.log('   这就是为什么贡献积分显示为0的原因！');
  }
} else {
  console.log('❌ 没有找到 contributionStats 配置');
  console.log('   这意味着用户信息还没有被设置');
}

console.log('\n🔧 解决方案:');
console.log('   1. 打开应用');
console.log('   2. 进入贡献统计页面');
console.log('   3. 应用会自动从GitLab PAT获取用户信息');
console.log('   4. 如果还是不行，请重启应用');
