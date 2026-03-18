# 应用启动流程 - 简化版

## 流程图

```
┌─────────────────┐
│   应用启动      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 加载配置文件            │
│ config.json             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────┐    是
│ migrationPreferenceAsked=false? ├────────┐
└────────┬────────────────────────┘        │
         │ 否                               │
         │                                  ▼
         │                    ┌─────────────────────────┐
         │                    │ 检测旧位置技能          │
         │                    │ checkMigrationNeeded()  │
         │                    └────────┬────────────────┘
         │                             │
         │                             ▼
         │                 ┌───────────────────┐     是
         │                 │ 发现旧技能？      ├─────────┐
         │                 └────────┬──────────┘         │
         │                          │ 否                 │
         │                          │                    ▼
         │                          │         ┌─────────────────────┐
         │                          │         │ MigrationDialog     │
         │                          │         │ (迁移对话框)        │
         │                          │         │ [迁移] 或 [跳过]    │
         │                          │         └──────────┬──────────┘
         │                          │                    │
         │                          └────────────────────┘
         │                                    │
         ▼                                    │
┌──────────────────────────────────┐         │
│ projectDirectories.length === 0? │◄────────┘
└────────┬─────────────────────────┘
         │ 是                              │ 否
         │                                 │
         ▼                                 │
┌──────────────────────┐                   │
│   SetupDialog        │                   │
│   (欢迎页面)         │                   │
│                      │                   │
│   Step 1: 项目目录   │                   │
│   Step 2: 私有仓库   │                   │
│   Step 3: AI配置     │                   │
│                      │                   │
│   [完成设置]         │                   │
└──────────┬───────────┘                   │
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ 验证项目目录         │
                │ 目录存在且可访问？   │
                └────────┬─────────────┘
                         │
            ┌────────────┴────────────┐
            │ 是                      │ 否
            ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐
│ 启动文件监视器      │    │ 显示 SetupDialog    │
│ (如果启用)          │    │ (重新配置)          │
└────────┬────────────┘    └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   主界面            │
│   - 技能列表        │
│   - 私有仓库        │
│   - 注册表搜索      │
└─────────────────────┘
```

## 三个关键检查点

### 1️⃣ 迁移检查
- **字段**: `migrationPreferenceAsked`
- **条件**: `false` 时检查
- **对话框**: MigrationDialog
- **作用**: 迁移旧位置技能到新目录

### 2️⃣ 项目目录检查 (使用 projectDirectories)
- **字段**: `projectDirectories` (数组)
- **条件**: `projectDirectories.length === 0` 时显示
- **对话框**: SetupDialog (欢迎页面)
- **作用**: 引导用户完成初始配置

**重要**: 使用 `projectDirectories` (复数)，不要使用已废弃的 `projectDirectory` (单数)

### 3️⃣ 目录验证
- **操作**: `listSkills(config)`
- **条件**: 目录不存在或无法访问
- **结果**: 重新显示 SetupDialog
- **作用**: 确保配置有效

## 触发欢迎页面的方式

### 🔧 开发测试
```bash
# 删除配置
rm "$APPDATA/skillsMN/config.json"
npm start
```

### 📝 编辑配置
```json
{
  "projectDirectories": []
}
```

### 💻 代码触发
```typescript
setShowSetup(true);
```

## 配置字段说明

### ✅ 正确的字段 (当前使用)

```typescript
interface Configuration {
  // 项目目录列表
  projectDirectories: string[];

  // 示例
  projectDirectories: ["d:\\skillsMN", "d:\\projects"]
}
```

### ⚠️ 已废弃的字段 (向后兼容)

```typescript
interface Configuration {
  // @deprecated Use projectDirectories instead
  projectDirectory?: string | null;

  // 仅为向后兼容保留，不应再使用
}
```

## 检查逻辑

### ❌ 错误的方式
```typescript
if (!config.projectDirectory) {
  // 不要使用这个已废弃的字段
}
```

### ✅ 正确的方式
```typescript
if (!config.projectDirectories || config.projectDirectories.length === 0) {
  setShowSetup(true);  // 显示欢迎页面
}
```

## 配置文件位置

- **Windows**: `C:\Users\{用户}\AppData\Roaming\skillsMN\config.json`
- **macOS**: `~/Library/Application Support/skillsMN/config.json`
- **Linux**: `~/.config/skillsMN/config.json`

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
  "projectDirectories": ["d:\\skillsMN", "d:\\projects"],
  "migrationPreferenceAsked": true,
  "migrationCompleted": true,
  "applicationSkillsDirectory": "D:\\skillsMN\\skills"
}
```

## 时间线

1. **0-100ms**: 加载配置文件
2. **100-200ms**: 检查迁移状态
3. **200-300ms**: 检查项目目录
4. **300-500ms**: 验证目录访问
5. **500ms+**: 显示对应界面

**总计**: 通常 < 1 秒完成所有检查

## 相关代码

### App.tsx 检查逻辑
```typescript
// Line 166-170
if (!config.projectDirectories || config.projectDirectories.length === 0) {
  setShowSetup(true);
  dispatch({ type: 'SET_LOADING', payload: false });
  return;
}
```

### ConfigurationModel.isComplete
```typescript
static isComplete(config: Configuration): boolean {
  return config.projectDirectories.length > 0;
}
```

## 常见问题

### Q: 为什么有两个字段？
**A**: `projectDirectory` 是旧版本使用的单数字段，`projectDirectories` 是新版本使用的数组字段。保留旧字段是为了向后兼容。

### Q: 应该使用哪个字段？
**A**: 始终使用 `projectDirectories` (复数)。代码会自动将旧的 `projectDirectory` 迁移到 `projectDirectories`。

### Q: 如何添加多个项目目录？
**A**: 在配置文件中：
```json
{
  "projectDirectories": [
    "d:\\skillsMN",
    "d:\\work-projects",
    "d:\\personal-projects"
  ]
}
```
