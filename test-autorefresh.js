# AutoRefresh 测试脚本

这个脚本用于测试文件监视器是否正常工作。

## 测试步骤

1. 在 DevTools Console 中运行此脚本
2. 创建一个测试文件
3. 观察是否有日志输出
4. 清理测试文件

---

```javascript
// 1. 检查当前配置
const config = await window.electronAPI.loadConfig();
console.log('📁 当前配置:', config);

// 2. 检查监视的路径
console.log('📁 应该监视的路径:');
console.log('  - 项目目录:', config.projectDirectory);
console.log('  - 项目技能目录:', `${config.projectDirectory}/.claude/skills`);
console.log('  - 全局技能目录:', require('path').join(require('os').homedir(), '.claude', 'skills'));

// 3. 创建测试文件
const testSkillName = `test-skill-${Date.now()}`;
const testSkillDir = `${config.projectDirectory}/.claude/skills/${testSkillName}`;

require('fs').mkdirSync(testSkillDir, { recursive: true });
console.log(`\n✅ 创建测试目录: ${testSkillDir}`);

// 4. 创建 skill.md 文件
const skillContent = `# ${testSkillName}

This is a test skill to verify the file watcher is working.

\`\`\`markdown
\`\`\`ts
const skillPath = path.join(testSkillDir, 'skill.md');
require('fs').writeFileSync(skillPath, skillContent);
console.log(`✅ 创建测试文件: ${skillPath}`);

console.log('\n⏳ 等待 1 秒观察是否有 "File system change detected" 日志...');
');

// 5. 等待 1 秒后清理
 setTimeout(() => {
    console.log('\n🧹 清理测试文件...');
    require('fs').rmSync(testSkillDir, { recursive: true });
    console.log('✅ 测试文件已清理');
}, 1000);
```

请按照以下步骤操作：

### 歌骤 1: 打开 DevTools
按 `Ctrl+Shift+I` 或通过菜单栏打开

### 歛景 2: 粘贴并运行上述脚本
在 DevTools Console 中粘贴并运行上面的 JavaScript 代码，观察输出。

### 歱景 3: 观察结果

你应该看到：
1. 当前配置信息
2. "创建测试目录" 和 "创建测试文件" 的日志
3. **最关键**: "File system change detected" 日志
4. 测试文件清理日志

如果看到了 "File system change detected"， 说明文件监视器工作正常！

如果没有看到， 说明还有问题需要进一步排查。请把输出结果告诉我！
