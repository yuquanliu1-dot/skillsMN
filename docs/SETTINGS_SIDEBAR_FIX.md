# Settings 模态窗口 Sidebar 按钮修复

## 问题描述

Settings 恢复为模态窗口后，点击 Sidebar 上的 Settings 按钮没有弹出模态窗口，而是仍然显示之前的画布。

## 根本原因

Sidebar 中的 Settings 按钮仍在使用 `onViewChange('settings')`，这会调用 `setCurrentView('settings')`。

但是现在：
1. Settings 已改为模态窗口，使用 `showSettings` 状态控制
2. App.tsx 中移除了内嵌布局的 `currentView === 'settings'` 判断
3. 点击后 `currentView` 变为 'settings'，但没有任何视图显示这个状态

## 修复方案

### 1. 修改 Sidebar Props

**之前**:
```typescript
export type ViewType = 'skills' | 'discover' | 'private-repos' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  config: Configuration | null;
  onChangeProjectDirectory?: () => void;
}
```

**现在**:
```typescript
export type ViewType = 'skills' | 'discover' | 'private-repos';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSettingsClick: () => void;  // ✅ 新增：Settings 按钮回调
  config: Configuration | null;
  onChangeProjectDirectory?: () => void;
}
```

### 2. 从 navItems 移除 Settings

**之前** - Settings 在 navItems 数组中：
```typescript
const navItems = [
  { id: 'skills', ... },
  { id: 'discover', ... },
  { id: 'private-repos', ... },
  { id: 'settings', ... },  // ❌ 作为 view 处理
];
```

**现在** - Settings 单独渲染在 Footer：
```typescript
const navItems = [
  { id: 'skills', ... },
  { id: 'discover', ... },
  { id: 'private-repos', ... },
  // ✅ Settings 移除
];

// Footer Section
<div className="p-2 border-t border-gray-100 space-y-1">
  {/* Settings Button - 独立渲染 */}
  <button onClick={onSettingsClick}>
    <SettingsIcon />
  </button>

  {/* Project Directory Switch Button */}
  <button onClick={onChangeProjectDirectory}>
    <FolderIcon />
  </button>

  {/* Status Indicator */}
  <div>...</div>
</div>
```

### 3. 更新 App.tsx 调用

**之前**:
```tsx
<Sidebar
  currentView={currentView}
  onViewChange={setCurrentView}
  config={state.config}
  onChangeProjectDirectory={() => setShowDirectoryChangeDialog(true)}
/>
```

**现在**:
```tsx
<Sidebar
  currentView={currentView}
  onViewChange={setCurrentView}
  onSettingsClick={() => setShowSettings(true)}  // ✅ 新增
  config={state.config}
  onChangeProjectDirectory={() => setShowDirectoryChangeDialog(true)}
/>
```

## 修复流程图

```
用户点击 Sidebar Settings 按钮
         │
         ▼
  onSettingsClick()
         │
         ▼
  setShowSettings(true)
         │
         ▼
  Settings 组件渲染 (isOpen={true})
         │
         ▼
  显示模态窗口 ✅
```

## 对比：修复前后

### 修复前（❌ 错误）
```
点击 Settings → setCurrentView('settings')
              ↓
        currentView = 'settings'
              ↓
        没有 'settings' 视图渲染
              ↓
        显示之前的画布（bug）
```

### 修复后（✅ 正确）
```
点击 Settings → setShowSettings(true)
              ↓
        showSettings = true
              ↓
        <Settings isOpen={true} />
              ↓
        模态窗口弹出
```

## Sidebar 布局

```
┌──────────┐
│   Logo   │
├──────────┤
│  Skills  │ ← Navigation (ViewType)
│ Discover │
│ Private  │
├──────────┤
│ Settings │ ← Footer (独立按钮)
│  Folder  │
│  Status  │
└──────────┘
```

**Navigation 区域**:
- 使用 `onViewChange` 切换主内容视图
- ViewType: 'skills' | 'discover' | 'private-repos'

**Footer 区域**:
- Settings: 使用 `onSettingsClick` 打开模态窗口
- Folder: 使用 `onChangeProjectDirectory` 切换目录
- Status: 状态指示器

## 文件修改

| 文件 | 修改内容 |
|-----|---------|
| `src/renderer/components/Sidebar.tsx` | 1. 从 ViewType 移除 'settings'<br>2. 添加 `onSettingsClick` prop<br>3. 在 Footer 单独渲染 Settings 按钮 |
| `src/renderer/App.tsx` | 传递 `onSettingsClick={() => setShowSettings(true)}` |

## 构建状态

✅ TypeScript 编译: 成功
✅ 生产构建: 成功 (2m 38s)
✅ Bundle 大小: 304.27 kB

## 测试要点

1. ✅ 点击 Sidebar Settings 按钮 → 模态窗口弹出
2. ✅ 点击背景或关闭按钮 → 模态窗口关闭
3. ✅ 按 ESC 键 → 模态窗口关闭
4. ✅ 其他导航按钮（Skills、Discover、Private） → 正常切换视图
5. ✅ Settings 按钮不影响 currentView 状态

Settings 模态窗口现在可以正常打开了！🎉
