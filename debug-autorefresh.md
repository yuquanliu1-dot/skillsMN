# 自动刷新调试指南

## 问题描述
后端监测到文件变化，但前端skill列表没有重新加载。

## 已添加的调试日志

我已经在关键位置添加了调试日志，帮助定位问题：

### 1. 后端日志（FileWatcher.ts）
```
✅ [FileWatcher] EMITTING EVENT (after 200ms debounce)
📤 [FileWatcher] SENDING IPC EVENT TO RENDERER
✅ [FileWatcher] IPC EVENT SENT SUCCESSFULLY
```

### 2. Preload层日志
```
[Preload] onFSChange: Registering listener for fs:change
[Preload] Received FS_CHANGE event: {...}
```

### 3. IPC Client层日志
```
[IPC Client] onFSChange called
[IPC Client] Registering FS change listener
[IPC Client] FS change event received: {...}
```

### 4. App.tsx层日志
```
🔔 [App.tsx] File system change detected: {...}
🔔 [App.tsx] Calling loadSkills...
🔄 [loadSkills] Starting to load skills...
✅ [loadSkills] Loaded X skills
✅ [App.tsx] loadSkills completed
```

## 测试步骤

1. **重新启动应用**
   ```bash
   npm run build
   npm start
   ```

2. **打开开发者工具**
   - 按 `F12` 或 `Ctrl+Shift+I`
   - 切换到 Console 标签

3. **触发文件变化**
   - 在项目目录或全局目录中修改、创建或删除skill文件
   - 观察控制台日志输出

4. **检查日志链路**
   - ✅ 后端看到文件变化 → 应该看到 FileWatcher 日志
   - ❓ Preload收到事件 → 应该看到 `[Preload] Received FS_CHANGE event`
   - ❓ IPC Client收到事件 → 应该看到 `[IPC Client] FS change event received`
   - ❓ App.tsx收到事件 → 应该看到 `🔔 [App.tsx] File system change detected`
   - ❓ loadSkills被调用 → 应该看到 `🔄 [loadSkills] Starting to load skills...`

## 可能的问题

### 问题1：Preload没有收到事件
**症状**：看到 FileWatcher 日志，但没有 Preload 日志
**原因**：IPC通信失败
**检查**：
- 确保 `IPC_CHANNELS.FS_CHANGE` 常量一致
- 检查 BrowserWindow 是否正确设置

### 问题2：监听器未注册
**症状**：Preload 收到事件，但回调函数没有执行
**原因**：`ipcClient.onFSChange()` 没有被调用
**检查**：
- 查看是否有 `[IPC Client] Registering FS change listener` 日志
- 检查 `config.autoRefresh` 设置

### 问题3：loadSkills没有执行
**症状**：App.tsx 收到事件，但 loadSkills 没有被调用
**原因**：`loadSkillsRef.current` 引用问题
**检查**：
- 查看是否有 `🔔 [App.tsx] Calling loadSkills...` 日志

## 临时解决方案

如果自动刷新不工作，可以：
1. 手动按 `Ctrl+R` 刷新技能列表
2. 点击界面上的刷新按钮（如果有）
3. 重启应用

## 请反馈

运行测试后，请告诉我：
1. 在控制台中看到了哪些日志？
2. 日志链路在哪里中断了？
3. 是否有任何错误消息？

这样我可以帮你定位并修复问题。
