# 项目目录字段修复说明

## 问题描述

代码中存在 `projectDirectory` (单数，已废弃) 和 `projectDirectories` (复数，当前使用) 的不一致使用问题。

### 发现的问题

1. **App.tsx** 中使用了已废弃的 `projectDirectory` 字段检查配置状态
2. **保存时**使用正确的 `projectDirectories` 数组
3. **检查时**使用旧的 `projectDirectory` 单数字段

这导致如果配置文件中只有 `projectDirectories` 数组，但 `projectDirectory` 为 null，应用会错误地显示欢迎页面。

## 字段说明

### projectDirectory (已废弃)
```typescript
interface Configuration {
  /** @deprecated Use projectDirectories instead */
  projectDirectory?: string | null;
}
```
- 单数字段
- 旧版本使用
- 为了向后兼容保留
- **不应再使用**

### projectDirectories (当前使用)
```typescript
interface Configuration {
  /** Array of configured project directories */
  projectDirectories: string[];
}
```
- 复数数组
- 新版本使用
- **应该使用这个字段**

## 修复内容

### 1. App.tsx - 初始化检查 (Line 166-170)

#### ❌ 修复前
```typescript
// Check if setup is needed
if (!config.projectDirectory) {
  setShowSetup(true);
  dispatch({ type: 'SET_LOADING', payload: false });
  return;
}
```

#### ✅ 修复后
```typescript
// Check if setup is needed (using projectDirectories array)
if (!config.projectDirectories || config.projectDirectories.length === 0) {
  setShowSetup(true);
  dispatch({ type: 'SET_LOADING', payload: false });
  return;
}
```

### 2. App.tsx - 加载技能条件 (Line 233-237)

#### ❌ 修复前
```typescript
useEffect(() => {
  if (state.config?.projectDirectory) {
    loadSkills();
  }
}, [state.config?.projectDirectory]);
```

#### ✅ 修复后
```typescript
useEffect(() => {
  if (state.config?.projectDirectories && state.config.projectDirectories.length > 0) {
    loadSkills();
  }
}, [state.config?.projectDirectories]);
```

### 3. App.tsx - 键盘快捷键 (Line 245-265)

#### ❌ 修复前
```typescript
// Ctrl+N
if (!showSetup && state.config?.projectDirectory) {
  setShowCreateDialog(true);
}

// Ctrl+R
if (!showSetup && state.config?.projectDirectory) {
  loadSkills();
}
```

#### ✅ 修复后
```typescript
// Ctrl+N
if (!showSetup && state.config?.projectDirectories && state.config.projectDirectories.length > 0) {
  setShowCreateDialog(true);
}

// Ctrl+R
if (!showSetup && state.config?.projectDirectories && state.config.projectDirectories.length > 0) {
  loadSkills();
}
```

### 4. App.tsx - 依赖数组 (Line 283)

#### ❌ 修复前
```typescript
}, [showSetup, state.config?.projectDirectory, selectedSkillPath, state.skills]);
```

#### ✅ 修复后
```typescript
}, [showSetup, state.config?.projectDirectories, selectedSkillPath, state.skills]);
```

## ConfigurationModel.isComplete

这个方法已经正确实现了：

```typescript
static isComplete(config: Configuration): boolean {
  return config.projectDirectories.length > 0;
}
```

## 配置保存逻辑

保存配置时已经使用正确的字段：

```typescript
const handleSetupComplete = async (projectDirectory: string): Promise<void> => {
  const config = await ipcClient.saveConfig({
    projectDirectories: [projectDirectory]  // ✅ 正确使用复数
  });
  // ...
};
```

## 自动迁移

`ConfigService.load()` 会自动将旧的 `projectDirectory` 迁移到 `projectDirectories`：

```typescript
// Check if we need to migrate old projectDirectory to new projectDirectories
const needsMigration = rawConfig.projectDirectory &&
                       !rawConfig.projectDirectories &&
                       validatedConfig.projectDirectories.length > 0;

if (needsMigration) {
  logger.info('Migrating projectDirectory to projectDirectories', 'ConfigService');
  await fs.promises.writeFile(
    this.configPath,
    JSON.stringify(validatedConfig, null, 2),
    'utf-8'
  );
}
```

## 配置文件示例

### 旧格式 (自动迁移)
```json
{
  "projectDirectory": "d:\\skillsMN"
}
```

### 新格式 (推荐)
```json
{
  "projectDirectories": ["d:\\skillsMN", "d:\\projects"]
}
```

### 迁移后的格式
```json
{
  "projectDirectory": "d:\\skillsMN",  // 保留用于向后兼容
  "projectDirectories": ["d:\\skillsMN"]
}
```

## 影响范围

### ✅ 已修复
- `src/renderer/App.tsx` - 所有使用 `projectDirectory` 的地方

### ✅ 已正确实现
- `src/main/models/Configuration.ts` - `isComplete()` 方法
- `src/main/services/ConfigService.ts` - 自动迁移逻辑
- `src/renderer/components/SetupDialog.tsx` - 保存配置

### 📝 文档更新
- `docs/STARTUP_FLOW.md` - 完整启动流程文档
- `docs/STARTUP_FLOW_SIMPLE.md` - 简化版启动流程
- `docs/PROJECT_DIRECTORY_FIELD_FIX.md` - 本文档

## 测试建议

### 测试场景 1: 全新安装
```bash
# 删除配置文件
rm "$APPDATA/skillsMN/config.json"

# 启动应用 - 应该显示欢迎页面
npm start
```

**预期**: 显示欢迎页面

### 测试场景 2: 旧配置文件
```json
{
  "projectDirectory": "d:\\skillsMN"
}
```

**预期**:
1. 自动迁移到 `projectDirectories`
2. 显示主界面
3. 不显示欢迎页面

### 测试场景 3: 新配置文件
```json
{
  "projectDirectories": ["d:\\skillsMN"]
}
```

**预期**:
1. 显示主界面
2. 不显示欢迎页面

### 测试场景 4: 空配置
```json
{
  "projectDirectories": []
}
```

**预期**: 显示欢迎页面

## 向后兼容性

- ✅ 旧配置文件仍然可以工作（自动迁移）
- ✅ `projectDirectory` 字段保留但不再使用
- ✅ 所有新代码使用 `projectDirectories`

## 最佳实践

### ✅ 推荐做法
```typescript
// 检查配置
if (!config.projectDirectories || config.projectDirectories.length === 0) {
  // 未配置
}

// 保存配置
await saveConfig({
  projectDirectories: [directory]
});

// 读取第一个目录
const primaryDir = config.projectDirectories[0];
```

### ❌ 避免的做法
```typescript
// 不要使用已废弃的字段
if (!config.projectDirectory) {
  // ❌ 错误
}

// 不要混合使用
if (config.projectDirectory && config.projectDirectories.length > 0) {
  // ❌ 混乱
}
```

## 总结

1. **问题**: 使用了已废弃的 `projectDirectory` 字段检查配置状态
2. **修复**: 统一使用 `projectDirectories` 数组
3. **影响**: 4处代码修改
4. **兼容**: 保持向后兼容，自动迁移旧配置
5. **文档**: 更新了3个文档文件

现在代码完全使用正确的 `projectDirectories` 字段，同时保持向后兼容性！✅
