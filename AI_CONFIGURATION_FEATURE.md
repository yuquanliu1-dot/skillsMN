# AI Configuration 功能说明

## 功能概述
已在设置页面添加 LLM URL 和 API Key 配置功能。

## 如何访问

1. **启动应用**
   ```bash
   npx electron .
   ```

2. **打开设置**
   - 点击应用右上角的 **"Settings"** 按钮（齿轮图标）

3. **配置 AI**
   - 在设置对话框中，点击 **"AI Configuration"** 标签页
   - 输入你的 Anthropic API Key
   - 选择模型（Opus/Sonnet/Haiku）
   - 点击 **"Test Connection"** 测试
   - 点击 **"Save Configuration"** 保存

## 实现的功能

### 后端（Main Process）
- ✅ AIConfiguration 类型定义
- ✅ AIConfigService 服务（加密存储）
- ✅ IPC 处理器：
  - `ai:config:get` - 获取配置
  - `ai:config:save` - 保存配置
  - `ai:config:test` - 测试连接
- ✅ 连接延迟测量

### 前端（Renderer Process）
- ✅ Settings 组件中的新标签页
- ✅ 完整的配置表单
- ✅ 表单验证
- ✅ 成功/错误提示

### 安全性
- ✅ API Key 使用 Electron safeStorage 加密
- ✅ 配置文件存储在用户数据目录

## 文件修改清单

### 类型定义
- `src/shared/types.ts` - 添加 AI 相关类型

### 主进程
- `src/main/services/AIService.ts` - 添加延迟测量
- `src/main/services/AIConfigService.ts` - 配置管理服务
- `src/main/ipc/aiHandlers.ts` - AI 配置 IPC 处理器
- `src/main/preload.ts` - 暴露 AI API
- `src/main/index.ts` - 注册 AI 配置处理器

### 渲染进程
- `src/renderer/types/electron.d.ts` - AI API 类型定义
- `src/renderer/components/Settings.tsx` - 添加 AI 配置标签页

## 配置存储位置
- Windows: `%APPDATA%\skillsmn\ai-config.json`
- macOS: `~/Library/Application Support/skillsmn/ai-config.json`
- Linux: `~/.config/skillsmn/ai-config.json`

## 使用示例

```typescript
// 获取配置
const config = await window.electronAPI.getAIConfiguration();

// 保存配置
await window.electronAPI.saveAIConfiguration({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-sonnet-20240229',
  streamingEnabled: true,
  timeout: 30000,
  maxRetries: 2
});

// 测试连接
const result = await window.electronAPI.testAIConnection();
console.log('Connection successful:', result.success);
console.log('Latency:', result.latency, 'ms');
```
