/**
 * AutoRefresh 完整诊断脚本
 * 用于检查文件监视器的每个环节是否正常工作
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始 AutoRefresh 完整诊断...\n');

// Step 1: 检查配置
 console.log('\n=== 步骤 1: 检查配置 ===');
const config = await window.electronAPI.loadConfig();
console.log('配置信息:', {
    项目目录: config.projectDirectory,
    自动刷新: config.autoRefresh,
    安装目录: config.defaultInstallDirectory
  });

// Step 2: 检查预期的监视路径
console.log('\n=== 步骤 2: 检查预期的监视路径 ===');
const projectSkillsPath = path.join(config.projectDirectory, '.claude', 'skills');
const globalSkillsPath = path.join(require('os').homedir(), '.claude', 'skills');

 console.log('预期监视的路径:');
 console.log('  📁 项目技能目录:', projectSkillsPath);
 console.log('  📁 全局技能目录:', globalSkillsPath);
 console.log('  📁 项目技能目录是否存在:', fs.existsSync(projectSkillsPath));
 console.log('  📁 全局技能目录是否存在:', fs.existsSync(globalSkillsPath));

// Step 3: 检查文件监视器是否在运行
 console.log('\n=== 步骤 3: 检查文件监视器状态 ===');
 console.log('⚠️ 无法直接检查文件监视器是否运行，但可以测试它是否响应');

// Step 4: 检查 IPC 通信
console.log('\n=== 步骤 4: 检查 IPC 通信 ===');
console.log('检查 electronAPI 是否可用:');
console.log('  - loadConfig:', typeof window.electronAPI?.loadConfig === 'function' ? '✅' : '❌');
console.log('  - startWatching:', typeof window.electronAPI?.startWatching === 'function' ? '✅' : '❌');
console.log('  - onFSChange:', typeof window.electronAPI?.onFSChange === 'function' ? '✅' : '❌');
console.log('  - removeFSChangeListener:', typeof window.electronAPI?.removeFSChangeListener === 'function' ? '✅' : '❌');

// Step 5: 手动触发文件变化
console.log('\n=== 步骤 5: 手动触发文件变化 ===');
const timestamp = Date.now();
const testFileName = `test-${timestamp}.txt`;
const testFilePath = path.join(projectSkillsPath, testFileName);

console.log(`创建测试文件: ${testFilePath}`);

try {
    // 确保目录存在
    if (!fs.existsSync(projectSkillsPath)) {
        fs.mkdirSync(projectSkillsPath, { recursive: true });
        console.log('✅ 创建项目技能目录');
    }

    // 创建测试文件
    fs.writeFileSync(testFilePath, `Test content ${timestamp}`);
    console.log('✅ 测试文件已创建');

    console.log('\n⏳ 等待 3 秒观察是否有 "File system change detected" 日志...');
    console.log('   (请观察 DevTools Console 是否出现该日志)\n');

    // 3 秒后删除文件
    setTimeout(() => {
        console.log('\n🗑️ 删除测试文件...');
        fs.unlinkSync(testFilePath);
        console.log('✅ 测试文件已删除');
        console.log('\n⏳ 再等待 3 秒观察是否有删除事件...');
        console.log('   (请观察 DevTools Console 是否出现 "File system change detected" 日志)\n');

        // 再等 3 秒后显示总结
        setTimeout(() => {
            console.log('\n=== 诊断总结 ===');
            console.log('如果你看到了两次 "File system change detected" 日志，说明文件监视器工作正常！✅');
            console.log('如果没有看到，请检查以下可能的问题：');
            console.log('  1. 主进程日志（运行 npm start 的终端）中是否有错误');
            console.log('  2. 文件监视器是否成功启动（应该看到 "File system watcher started successfully"）');
            console.log('  3. 配置的 projectDirectory 是否正确');
            console.log('\n💡 提示: 可以在主进程终端窗口查看更详细的日志');
        }, 3000);
    }, 1000);
} catch (error) {
    console.error('❌ 测试失败:', error);
    console.log('\n可能的问题:');
    console.log('  - 项目目录配置不正确');
    console.log('  - 权限问题');
    console.log('  - 文件系统访问错误');
}
