# DevTools 打开指南

## 方法 1: 使用快捷键

**Windows/Linux**: `Ctrl + Shift + I`
**macOS**: `Cmd + Shift + I`

## 方法 2: 使用菜单栏

1. 点击顶部菜单栏的 **View**
2. 点击 **Toggle DevTools**

## 方法 3: 开发模式自动打开

如果你使用 `npm run dev` 启动，DevTools 会自动打开（在独立窗口中）

## 方法 4: Help 菜单

1. 点击顶部菜单栏的 **Help**
2. 点击 **Toggle DevTools**

## 调试步骤

### 1. 启动应用

```bash
npm start
```

### 2. 打开 DevTools

按 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Shift+I`（macOS）

### 3. 观察 DevTools Console

打开后，切换到 "Console" 标签，你应该看到以下日志：

**启动时**：
```
File system watcher started on initialization
```

**当复制/修改技能文件时**：
```
File system change detected: { type: 'add', path: '...', directory: 'project' }
```

### 4. 验证技能列表更新

检查技能列表是否自动刷新并显示新的/修改的技能。

## 常见问题排查

### 如果看不到日志

1. **检查配置**：
   - 打开 Settings 模态窗口（点击 Sidebar 的齿轮图标）
   - 确认 `Auto Refresh` 已启用
   - 确认项目目录已正确配置

2. **检查主进程日志**：
   - 查看启动应用的终端窗口
   - 应该看到：`File system watcher started successfully`
   - 如果看到 "File watcher already running"， 说明重复启动

3. **检查文件监视器状态**：
   - 在 DevTools Console 中运行：
     ```javascript
     console.log('Is watching:', window.electronAPI ? 'available' : 'not available');
     ```

4. **手动触发刷新**：
   - 按 `Ctrl+R` 手动刷新技能列表
   - 观察是否能看到技能列表更新

## 预期结果

- ✅ 夜秒内看到 "File system change detected" 日志
- ✅ 技能列表自动更新
- ✅ 新技能出现在列表中
- ✅ 修改的技能显示更新后的修改时间

