# 如何使用 AI Configuration 功能

## 📍 打开 AI Configuration 设置页面

### 步骤：

1. **启动应用**
   - 应用应该已经在运行
   - 如果没有，运行：`npx electron .`

2. **找到设置按钮**
   - 在应用窗口的**右上角**
   - 按钮显示为：**"Settings"** + ⚙️ 齿轮图标
   - 位置：在标题栏 "skillsMN" 的右侧

3. **点击设置按钮**
   - 会打开设置对话框

4. **切换到 AI Configuration 标签**
   - 在设置对话框中，你会看到**三个标签页**：
     - General（常规设置）
     - Private Repositories（私有仓库）
     - **AI Configuration**（AI 配置）⬅️ 点击这个

5. **配置 AI**
   - **API Base URL**（可选）
     - 留空使用默认 API
     - 或输入自定义端点
   
   - **API Key**（必填）
     - 输入你的 Anthropic API Key
     - 格式：`sk-ant-...`
   
   - **Model**（选择模型）
     - Claude 3 Opus（最强大）
     - Claude 3 Sonnet（平衡）⬅️ 推荐
     - Claude 3 Haiku（最快）
   
   - **Enable Streaming**（可选）
     - ✅ 勾选以启用流式响应
   
   - **Timeout**
     - 默认：30000ms（30秒）
     - 范围：5000-60000ms
   
   - **Max Retries**
     - 默认：2
     - 范围：0-5

6. **测试连接**
   - 点击 **"Test Connection"** 按钮
   - 等待测试完成
   - 成功：显示 ✅ Connection successful (XXXms)
   - 失败：显示错误信息

7. **保存配置**
   - 点击 **"Save Configuration"** 按钮
   - 看到 "AI configuration saved successfully" 提示

## 🔧 故障排除

### 看不到 AI Configuration 标签？

1. **检查应用是否正常运行**
   ```bash
   # 停止所有 Electron 实例
   taskkill /F /IM electron.exe
   
   # 重新启动
   npx electron .
   ```

2. **检查控制台错误**
   - 按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
   - 查看 Console 标签页是否有错误

3. **确认文件已更新**
   ```bash
   # 检查 Settings.tsx 是否包含 AI Configuration
   grep -n "AI Configuration" D:/skillsMN/src/renderer/components/Settings.tsx
   ```

### 设置按钮在哪里？

```
┌─────────────────────────────────────────┐
│  skillsMN          [Settings ⚙️]        │  ← 右上角
├─────────────────────────────────────────┤
│                                         │
│  [技能列表]                             │
│                                         │
└─────────────────────────────────────────┘
```

### AI Configuration 标签页布局

```
┌─────────────────────────────────────────┐
│  General | Private Repos | AI Config ⬅️ │
├─────────────────────────────────────────┤
│  API Base URL (Optional)                │
│  [___________________________]          │
│                                         │
│  API Key                                │
│  [••••••••••••••••••••]                │
│                                         │
│  Model                                  │
│  [Claude 3 Sonnet ▼]                   │
│                                         │
│  ☐ Enable Streaming                     │
│                                         │
│  Timeout (ms)      Max Retries          │
│  [30000]           [2]                  │
│                                         │
│  [Test Connection] [Save Configuration] │
└─────────────────────────────────────────┘
```

## ✅ 成功标志

如果你看到以下内容，说明功能正常：

- ✅ 三个标签页（General, Private Repos, AI Configuration）
- ✅ AI Configuration 标签页中有完整的配置表单
- ✅ Test Connection 按钮可以点击
- ✅ Save Configuration 按钮可以点击

## 📝 配置存储位置

配置会被加密存储在：

- **Windows**: `%APPDATA%\skillsmn\ai-config.json`
- **macOS**: `~/Library/Application Support/skillsmn/ai-config.json`
- **Linux**: `~/.config/skillsmn/ai-config.json`

## 🎯 下一步

配置完成后，你可以：

1. 使用 AI 生成技能内容
2. AI 辅助编辑技能
3. 自动生成技能描述

需要帮助？查看控制台日志或联系支持。
