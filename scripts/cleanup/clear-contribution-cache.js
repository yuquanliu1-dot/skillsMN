/**
 * 清除贡献统计缓存
 */

const path = require('path');
const fs = require('fs');

function clearContributionCache() {
  const configPath = path.join(process.env.HOME, 'Library/Application Support/skillsmn/config.json');

  if (!fs.existsSync(configPath)) {
    console.log('❌ 配置文件不存在');
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.contributionStats) {
    console.log('ℹ️  没有贡献统计缓存');
    return;
  }

  if (!config.contributionStats.repoStatsCache) {
    console.log('ℹ️  没有仓库统计缓存');
    return;
  }

  // 清除所有仓库统计缓存
  const cacheCount = Object.keys(config.contributionStats.repoStatsCache).length;
  config.contributionStats.repoStatsCache = {};

  // 保存配置
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  console.log(`✅ 已清除 ${cacheCount} 个仓库的贡献统计缓存`);
  console.log('请重启应用或重新加载贡献统计页面');
}

clearContributionCache();
