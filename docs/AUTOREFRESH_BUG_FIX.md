# AutoRefresh Bug Fix

## 问题描述

用户报告在项目目录里复制技能后，技能列表没有自动刷新，即使 `autoRefresh` 配置项已启用。

## 根本原因

### 1. 闭包陷阱 (Closure Stale Problem)

**问题**: `loadSkills` 是一个普通函数，每次渲染都会创建新的实例。当 `onFSChange` 回调注册时，它捕获的是**第一次渲染时**的 `loadSkills` 函数引用。

```typescript
// ❌ 错误的实现
async function loadSkills(): Promise<void> {
  // ...
}

useEffect(() => {
  ipcClient.onFSChange(async (event) => {
    await loadSkills(); // 永远调用第一次渲染时的 loadSkills
  });
}, []); // 空依赖数组
```

**后果**:
- `loadSkills` 内部引用的 `state.config` 是**初始值**
- 即使用户更改了项目目录，文件监视器回调仍然使用旧的配置
- 导致文件变化时无法正确刷新技能列表

### 2. 多重监听器注册 (Multiple Listener Registration)

**问题**: 每次切换 `autoRefresh` 设置时，都会添加新的监听器，而没有先移除旧的监听器。

```typescript
// ❌ 错误的实现
if (!wasWatching && shouldWatch) {
  await ipcClient.startWatching();
  ipcClient.onFSChange(async (event) => {  // 添加新监听器
    await loadSkills();
  });
}
```

**后果**:
- 如果用户多次切换 `autoRefresh`，会注册多个监听器
- 一个文件变化会触发多次 `loadSkills()` 调用
- 性能浪费和潜在的竞态条件

## 修复方案

### 1. 使用 `useCallback` + `useRef` 模式

**核心思想**:
- 使用 `useCallback` 确保 `loadSkills` 只在 `state.config` 变化时更新
- 使用 `useRef` 存储最新的 `loadSkills` 引用
- 文件监视器回调始终调用 `ref.current()`，获取最新版本

```typescript
// ✅ 正确的实现
// 1. 创建 ref 存储最新函数引用
const loadSkillsRef = useRef<() => Promise<void>>(async () => {});

// 2. 使用 useCallback 包装 loadSkills
const loadSkills = useCallback(async (): Promise<void> => {
  if (!state.config) return;

  try {
    const skills = await ipcClient.listSkills(state.config);
    dispatch({ type: 'SET_SKILLS', payload: skills });
  } catch (error) {
    console.error('Failed to load skills:', error);
    dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
  }
}, [state.config]); // 只在 state.config 变化时更新

// 3. 每次渲染后更新 ref
loadSkillsRef.current = loadSkills;

// 4. 文件监视器回调使用 ref
ipcClient.onFSChange(async (event) => {
  console.log('File system change detected:', event);
  await loadSkillsRef.current(); // ✅ 始终调用最新版本
});
```

**工作流程**:
```
1. 组件渲染 → loadSkills 创建
2. loadSkillsRef.current = loadSkills (更新 ref)
3. 用户更改项目目录 → state.config 变化
4. loadSkills 重新创建 (因为 useCallback 依赖 state.config)
5. loadSkillsRef.current = 新的 loadSkills (再次更新 ref)
6. 文件监视器回调调用 loadSkillsRef.current() → 获取最新版本 ✅
```

### 2. 注册前移除旧监听器

**在所有注册监听器的地方**，先调用 `removeFSChangeListener()`:

```typescript
// ✅ 正确的实现
await ipcClient.startWatching();

// 移除旧的监听器（如果存在）
ipcClient.removeFSChangeListener();

// 注册新的监听器
ipcClient.onFSChange(async (event) => {
  console.log('File system change detected:', event);
  await loadSkillsRef.current();
});
```

**应用位置**:
1. **初始化** (App.tsx:162-170)
2. **Setup 完成后** (App.tsx:266-276)
3. **Settings 保存后** (App.tsx:414-421)

### 3. 增强日志记录

在 `FileWatcher.ts` 中添加详细日志，方便调试:

```typescript
// handleChange - 记录每个文件系统事件
private handleChange(eventType: string, path: string): void {
  logger.debug('File system event received', 'FileWatcher', {
    eventType,
    path,
  });

  // ... 防抖逻辑 ...

  const timer = setTimeout(() => {
    logger.info('Emitting debounced file system event', 'FileWatcher', {
      eventType,
      path,
    });
    this.emitEvent(eventType, path);
  }, this.DEBOUNCE_MS);
}

// emitEvent - 记录 IPC 发送
private emitEvent(eventType: string, path: string): void {
  logger.info('Emitting FS_CHANGE event to renderer', 'FileWatcher', {
    event,
    channel: IPC_CHANNELS.FS_CHANGE,
  });

  this.mainWindow.webContents.send(IPC_CHANNELS.FS_CHANGE, event);

  logger.debug('FS_CHANGE event sent successfully', 'FileWatcher');
}
```

## 完整流程图

### 修复前（❌ 错误）

```
应用启动
  │
  ├─ loadSkills() 创建 (引用 #1)
  │
  ├─ onFSChange 注册回调
  │    └─ 回调捕获 loadSkills 引用 #1
  │
  ├─ 用户更改项目目录
  │
  ├─ loadSkills() 重新创建 (引用 #2)
  │
  └─ 文件变化 → onFSChange 回调
       └─ 调用 loadSkills 引用 #1 (旧的！)
            └─ 使用旧的 state.config
                 └─ ❌ 刷新失败
```

### 修复后（✅ 正确）

```
应用启动
  │
  ├─ loadSkills() 创建 (引用 #1)
  ├─ loadSkillsRef.current = 引用 #1
  │
  ├─ onFSChange 注册回调
  │    └─ 回调使用 loadSkillsRef.current()
  │
  ├─ 用户更改项目目录
  │
  ├─ loadSkills() 重新创建 (引用 #2)
  ├─ loadSkillsRef.current = 引用 #2 ✅
  │
  └─ 文件变化 → onFSChange 回调
       └─ 调用 loadSkillsRef.current()
            └─ 返回引用 #2 (最新的！)
                 └─ 使用最新的 state.config
                      └─ ✅ 刷新成功
```

## 关键代码变更

| 文件 | 变更内容 |
|-----|---------|
| `src/renderer/App.tsx` | 1. 添加 `useRef` 导入<br>2. 添加 `loadSkillsRef` ref<br>3. 将 `loadSkills` 改为 `useCallback`<br>4. 更新 ref: `loadSkillsRef.current = loadSkills`<br>5. 所有 `onFSChange` 回调使用 `loadSkillsRef.current()`<br>6. 注册前调用 `removeFSChangeListener()` |
| `src/main/services/FileWatcher.ts` | 添加详细日志记录 |

## 测试要点

### 1. 基本功能
- ✅ 复制技能到项目目录 → 技能列表自动更新
- ✅ 修改技能文件 → 技能列表自动更新
- ✅ 删除技能文件 → 技能列表自动更新

### 2. 配置更改
- ✅ 禁用 `autoRefresh` → 保存 → 文件监视器停止
- ✅ 启用 `autoRefresh` → 保存 → 文件监视器启动
- ✅ 更改项目目录 → 技能列表刷新，监视器监视新目录

### 3. 多次切换
- ✅ 多次切换 `autoRefresh` 设置 → 只有一个监听器活跃
- ✅ 文件变化只触发一次刷新

### 4. 日志验证
打开开发者工具，检查控制台日志:
```
File system event received { eventType: 'add', path: '...' }
Emitting debounced file system event { eventType: 'add', path: '...' }
Emitting FS_CHANGE event to renderer { event: {...}, channel: 'fs:change' }
FS_CHANGE event sent successfully
File system change detected: { type: 'add', path: '...', directory: 'project' }
```

## 技术细节

### 为什么使用 ref 而不是添加 `loadSkills` 到依赖数组？

**方案 A: 添加依赖 (不推荐)**
```typescript
useEffect(() => {
  ipcClient.onFSChange(async (event) => {
    await loadSkills();
  });
  return () => ipcClient.removeFSChangeListener();
}, [loadSkills]); // ❌ 每次 loadSkills 变化都重新运行
```

**问题**:
- `loadSkills` 依赖 `state.config`
- 每次 `state.config` 变化 → `loadSkills` 变化 → useEffect 重新运行
- 重新运行 = 移除监听器 + 重新注册监听器
- **不必要地重启文件监视器**
- 性能浪费

**方案 B: 使用 ref (推荐) ✅**
```typescript
useEffect(() => {
  ipcClient.onFSChange(async (event) => {
    await loadSkillsRef.current(); // ✅ 始终最新，无需重新注册
  });
  return () => ipcClient.removeFSChangeListener();
}, []); // ✅ 只运行一次
```

**优点**:
- useEffect 只运行一次（初始化时）
- 通过 ref 始终获取最新的 `loadSkills`
- 无需重启文件监视器
- 性能最优

### React Hooks 最佳实践

这个修复展示了 React Hooks 的一个常见陷阱：

1. **闭包陷阱**: 函数组件中的函数会捕获当前渲染时的状态
2. **解决方案**: 使用 `useRef` 存储可变引用，避免重新注册副作用

参考:
- [React Hooks FAQ: Why am I seeing stale props or state?](https://react.dev/learn/referencing-values-with-refs)
- [useCallback 官方文档](https://react.dev/reference/react/useCallback)

## 构建状态

✅ TypeScript 编译: 成功
✅ 生产构建: 成功 (2m 46s)
✅ Bundle 大小: 304.58 kB (main)

## 相关文档

- `docs/AUTOREFRESH_IMPLEMENTATION.md` - AutoRefresh 实现详解
- `docs/AUTOREFRESH_FIX.md` - 之前的修复（已过时）
- `docs/SETTINGS_MODAL_RESTORE.md` - Settings 模态窗口恢复
- `docs/SETTINGS_SIDEBAR_FIX.md` - Sidebar 按钮修复

## 总结

这次修复解决了 AutoRefresh 功能的核心问题：

1. **闭包陷阱**: 使用 `useRef` 确保回调始终调用最新的 `loadSkills`
2. **多重监听器**: 注册前先移除旧监听器
3. **性能优化**: 使用 `useCallback` 避免不必要的函数重建
4. **可调试性**: 添加详细日志记录

AutoRefresh 功能现在可以正常工作了！🎉
