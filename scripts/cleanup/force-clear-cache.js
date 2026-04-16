/**
 * 强制清除贡献统计缓存
 * 通过直接修改配置文件实现
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// 可能的配置文件路径
const possiblePaths = [
  path.join(os.homedir(), 'Library/Application Support/skillsmn/config.json'),
  path.join(os.homedir(), '.config/skillsmn/config.json'),
  path.join(process.env.HOME || '', 'Library/Application Support/skillsmn/config.json'),
];

console.log('🔍 搜索配置文件...\n');

let foundConfigPath = null;
let configData = null;

for (const configPath of possiblePaths) {
  if (fs.existsSync(configPath)) {
    foundConfigPath = configPath;
    console.log(`✅ 找到配置文件: ${configPath}`);
    try {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      break;
    } catch (error) {
      console.log(`❌ 读取配置文件失败: ${error.message}`);
    }
  }
}

if (!foundConfigPath) {
  console.log('❌ 未找到配置文件');
  console.log('\n尝试的路径:');
  possiblePaths.forEach(p => console.log(`  - ${p}`));
  process.exit(1);
}

console.log('\n📋 当前配置内容:');
if (configData.contributionStats) {
  console.log('  找到 contributionStats 配置:');
  console.log(JSON.stringify(configData.contributionStats, null, 2));
} else {
  console.log('  没有 contributionStats 配置');
}

// 清除缓存
console.log('\n🧹 清除贡献统计缓存...');
if (configData.contributionStats && configData.contributionStats.repoStatsCache) {
  const cacheKeys = Object.keys(configData.contributionStats.repoStatsCache);
  console.log(`  删除了 ${cacheKeys.length} 个缓存项:`);
  cacheKeys.forEach(key => {
    console.log(`    - ${key}`);
  });

  // 清除缓存
  configData.contributionStats.repoStatsCache = {};
} else {
  console.log('  没有找到缓存数据');
}

// 备份原文件
const backupPath = foundConfigPath + '.backup';
fs.copyFileSync(foundConfigPath, backupPath);
console.log(`\n💾 已备份原配置文件到: ${backupPath}`);

// 保存修改后的配置
fs.writeFileSync(foundConfigPath, JSON.stringify(configData, null, 2), 'utf8');
console.log(`✅ 已保存修改后的配置文件`);

console.log('\n🔄 下一步:');
console.log('  1. 完全关闭应用');
console.log('  2. 重新启动应用');
console.log('  3. 打开贡献统计页面');
