# 🧪 AutoRefresh 测试指南

## ✅ 已完成的修复

1. **添加了详细的 console.log 日志** - 现在每个步骤都会在主进程终端显示
2. **添加了 chokidar 'ready' 事件处理** - 确认监视器完全启动
3. **修复了深度限制** - 改为 99 (几乎无限制)

## 📋 测试步骤

### 1. 重新启动应用

```bash
npm start
```

### 2. 观察主进程终端输出

启动时应该看到：

```
================================================================================
🚀 [FileWatcher] START METHOD CALLED
================================================================================
   Project Dir: D:\skillsMN
   Global Dir: C:\Users\...\ .claude\skills
================================================================================

👀 [FileWatcher] Starting chokidar watcher...
   Watch paths: ['D:\\skillsMN\\.claude\\skills', 'C:\\Users\\...\\.claude\\skills']
   Chokidar options:
     - ignored: /(^|[\/\\])\../ (dotfiles)
     - persistent: true
     - ignoreInitial: true
     - depth: 99 (unlimited)

✅ [FileWatcher] Chokidar watcher instance created
🔗 [FileWatcher] Setting up event handlers...

================================================================================
✅ [FileWatcher] CHOKIDAR READY - NOW WATCHING FOR CHANGES
================================================================================

✅ [FileWatcher] File watcher setup complete
```

**如果看到这个输出**，说明文件监视器已经成功启动！✅

### 3. 在项目目录操作文件

**操作 1: 复制技能文件夹**

在 `D:\skillsMN\.claude\skills\` 目录中：
- 复制 `pwd` 文件夹
- 重命名为 `pwd-test`

**期望看到**（在主进程终端）：

```
📁 [Chokidar] ADDDIR event detected
   Path: D:\skillsMN\.claude\skills\pwd-test

🔍 [FileWatcher] FILE SYSTEM EVENT DETECTED!
   Type: addDir
   Path: D:\skillsMN\.claude\skills\pwd-test

✅ [FileWatcher] EMITTING EVENT (after 200ms debounce)
   Type: addDir
   Path: D:\skillsMN\.claude\skills\pwd-test

📤 [FileWatcher] SENDING IPC EVENT TO RENDERER
   Channel: fs:change
   Event: {
     "type": "addDir",
     "path": "D:\\skillsMN\\.claude\\skills\\pwd-test",
     "directory": "project"
   }

✅ [FileWatcher] IPC EVENT SENT SUCCESSFULLY
```

**操作 2: 修改文件**

在 `D:\skillsMN\.claude\skills\pwd-test\skill.md` 中：
- 打开文件
- 添加一些文字
- 保存

**期望看到**（在主进程终端）：

```
📝 [Chokidar] CHANGE event detected
   Path: D:\skillsMN\.claude\skills\pwd-test\skill.md

🔍 [FileWatcher] FILE SYSTEM EVENT DETECTED!
   Type: change
   Path: D:\skillsMN\.claude\skills\pwd-test\skill.md

✅ [FileWatcher] EMITTING EVENT (after 200ms debounce)
   Type: change
   Path: D:\skillsMN\.claude\skills\pwd-test\skill.md

📤 [FileWatcher] SENDING IPC EVENT TO RENDERER
   Channel: fs:change
   Event: {
     "type": "change",
     "path": "D:\\skillsMN\\.claude\\skills\\pwd-test\\skill.md",
     "directory": "project"
   }

✅ [FileWatcher] IPC EVENT SENT SUCCESSFULLY
```

### 4. 在 DevTools Console 观察渲染进程日志

打开 DevTools（`Ctrl+Shift+I`），应该看到：

```
File system change detected: { type: 'addDir', path: 'D:\\skillsMN\\.claude\\skills\\pwd-test', directory: 'project' }
```

**并且技能列表应该自动刷新！** ✅

---

## 🚨 故障排查

### 如果主进程终端没有看到 "CHOKIDAR READY" 日志

说明文件监视器没有启动，检查：

1. **是否看到 "START METHOD CALLED" 日志？**
   - 如果没有 → `startWatching()` 没有被调用
   - 检查 App.tsx 的初始化代码

2. **是否看到任何错误信息？**
   - 查看终端是否有红色错误文本
   - 复制完整错误信息

### 如果看到 "CHOKIDAR READY" 但复制文件后没有事件日志

说明 chokidar 没有检测到文件变化，可能原因：

1. **路径不正确**
   - 检查 "Watch paths" 中显示的路径
   - 确认你在正确的路径下操作文件

2. **权限问题**
   - 尝试以管理员身份运行

3. **防病毒软件干扰**
   - 临时禁用防病毒软件测试

### 如果看到主进程日志但渲染进程没有日志

说明 IPC 通信有问题，检查：

1. **DevTools Console 是否有任何错误？**
2. **是否有 "File system change detected" 日志？**

---

## 📊 测试报告格式

请提供以下信息：

### ✅ 成功标志
- [ ] 看到了 "🚀 [FileWatcher] START METHOD CALLED"
- [ ] 看到了 "✅ [FileWatcher] CHOKIDAR READY"
- [ ] 复制文件后看到了 "📁 [Chokidar] ADDDIR event detected"
- [ ] 看到了 "✅ [FileWatcher] IPC EVENT SENT SUCCESSFULLY"
- [ ] DevTools Console 中看到了 "File system change detected"
- [ ] 技能列表自动刷新了

### ❌ 失败信息
如果某个步骤失败，请提供：

1. **完整的终端输出**（从启动应用到操作文件）
2. **DevTools Console 输出**
3. **你的操作步骤**（在哪个目录，复制了什么文件）
4. **配置信息**（Settings 中显示的项目目录）

---

## 💡 额外测试

### 测试全局目录

在全局技能目录（通常是 `C:\Users\你的用户名\.claude\skills`）中：
1. 创建或复制技能
2. 观察是否有事件触发

### 测试删除操作

1. 删除之前复制的 `pwd-test` 文件夹
2. 观察是否有 `unlinkDir` 事件

---

## 🎯 期望结果

如果一切正常，你应该能够：

1. **在主进程终端看到详细的文件系统事件日志** ✅
2. **在 DevTools Console 看到渲染进程收到事件** ✅
3. **技能列表自动刷新，无需手动刷新** ✅

如果还有问题，请提供完整的日志输出！
