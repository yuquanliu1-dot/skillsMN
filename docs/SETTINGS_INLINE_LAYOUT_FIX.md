# Settings 页面改为内嵌布局 - 修复说明

## 问题描述
将 Settings 从弹窗改为内嵌页面，填满除 sidebar 外的区域。

## 修改内容

### 1. 移除弹窗相关代码
- 移除 `fixed inset-0 bg-slate-900/50 backdrop-blur-sm` 弹窗背景
- 移除 `max-w-2xl w-full mx-4 p-6` 限制宽度的样式
- 移除关闭按钮和 `onClose` 相关逻辑

### 2. 添加全高布局
```tsx
<div className="h-full flex flex-col bg-white overflow-hidden">
  {/* Header - 固定高度 */}
  <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200">
    <h2>Settings</h2>
  </div>

  {/* Tabs - 固定高度 */}
  <div className="flex-shrink-0 px-6 pt-4 border-b border-slate-200">
    {/* Tabs */}
  </div>

  {/* Content - 可滚动 */}
  <div className="flex-1 overflow-y-auto">
    {/* Tab内容 */}
  </div>
</div>
```

### 3. Tab 内容结构调整
- General tab: 移除 Cancel 按钮，只保留 Save
- 所有 tab 内容都放在可滚动区域内
- 使用 `style={{ display: activeTab === 'xxx' ? 'block' : 'none' }}` 控制显示

## 待修复
当前有 TypeScript 编译错误，需要检查 JSX 结构。
