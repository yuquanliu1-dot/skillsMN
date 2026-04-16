/**
 * Migration script to add keywords to existing default groups
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, 'Library/Application Support/skillsmn/config.json');
const backupPath = configPath + '.backup';

// Default keywords for each group
const defaultKeywords = {
  'default-plan': [
    'plan', 'planning', 'design', 'architecture', 'spec', 'specification',
    'requirement', 'analysis', 'blueprint', 'schema', 'structure',
    '规划', '设计', '架构', '需求', '分析', '方案', '蓝图', '结构'
  ],
  'default-code': [
    'code', 'coding', 'implement', 'implementation', 'develop', 'development',
    'write', 'programming', 'program', 'refactor', 'feature', 'function',
    '代码', '实现', '开发', '编程', '重构', '功能'
  ],
  'default-build': [
    'build', 'compile', 'compilation', 'package', 'packaging', 'bundle',
    'artifact', 'dependency', 'webpack', 'vite',
    '构建', '编译', '打包', '依赖'
  ],
  'default-test': [
    'test', 'testing', 'verify', 'verification', 'validate', 'validation',
    'check', 'inspect', 'unit', 'integration', 'e2e', 'assert', 'mock',
    '测试', '验证', '检查', '单元', '断言', '模拟'
  ],
  'default-release': [
    'release', 'publish', 'version', 'changelog', 'tag', 'announcement',
    'launch', 'distribute',
    '发布', '版本', '更新', '公告', '上线', '分发'
  ],
  'default-deploy': [
    'deploy', 'deployment', 'install', 'installation', 'setup', 'configure',
    'provision', 'infrastructure', 'environment', 'server', 'hosting',
    '部署', '安装', '配置', '环境', '服务器', '托管', '运维'
  ],
  'default-operate': [
    'operate', 'operation', 'maintain', 'maintenance', 'run', 'running',
    'manage', 'management', 'admin', 'administration', 'troubleshoot',
    '运行', '维护', '管理', '运维', '故障排除'
  ],
  'default-monitor': [
    'monitor', 'monitoring', 'log', 'logging', 'metric', 'metrics',
    'alert', 'alerting', 'trace', 'observability', 'dashboard', 'analytics',
    'debug', 'profiling', 'performance',
    '监控', '日志', '指标', '告警', '追踪', '仪表板', '分析', '调试', '性能'
  ]
};

console.log('Reading config from:', configPath);

try {
  // Create backup
  fs.copyFileSync(configPath, backupPath);
  console.log('Backup created at:', backupPath);

  // Read config
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update default groups with keywords
  let updatedCount = 0;
  config.skillGroups.groups.forEach(group => {
    if (group.isDefault && defaultKeywords[group.id]) {
      group.keywords = defaultKeywords[group.id];
      group.updatedAt = new Date().toISOString();
      updatedCount++;
      console.log(`✅ Updated keywords for ${group.id}: ${group.keywords.length} keywords`);
    }
  });

  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Config updated successfully. Updated ${updatedCount} groups.`);
  console.log('✅ Migration completed!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
