# 欢迎页面设计说明

## 概述

skillsMN 应用使用一个完整的三步设置向导作为欢迎页面，引导新用户完成初始配置。

## 设计架构

### 1. 启动流程

```
应用启动
    ↓
加载配置
    ↓
检查迁移状态
    ├─ [需要迁移] → MigrationDialog（迁移旧技能）
    │      ↓
    │   完成/跳过
    │      ↓
    └─ [不需要迁移] → 检查项目目录配置
           ↓
       [未配置] → SetupDialog（三步设置向导）
           ↓
       [已配置] → 主界面
```

### 2. 核心组件

#### MigrationDialog
**位置**: `src/renderer/components/MigrationDialog.tsx`

**功能**:
- 检测旧位置的技能文件
- 提供两种迁移模式：
  - **Copy（推荐）**: 复制技能，保留原文件作为备份
  - **Move**: 移动技能，可选择删除原文件
- 实时显示迁移进度
- 支持跳过迁移

**触发条件**:
```typescript
if (!config.migrationPreferenceAsked) {
  const migrationNeeded = await window.electronAPI.checkMigrationNeeded();
  if (migrationNeeded.success && migrationNeeded.data) {
    setShowMigrationDialog(true);
  }
}
```

#### SetupDialog
**位置**: `src/renderer/components/SetupDialog.tsx`

**功能**: 三步设置向导

##### Step 1: Project Directory Configuration
- 选择项目目录路径
- 验证目录包含 `.claude` 文件夹
- 使用 Electron 的目录选择对话框

##### Step 2: Private Repository Authentication (Optional)
- 添加私有仓库（GitHub/GitLab）
- 配置认证信息：
  - 仓库 URL
  - Personal Access Token (PAT)
  - 显示名称（可选）
  - GitLab 实例 URL（仅 GitLab）
- 测试仓库连接
- 管理已添加的仓库（查看、测试、删除）
- 支持跳过此步骤

##### Step 3: AI Configuration (Optional)
- API 配置：
  - API Key
  - Model 选择（Claude Opus/Sonnet/Haiku）
  - Base URL（可选，用于自定义端点）
- 高级设置：
  - Timeout（毫秒）
  - Max Retries
  - Streaming 响应开关
- 测试连接功能
- 支持跳过此步骤

### 3. UI 设计特点

#### 进度指示器
```
Step 1 of 3  [●][○][○]
```
- 三个圆点指示当前步骤
- 当前步骤高亮显示

#### 导航按钮
- **Back**: 返回上一步（Step 2 和 3 可用）
- **Skip**: 跳过当前步骤（Step 2 和 3 可用）
- **Next/Complete Setup**: 下一步/完成设置

#### 状态反馈
- 加载状态：旋转动画
- 错误提示：红色背景卡片
- 成功提示：绿色背景卡片
- 信息提示：蓝色背景卡片

### 4. 配置字段

#### MigrationDialog 相关
```typescript
interface Configuration {
  migrationPreferenceAsked?: boolean;  // 是否已询问迁移
  migrationCompleted?: boolean;        // 是否已完成迁移
}
```

#### SetupDialog 相关
```typescript
interface Configuration {
  projectDirectory?: string;           // 项目目录路径
  applicationSkillsDirectory: string;  // 应用技能目录
}

interface PrivateRepo {
  id: string;
  url: string;
  pat: string;
  displayName?: string;
  provider: 'github' | 'gitlab';
  instanceUrl?: string;
}

interface AIConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  streamingEnabled: boolean;
  timeout: number;
  maxRetries: number;
}
```

### 5. 验证逻辑

#### 目录验证 (SetupDialog Step 1)
```typescript
validateDirectory(dir) {
  // 1. 检查路径非空
  // 2. 去除末尾斜杠
  // 3. 创建测试配置
  // 4. 调用 listSkills() 验证目录
  // 5. 检查是否包含 .claude 文件夹
}
```

#### 仓库测试 (SetupDialog Step 2)
```typescript
testRepoConnection(repo) {
  // 使用提供的 PAT 测试仓库访问权限
  // 返回连接状态和错误信息
}
```

#### AI 连接测试 (SetupDialog Step 3)
```typescript
testAIConnection(config) {
  // 发送测试请求到 AI API
  // 返回连接状态和延迟时间
}
```

### 6. 完成流程

```typescript
handleSetupComplete(projectDirectory) {
  // 1. 保存项目目录配置
  await window.electronAPI.saveConfig({
    projectDirectory,
    migrationCompleted: true,
    migrationPreferenceAsked: true
  });

  // 2. 启动文件监视器
  await ipcClient.startWatching();

  // 3. 订阅文件系统变更
  ipcClient.onFSChange(async (event) => {
    await loadSkills();
  });

  // 4. 进入主界面
}
```

## 设计优势

1. **用户友好**: 分步骤引导，避免一次性显示过多信息
2. **灵活性**: 可选步骤允许用户根据需要配置
3. **即时反馈**: 测试功能确保配置正确性
4. **错误处理**: 清晰的错误提示和恢复机制
5. **状态持久化**: 所有配置保存到文件系统

## 技术实现

- **React Hooks**: useState, useCallback, useEffect
- **TypeScript**: 严格类型检查
- **Tailwind CSS**: 响应式设计和样式
- **Electron IPC**: 主进程通信
- **表单验证**: 实时验证和错误提示

## 未来扩展

可能的改进方向：
1. 添加更多 AI 提供商选项
2. 支持批量导入仓库
3. 提供配置模板
4. 添加配置向导的视频教程
5. 支持配置导入/导出

## 相关文件

- `src/renderer/components/SetupDialog.tsx` - 主设置向导组件
- `src/renderer/components/MigrationDialog.tsx` - 迁移对话框组件
- `src/renderer/App.tsx` - 应用入口和状态管理
- `src/main/services/MigrationService.ts` - 迁移服务
- `src/main/models/Configuration.ts` - 配置模型定义
