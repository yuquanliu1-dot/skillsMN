# 应用启动流程

## 概述

skillsMN 应用启动时会按照以下顺序检查配置状态，决定显示哪个页面。

## 完整启动流程图

```
应用启动 (App.tsx - useEffect)
    ↓
┌─────────────────────────────────────┐
│ 1. 加载配置 (loadConfig)            │
│    - 读取 config.json               │
│    - 验证配置完整性                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. 检查迁移状态                     │
│    条件: !config.migrationPreferenceAsked │
└─────────────────────────────────────┘
    ↓
    ├─ [需要检查迁移]
    │   ├─ 调用 checkMigrationNeeded()
    │   │   - 检测旧位置是否有技能文件
    │   │   - 旧位置: ~/.claude/skills (global)
    │   │   - 旧位置: project/.claude/skills (project)
    │   │
    │   ├─ [发现旧技能]
    │   │   ├─ 调用 detectExistingSkills()
    │   │   ├─ 设置迁移技能列表
    │   │   ├─ 显示 MigrationDialog ⛔
    │   │   └─ 等待用户操作:
    │   │       ├─ [迁移] → handleMigrationComplete()
    │   │       │   ├─ 执行迁移操作
    │   │       │   ├─ 保存配置 (migrationCompleted: true)
    │   │       │   └─ 继续到步骤 3 ↓
    │   │       │
    │   │       └─ [跳过] → handleMigrationSkip()
    │   │           ├─ 保存配置 (migrationPreferenceAsked: true)
    │   │           └─ 继续到步骤 3 ↓
    │   │
    │   └─ [无旧技能] → 继续到步骤 3 ↓
    │
    └─ [已询问过] → 继续到步骤 3 ↓

┌─────────────────────────────────────┐
│ 3. 检查项目目录配置                 │
│    条件: projectDirectories.length === 0 │
└─────────────────────────────────────┘
    ↓
    ├─ [未配置项目目录]
    │   ├─ 设置 showSetup = true
    │   └─ 显示 SetupDialog (欢迎页面) ⛔
    │       └─ 等待用户完成设置:
    │           ├─ Step 1: 选择项目目录 (必需)
    │           ├─ Step 2: 配置私有仓库 (可选)
    │           ├─ Step 3: 配置 AI 设置 (可选)
    │           └─ [完成] → handleSetupComplete()
    │               ├─ 保存配置
    │               ├─ showSetup = false
    │               └─ 继续到步骤 4 ↓
    │
    └─ [已配置] → 继续到步骤 4 ↓

┌─────────────────────────────────────┐
│ 4. 验证项目目录存在性               │
│    调用 listSkills(config)          │
└─────────────────────────────────────┘
    ↓
    ├─ [目录不存在/无法访问]
    │   ├─ 显示错误提示
    │   ├─ showSetup = true
    │   └─ 显示 SetupDialog ⛔
    │
    └─ [目录正常] → 继续到步骤 5 ↓

┌─────────────────────────────────────┐
│ 5. 启动文件监视器                   │
│    条件: config.autoRefresh !== false │
└─────────────────────────────────────┘
    ↓
    ├─ [autoRefresh 启用]
    │   ├─ 调用 startWatching()
    │   ├─ 订阅文件系统变更事件
    │   └─ 自动刷新技能列表
    │
    └─ [autoRefresh 禁用]
        └─ 跳过文件监视

┌─────────────────────────────────────┐
│ 6. 显示主界面                       │
│    - 加载技能列表                   │
│    - 显示技能管理界面               │
└─────────────────────────────────────┘
```

## 关键配置字段

### 控制迁移对话框

```typescript
interface Configuration {
  // 是否已询问用户迁移偏好
  migrationPreferenceAsked?: boolean;

  // 是否已完成迁移
  migrationCompleted?: boolean;
}
```

**逻辑**:
- `migrationPreferenceAsked = false` → 触发迁移检查
- `migrationPreferenceAsked = true` → 跳过迁移检查

### 控制欢迎页面 (SetupDialog)

```typescript
interface Configuration {
  // 项目目录路径 (已废弃 - 为了向后兼容保留)
  projectDirectory?: string | null;

  // 项目目录列表 (当前使用的字段)
  projectDirectories: string[];
}
```

**逻辑**:
- `!config.projectDirectories || config.projectDirectories.length === 0` → 显示欢迎页面
- `config.projectDirectories.length > 0` → 显示主界面

**重要**: 应该使用 `projectDirectories` (复数) 而不是 `projectDirectory` (单数)

## 三个主要对话框

### 1. MigrationDialog (迁移对话框)

**触发条件**:
```typescript
if (!config.migrationPreferenceAsked) {
  const migrationNeeded = await checkMigrationNeeded();
  if (migrationNeeded) {
    const skills = await detectExistingSkills();
    if (skills.global.length > 0 || skills.project.length > 0) {
      showMigrationDialog = true;
    }
  }
}
```

**功能**:
- 检测旧位置的技能文件
- 提供两种迁移模式: Copy (推荐) 或 Move
- 可选择删除原文件
- 显示实时进度

**用户操作**:
- **迁移**: 执行迁移 → 保存 `migrationCompleted: true` → 继续
- **跳过**: 保存 `migrationPreferenceAsked: true` → 继续

### 2. SetupDialog (欢迎/设置向导)

**触发条件**:
```typescript
if (!config.projectDirectory) {
  showSetup = true;
}
```

**三个步骤**:

#### Step 1: Project Directory (必需)
- 选择包含 `.claude` 文件夹的项目目录
- 验证目录有效性
- 必须完成才能继续

#### Step 2: Private Repositories (可选)
- 添加 GitHub/GitLab 私有仓库
- 配置 PAT (Personal Access Token)
- 可以跳过

#### Step 3: AI Configuration (可选)
- 配置 Claude API Key
- 选择模型 (Opus/Sonnet/Haiku)
- 配置高级设置
- 可以跳过

**完成条件**:
- Step 1 必须完成
- Step 2 和 3 可选

### 3. Main Application (主界面)

**显示条件**:
- 迁移已完成或已跳过
- 项目目录已配置
- 目录验证通过

**功能**:
- 技能列表管理
- 私有仓库浏览
- 注册表搜索
- 设置管理

## 配置文件示例

### 全新安装 (显示欢迎页面)

```json
{
  "projectDirectory": null,
  "projectDirectories": [],
  "defaultInstallDirectory": "project",
  "editorDefaultMode": "preview",
  "autoRefresh": true
}
```

### 已配置 (显示主界面)

```json
{
  "projectDirectory": "d:\\skillsMN",
  "projectDirectories": ["d:\\skillsMN"],
  "migrationPreferenceAsked": true,
  "migrationCompleted": true,
  "applicationSkillsDirectory": "D:\\skillsMN\\skills"
}
```

## 强制显示欢迎页面的方法

### 方法 1: 删除配置文件

```bash
# Windows
rm "$APPDATA/skillsMN/config.json"

# macOS/Linux
rm ~/.config/skillsMN/config.json
```

### 方法 2: 清空项目目录

```bash
# 编辑 config.json，设置:
{
  "projectDirectory": null,
  "projectDirectories": []
}
```

### 方法 3: 代码中触发

```typescript
// 在 App.tsx 中
setShowSetup(true);
```

## 常见问题

### Q1: 为什么删除 config.json 后还是显示主界面?

**A**: 检查以下几点:
1. 确认删除的是正确的配置文件路径
2. 检查是否有多个配置文件实例
3. 查看控制台日志确认配置加载情况

### Q2: 如何重置迁移对话框?

**A**: 修改 config.json:
```json
{
  "migrationPreferenceAsked": false,
  "migrationCompleted": false
}
```

### Q3: 项目目录检查失败怎么办?

**A**:
1. 检查路径是否存在
2. 确认包含 `.claude` 文件夹
3. 检查文件权限
4. 应用会自动显示欢迎页面重新配置

## 相关文件

- `src/renderer/App.tsx` - 主应用逻辑和启动流程
- `src/renderer/components/SetupDialog.tsx` - 欢迎页面组件
- `src/renderer/components/MigrationDialog.tsx` - 迁移对话框组件
- `src/main/services/ConfigService.ts` - 配置管理服务
- `src/main/services/MigrationService.ts` - 迁移服务
- `src/shared/types.ts` - 配置类型定义
