# AI Skill Creator 路径修复

## 问题描述

AI 创建的 skill 没有正确写入到应用程序配置的 skills 目录。日志显示 AI Agent 使用了错误的路径：

```
[2026-03-18T13:38:00.399Z] [DEBUG] [AIService] Agent using tool | {
  "tool": "Write",
  "input": {
    "file_path": "/Users/xiokun/.claude/skills/ls/skill.md",
    ...
  }
}
```

AI 将 skill 写入到 `~/.claude/skills/` 而不是应用程序配置的 `applicationSkillsDirectory`。

## 根本原因

1. **前端没有传递目标路径**: `AISkillCreationDialog.tsx` 调用 `generate()` 时没有传递 `skillContext.targetPath`
2. **AI Agent 不知道正确的目标目录**: 没有明确告诉 AI 应该在哪里创建 skill

## 解决方案

### 1. 修改类型定义

**文件**: `src/shared/types.ts`

添加 `targetPath` 字段到 `skillContext`:

```typescript
skillContext?: {
  name?: string;
  description?: string;
  content?: string;
  cursorPosition?: number;
  selectedText?: string;
  /** Target path for skill creation (parent directory where skill directory should be created) */
  targetPath?: string;
};
```

### 2. 修改前端组件

**文件**: `src/renderer/components/AISkillCreationDialog.tsx`

#### 2.1 添加 config prop

```tsx
interface AISkillCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated: () => void;
  config: Configuration | null;  // ← 新增
}
```

#### 2.2 修改 handleGenerate

```tsx
const handleGenerate = useCallback(async () => {
  if (!prompt.trim()) {
    return;
  }

  // 获取应用程序 skills 目录
  const targetDirectory = config?.applicationSkillsDirectory;

  if (!targetDirectory) {
    console.error('No application skills directory configured');
    return;
  }

  // 传递目标目录给 AI
  await generate(prompt, 'new', {
    targetPath: targetDirectory,
  });
}, [prompt, generate, config]);
```

### 3. 修改父组件

**文件**: `src/renderer/App.tsx`

传递 config 给 `AISkillCreationDialog`:

```tsx
<AISkillCreationDialog
  isOpen={showAICreationDialog}
  onClose={() => setShowAICreationDialog(false)}
  onSkillCreated={() => {
    loadSkills();
    showToast('Skill created successfully with AI!', 'success');
  }}
  config={state.config}  // ← 新增
/>
```

### 4. 修改 AI Service 提示词

**文件**: `src/main/services/AIService.ts`

更新 system prompt，明确告诉 AI `targetPath` 是父目录：

```typescript
new: targetPath
  ? `\n\nYou are creating a NEW skill from scratch. Generate complete, production-ready skill content based on the user's requirements. Use the skill-creator skill for guidance.

IMPORTANT: A skill is a DIRECTORY containing a skill.md file. Follow these steps:

1. First, determine the skill name from the user's requirements (convert to kebab-case, e.g., "My Skill" → "my-skill-name")
2. Use the Bash tool to create a directory at: ${targetPath}/<skill-name>
   Example: If skill name is "ls", create directory at ${targetPath}/ls
3. Use the Write tool to create the skill.md file: ${targetPath}/<skill-name>/skill.md
   Example: ${targetPath}/ls/skill.md

The targetPath (${targetPath}) is the PARENT directory where all skills are stored.
You must create a subdirectory with the skill name, then create skill.md inside it.

Directory structure:
   ${targetPath}/
   └── <skill-name>/
       └── skill.md (contains YAML frontmatter + Markdown content)

IMPORTANT: The Write tool file_path should be the FULL path including the skill name subdirectory.`
  : '...'
```

## 工作流程

### 修改前

```
用户输入提示词
    ↓
AISkillCreationDialog 调用 generate(prompt, 'new')
    ↓
没有传递 targetPath
    ↓
AI Agent 使用默认路径 ~/.claude/skills/
    ↓
❌ Skill 写入错误位置
```

### 修改后

```
用户输入提示词
    ↓
AISkillCreationDialog 获取 config.applicationSkillsDirectory
    ↓
调用 generate(prompt, 'new', { targetPath: applicationSkillsDirectory })
    ↓
AI Service 接收 targetPath
    ↓
System Prompt 明确说明 targetPath 是父目录
    ↓
AI Agent 创建: ${targetPath}/<skill-name>/skill.md
    ↓
✅ Skill 写入正确位置
```

## 示例

假设配置：
- `applicationSkillsDirectory`: `/Users/username/AppData/Roaming/skillsMN/skills`

用户输入：
```
创建一个 ls 命令，列出当前目录的文件
```

### AI 执行步骤

1. **Bash**: 创建目录
   ```bash
   mkdir -p "/Users/username/AppData/Roaming/skillsMN/skills/ls"
   ```

2. **Write**: 创建 skill.md
   ```
   file_path: "/Users/username/AppData/Roaming/skillsMN/skills/ls/skill.md"
   content: ---
   name: ls
   description: ...
   ---
   ```

### 最终结构

```
/Users/username/AppData/Roaming/skillsMN/skills/
└── ls/
    └── skill.md
```

## 关键改进

1. **明确的目标路径**: 前端明确告诉 AI 应该在哪里创建 skill
2. **清晰的指令**: System prompt 明确说明 targetPath 是父目录，需要创建子目录
3. **示例路径**: 提供具体示例，让 AI 理解路径结构
4. **错误处理**: 检查 applicationSkillsDirectory 是否存在

## 相关文件

- `src/shared/types.ts` - 类型定义
- `src/renderer/components/AISkillCreationDialog.tsx` - 前端组件
- `src/renderer/App.tsx` - 父组件
- `src/main/services/AIService.ts` - AI 服务

## 测试建议

### 测试场景 1: 创建新 skill

1. 打开 AI Skill Creator
2. 输入: "创建一个 ls 命令"
3. 点击生成
4. **预期**: Skill 创建在 `{applicationSkillsDirectory}/ls/skill.md`

### 测试场景 2: 检查路径

1. 创建 skill 后
2. 打开配置的 applicationSkillsDirectory
3. **预期**: 看到新创建的 skill 目录和 skill.md 文件

### 测试场景 3: 多次创建

1. 创建多个不同的 skills
2. 检查 applicationSkillsDirectory
3. **预期**: 所有 skills 都在同一个父目录下，每个有自己的子目录

## 注意事项

1. **目录必须存在**: applicationSkillsDirectory 应该在应用启动时创建
2. **权限检查**: 确保应用有写入权限
3. **路径验证**: targetPath 应该是绝对路径
4. **名称冲突**: 如果 skill 目录已存在，AI 应该覆盖或提示用户

## 相关文档

- [AI Skill Creator UI Improvements](./AI_SKILL_CREATOR_UI_IMPROVEMENTS.md)
- [Configuration](./CONFIGURATION.md)
- [AI Generation Hook](./AI_GENERATION_HOOK.md)

## 更新历史

- **2026-03-18**: 初始修复
  - 添加 targetPath 到 skillContext
  - 传递 applicationSkillsDirectory 给 AI
  - 更新 system prompt 明确路径结构
