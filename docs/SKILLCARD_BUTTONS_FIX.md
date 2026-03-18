# SkillCard 操作按钮默认显示修复

## ✅ 修复完成

### 问题描述
SkillCard 组件中的操作按钮（更新、打开文件夹、删除）默认是隐藏的，只有在 hover 时才显示。

### 修复方案
移除 `opacity-0 hover:opacity-100` 类，让按钮默认显示。

### 修改文件
**文件**: `src/renderer/components/SkillCard.tsx`

**修改前**:
```tsx
<div className="flex items-center gap-1 flex-shrink-0 opacity-0 hover:opacity-100 transition-opacity">
  {/* 按钮内容 */}
</div>
```

**修改后**:
```tsx
<div className="flex items-center gap-1 flex-shrink-0">
  {/* 按钮内容 */}
</div>
```

### 修改行
- **行号**: 158
- **之前**: `opacity-0 hover:opacity-100 transition-opacity`
- **之后**: (删除了这些类)

### 效果对比

**之前**:
```
┌─────────────────────────┐
│ Skill Name           │ → hover → │ 🗑 📂  │
│ metadata...          │         │        │
└─────────────────────────┘
```

**现在**:
```
┌─────────────────────────┐
│ Skill Name      [🗑] [📁] │ ← 始终显示
│ metadata...     [🔄]        │
└─────────────────────────┘
```

### 用户体验改进
- ✅ **立即可见**: 操作按钮始终可见，- ✅ **更快访问**: 不需要 hover 才能看到按钮
- ✅ **更直观**: 用户可以立即知道可以执行哪些操作

### 按钮说明

SkillCard 包含以下按钮（从左到右）:

1. **Update** (蓝色按钮)
   - 仅当有更新时显示
   - 点击后显示更新对话框

2. **Open Folder** (图标按钮)
   - 打开 skill 所在文件夹
   - 快速访问文件系统

3. **Delete** (红色图标按钮)
   - 删除 skill
   - 点击后显示确认对话框

4. **Arrow** (箭头图标)
   - 表示可以点击进入详情

### 编译状态
✅ **成功** (0 errors)

### Git 状态
✅ 已提交到本地仓库
⏳ 推送到远程仓库时遇到网络问题

**Commit**: `42fbb28` - fix: show action buttons by default in SkillCard

### 下一步
需要在网络恢复后推送到远程仓库：
```bash
git push
```

### 测试
启动应用后查看 Skills 标签页，所有 skill 卡片的操作按钮应该立即显示，不需要 hover。
