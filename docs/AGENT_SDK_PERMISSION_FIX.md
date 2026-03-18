# Agent SDK 权限配置修复

## ❌ 问题：文件未写入磁盘

### 症状
```
[DEBUG] Agent using tool | {
  "tool": "Write",
  "input": {
    "file_path": "D:\\skillsMN\\.claude\\skills\\test.md",
    "content": "---\\nname: test\\n---"
  }
}
```

日志显示 AI 调用了 Write 工具，但文件**并未真正创建**。

### 根本原因

**Agent SDK 默认不执行工具操作**，需要明确配置权限！

## ✅ 解决方案

### 1. 配置工作目录

```typescript
// 设置 Agent SDK 的工作目录为项目根目录
const workingDirectory = request?.skillContext?.targetPath
  ? require('path').dirname(request.skillContext.targetPath)
  : process.cwd();
```

### 2. 配置权限模式

Agent SDK 提供多种权限模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `'default'` | 标准行为，危险操作会提示 | 交互式会话 |
| `'acceptEdits'` | 自动接受文件编辑操作 | **AI skill 创建** ✅ |
| `'bypassPermissions'` | 绕过所有权限检查 | 完全自动化（需额外确认） |
| `'plan'` | 规划模式，不执行工具 | 仅生成计划 |
| `'dontAsk'` | 不提示权限，未预批准则拒绝 | 限制性执行 |

我们使用 `'acceptEdits'` 模式，它会：
- ✅ 自动执行 Write、Edit、Read 等文件操作
- ✅ 不需要用户确认
- ✅ 安全可靠（仅限文件操作）

### 3. 配置允许的工具

```typescript
allowedTools: [
  'Write',   // 文件写入
  'Read',    // 文件读取
  'Edit',    // 文件编辑
  'Bash',    // Shell 命令
  'Grep',    // 内容搜索
  'Glob',    // 文件查找
  'Skill'    // Skills 知识库访问
]
```

## 🔧 完整配置代码

### 修改文件：`src/main/services/AIService.ts`

```typescript
// Determine working directory (project root)
const workingDirectory = request?.skillContext?.targetPath
  ? require('path').dirname(request.skillContext.targetPath)
  : process.cwd();

// Use Claude Agent SDK query with permission to execute tools
const stream = query({
  prompt: userPrompt,
  options: {
    systemPrompt,
    model: currentConfig?.model || 'claude-sonnet-4-6-20250514',

    // ⭐ 关键配置 1: 设置工作目录
    cwd: workingDirectory,

    // ⭐ 关键配置 2: 允许文件操作
    permissionMode: 'acceptEdits',

    // ⭐ 关键配置 3: 明确允许的工具
    allowedTools: ['Write', 'Read', 'Edit', 'Bash', 'Grep', 'Glob', 'Skill'],
  },
});
```

## 📊 权限配置对比

### 之前（不工作）
```typescript
const stream = query({
  prompt: userPrompt,
  options: {
    systemPrompt,
    model: 'claude-sonnet-4-6-20250514',
    // ❌ 缺少 cwd
    // ❌ 缺少 permissionMode
    // ❌ 缺少 allowedTools
  },
});
```

**结果**: AI 调用 Write 工具，但只是生成 tool_use 消息，不执行实际操作。

### 现在（工作）
```typescript
const stream = query({
  prompt: userPrompt,
  options: {
    systemPrompt,
    model: 'claude-sonnet-4-6-20250514',
    cwd: workingDirectory,              // ✅ 设置工作目录
    permissionMode: 'acceptEdits',      // ✅ 允许文件编辑
    allowedTools: [...],                // ✅ 明确工具列表
  },
});
```

**结果**: AI 调用 Write 工具，Agent SDK **真正执行**文件写入操作。

## 🎯 执行流程

### 完整的文件创建流程

```
1. 用户输入描述
   ↓
2. AI 访问 skill-creator skill
   [Skill tool] → 读取 .claude/skills/skill-creator.md
   ↓
3. AI 生成 skill 内容
   ↓
4. AI 调用 Write 工具
   {
     "tool": "Write",
     "input": {
       "file_path": "D:\\project\\.claude\\skills\\my-skill.md",
       "content": "---\\nname: my-skill\\n---"
     }
   }
   ↓
5. Agent SDK 检查权限
   - permissionMode: 'acceptEdits' ✅
   - tool 'Write' in allowedTools ✅
   ↓
6. Agent SDK 真正执行 Write
   - 创建文件：D:\\project\\.claude\\skills\\my-skill.md
   - 写入内容
   ↓
7. 返回 tool_result
   {
     "type": "tool_result",
     "content": "File created successfully"
   }
   ↓
8. 前端收到 complete 事件
   ↓
9. 自动刷新 skill 列表 + 关闭对话框
```

## 🔍 调试技巧

### 检查工作目录
```typescript
console.log('Working directory:', workingDirectory);
console.log('Target path:', request?.skillContext?.targetPath);
```

### 检查工具调用
```typescript
// 在 AIService.ts 的 stream 处理中
if (piece.type === 'tool_use') {
  console.log('[TOOL CALL]', piece.name, piece.input);
}
```

### 检查文件创建
```bash
# 在目标目录
ls -la .claude/skills/
cat .claude/skills/my-skill.md
```

## 🚨 常见错误

### 错误 1: 权限被拒绝
```
Permission denied for tool 'Write'
```

**解决**: 添加 `permissionMode: 'acceptEdits'`

### 错误 2: 工具不可用
```
Tool 'Write' is not available
```

**解决**: 添加 `allowedTools: ['Write', ...]`

### 错误 3: 路径不存在
```
Error: ENOENT: no such file or directory
```

**解决**: 检查 `cwd` 配置是否正确

## 🎉 测试验证

### 测试步骤
```bash
npm start
```

1. Create New Skill → AI Create
2. 输入: "Create a skill for viewing directory structures"
3. 观察后端日志:
   ```
   [DEBUG] Agent using tool | {
     "tool": "Skill",
     "input": { "skill": "skill-creator" }
   }
   [DEBUG] Agent using tool | {
     "tool": "Write",
     "input": {
       "file_path": "D:\\skillsMN\\.claude\\skills\\directory-viewer.md",
       "content": "---\\nname: directory-viewer\\n..."
     }
   }
   ```
4. 验证文件创建:
   ```bash
   ls D:\\skillsMN\\.claude\\skills\\directory-viewer.md
   cat D:\\skillsMN\\.claude\\skills\\directory-viewer.md
   ```
5. 前端自动刷新并关闭对话框

## 📚 相关文档

- Agent SDK Options: `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:667`
- Permission Modes: `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:945-952`
- Tool Configuration: `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:718-748`

## ✅ 状态

**修复完成** - Agent SDK 现在可以真正执行工具操作！

关键配置：
- ✅ `cwd` - 工作目录
- ✅ `permissionMode: 'acceptEdits'` - 文件编辑权限
- ✅ `allowedTools` - 允许的工具列表

Agent SDK 现在有完全的权限来创建、修改和管理文件！🚀
