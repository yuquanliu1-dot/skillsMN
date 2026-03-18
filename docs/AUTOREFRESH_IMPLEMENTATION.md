# AutoRefresh 功能实现逻辑详解

## 功能概述

**AutoRefresh** 是一个文件系统监视功能，当启用时，会自动监视技能目录的变化（创建、修改、删除文件），并自动刷新技能列表。

## 核心组件

### 1. 配置层 (Configuration)

**位置**: `src/shared/types.ts`, `src/main/models/Configuration.ts`

```typescript
// Configuration 接口
interface Configuration {
  defaultInstallDirectory: InstallDirectory;
  editorDefaultMode: EditorMode;
  autoRefresh: boolean;  // ✅ 配置项
  projectDirectory: string | null;
}
```

**默认值**: `true` (启用)

**存储位置**: `%APPDATA%/skillsmn/config.json`

**Settings UI**: `src/renderer/components/Settings.tsx` 的 General Tab

---

### 2. 文件监视器 (FileWatcher Service)

**位置**: `src/main/services/FileWatcher.ts`

**职责**: 监视文件系统变化并发送 IPC 事件

#### 核心方法

```typescript
class FileWatcher {
  private watcher: FSWatcher | null = null;
  private mainWindow: BrowserWindow | null = null;

  // 启动监视
  start(projectDir: string | null, globalDir: string): void {
    // 使用 chokidar 库监视目录
    this.watcher = chokidar.watch([projectDir, globalDir], {
      ignored: /(^|[\/\\])\../,  // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,       // 忽略初始扫描
      awaitWriteFinish: {        // 等待文件写入完成
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      depth: 2,                  // 监视深度
    });

    // 监听事件
    this.watcher
      .on('add', (path) => this.handleChange('add', path))
      .on('change', (path) => this.handleChange('change', path))
      .on('unlink', (path) => this.handleChange('unlink', path))
      .on('addDir', (path) => this.handleChange('addDir', path))
      .on('unlinkDir', (path) => this.handleChange('unlinkDir', path));
  }

  // 停止监视
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // 发送事件到渲染进程
  private emitEvent(eventType: string, path: string): void {
    const event: FSEvent = {
      type: eventType,
      path,
      directory: this.pathValidator.getSkillSource(path),
    };

    // 通过 IPC 发送到渲染进程
    this.mainWindow.webContents.send(IPC_CHANNELS.FS_CHANGE, event);
  }
}
```

#### 防抖机制

```typescript
// 防止快速连续事件
private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
private readonly DEBOUNCE_MS = 200;

private handleChange(eventType: string, path: string): void {
  const key = `${eventType}:${path}`;

  // 清除旧定时器
  if (existingTimer) clearTimeout(existingTimer);

  // 设置新定时器（200ms 后触发）
  const timer = setTimeout(() => {
    this.emitEvent(eventType, path);
    this.debounceTimers.delete(key);
  }, 200);

  this.debounceTimers.set(key, timer);
}
```

---

### 3. IPC 通信层

**位置**: `src/main/ipc/skillHandlers.ts`

#### IPC Channels

```typescript
// src/shared/constants.ts
export const IPC_CHANNELS = {
  FS_WATCH_START: 'fs:watch-start',
  FS_WATCH_STOP: 'fs:watch-stop',
  FS_CHANGE: 'fs:change',
};
```

#### 主进程 Handlers

```typescript
// 启动文件监视器
ipcMain.handle(IPC_CHANNELS.FS_WATCH_START, async () => {
  const fileWatcher = getFileWatcher();
  const config = await configService.load();

  const globalDir = SkillDirectoryModel.getGlobalDirectory();
  const projectDir = config.projectDirectory
    ? SkillDirectoryModel.getProjectDirectory(config.projectDirectory)
    : null;

  fileWatcher.start(projectDir, globalDir);
  return { success: true };
});

// 停止文件监视器
ipcMain.handle(IPC_CHANNELS.FS_WATCH_STOP, async () => {
  const fileWatcher = getFileWatcher();
  fileWatcher.stop();
  return { success: true };
});
```

---

### 4. 渲染进程集成 (App.tsx)

**位置**: `src/renderer/App.tsx`

#### 初始化逻辑

```typescript
useEffect(() => {
  async function initialize() {
    // 1. 加载配置
    const config = await ipcClient.loadConfig();

    // 2. 检查 autoRefresh 配置
    if (config.autoRefresh !== false) {  // 默认 true
      // 3. 启动文件监视器
      await ipcClient.startWatching();

      // 4. 监听文件变化事件
      ipcClient.onFSChange(async (event) => {
        console.log('File system change detected:', event);
        // 5. 重新加载技能列表
        await loadSkills();
      });
    }
  }

  initialize();
}, []);
```

#### 配置变更处理

```typescript
const handleSaveSettings = async (settings: Partial<Configuration>) => {
  const oldConfig = state.config;
  const updatedConfig = await ipcClient.saveConfig(settings);

  // 检查 autoRefresh 是否改变
  if (oldConfig && 'autoRefresh' in settings) {
    const wasWatching = oldConfig.autoRefresh !== false;
    const shouldWatch = updatedConfig.autoRefresh !== false;

    if (!wasWatching && shouldWatch) {
      // false → true: 启动监视器
      await ipcClient.startWatching();
      ipcClient.onFSChange(async (event) => {
        await loadSkills();
      });
      console.log('File system watcher started');
    } else if (wasWatching && !shouldWatch) {
      // true → false: 停止监视器
      await ipcClient.stopWatching();
      ipcClient.removeFSChangeListener();
      console.log('File system watcher stopped');
    }
  }
};
```

---

## 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    应用启动                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  加载配置文件          │
        │  autoRefresh = true    │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  检查 autoRefresh      │
        └────────┬───────────────┘
                 │
         ┌───────┴───────┐
         │               │
    true ▼               ▼ false
┌──────────────┐   ┌──────────────┐
│ 启动监视器   │   │  跳过启动    │
└──────┬───────┘   └──────────────┘
       │
       ▼
┌──────────────────────────────┐
│  FileWatcher.start()         │
│  - 监视 global 目录          │
│  - 监视 project 目录         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  chokidar 监视文件系统       │
│  - add/change/unlink         │
│  - addDir/unlinkDir          │
└──────┬───────────────────────┘
       │
       │ 文件变化
       ▼
┌──────────────────────────────┐
│  防抖处理 (200ms)            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  发送 IPC 事件               │
│  FS_CHANGE → 渲染进程        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  渲染进程接收事件            │
│  ipcClient.onFSChange()      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  重新加载技能列表            │
│  loadSkills()                │
└──────────────────────────────┘
```

---

## Settings 变更流程

```
用户操作: 取消勾选 "Auto Refresh"
         │
         ▼
    Save Settings
         │
         ▼
  handleSaveSettings()
         │
         ▼
  检测 autoRefresh 变化
         │
    ┌────┴────┐
    │         │
true→false  false→true
    │         │
    ▼         ▼
stopWatching()  startWatching()
    │         │
    │         ▼
    │    FileWatcher.start()
    │         │
    │         ▼
    │    监听文件变化
    │         │
    ▼         ▼
停止监视   启动监视
```

---

## 监视的目录

### 1. Global Directory
- **路径**: `~/.claude/skills/` (Windows: `%USERPROFILE%\.claude\skills\`)
- **作用**: 全局技能，所有项目可用
- **监视**: 始终监视（如果 autoRefresh 启用）

### 2. Project Directory
- **路径**: `<project>/.claude/skills/` 或 `<project>/skills/`
- **作用**: 项目特定技能
- **监视**: 仅当配置了 projectDirectory 时监视

---

## 防抖机制详解

### 为什么需要防抖？

编辑器保存文件时可能触发多个事件：
1. 文件内容写入
2. 文件元数据更新
3. 临时文件创建/删除

没有防抖会导致多次不必要的刷新。

### 实现

```typescript
// 200ms 内的重复事件会被合并
private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
private readonly DEBOUNCE_MS = 200;

handleChange(eventType, path) {
  const key = `${eventType}:${path}`;

  // 取消之前的定时器
  if (existingTimer) clearTimeout(existingTimer);

  // 设置新定时器
  setTimeout(() => {
    this.emitEvent(eventType, path);
  }, 200);
}
```

---

## 性能考虑

### 优点
✅ 实时响应文件变化，无需手动刷新
✅ 防抖机制避免过度刷新
✅ 可配置，用户可选择禁用

### 资源消耗
⚠️ chokidar 使用原生文件系统 API (Windows: ReadDirectoryChangesW)
⚠️ 监视两个目录，需要一定的内存和 CPU
⚠️ 文件变化频繁时会有性能影响

### 优化建议
1. **depth: 2** - 只监视 2 层深度，避免过度监视
2. **ignoreInitial: true** - 忽略初始扫描，减少启动时间
3. **防抖 200ms** - 合并快速连续事件
4. **可配置** - 用户可在 Settings 中禁用

---

## 常见问题

### Q1: 为什么禁用后重启应用还是不监视？
**A**: 因为初始化时会检查 `config.autoRefresh`，只有为 `true` 时才启动。

### Q2: 文件监视器可以监视网络驱动器吗？
**A**: 可以，但可能不稳定。chokidar 使用原生 API，网络延迟可能导致延迟。

### Q3: 监视大量文件会影响性能吗？
**A**: chokidar 使用高效的 native API，通常影响不大。但如果目录中有数千个文件，建议禁用 autoRefresh。

### Q4: 为什么有时修改文件不刷新？
**A**: 可能原因：
1. autoRefresh 被禁用
2. 文件不在监视的目录中
3. 文件变化在防抖期间内被合并
4. 编辑器使用了原子写入（先写临时文件再重命名）

---

## 相关文件

| 文件 | 作用 |
|-----|------|
| `src/shared/types.ts` | Configuration 接口定义 |
| `src/main/models/Configuration.ts` | 配置模型和默认值 |
| `src/main/services/FileWatcher.ts` | 文件监视器核心实现 |
| `src/main/ipc/skillHandlers.ts` | IPC 处理器 |
| `src/renderer/App.tsx` | 渲染进程集成 |
| `src/renderer/components/Settings.tsx` | Settings UI |
| `src/renderer/services/ipcClient.ts` | IPC 客户端封装 |

---

## 总结

**AutoRefresh** 是一个完整的文件监视解决方案：

1. **配置驱动**: 通过 `config.autoRefresh` 控制
2. **实时监视**: 使用 chokidar 监视文件系统
3. **IPC 通信**: 主进程 → 渲染进程事件传递
4. **防抖优化**: 200ms 防抖避免过度刷新
5. **动态控制**: Settings 保存时动态启动/停止
6. **可配置**: 用户可自由启用/禁用

这个设计平衡了实时性和性能，为用户提供了灵活的选择。
