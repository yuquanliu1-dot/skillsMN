# 删除技能时自动关闭编辑器

## 问题描述

当用户删除一个正在编辑器中打开的技能时，编辑器仍然保持打开状态，显示已删除的技能内容。这可能导致混淆和潜在的错误操作。

## 解决方案

在删除技能之前，检查该技能是否正在编辑器中打开。如果是，先关闭编辑器，然后再执行删除操作。

## 实现细节

### 修改位置

**文件**: `src/renderer/App.tsx`
**函数**: `handleDeleteSkill` (Line 543-566)

### 修改内容

#### 修改前
```typescript
const handleDeleteSkill = async (skill: Skill): Promise<void> => {
  try {
    const response = await window.electronAPI.deleteSkill(skill.path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete skill');
    }

    await loadSkills();
    showToast(`Skill "${skill.name}" moved to recycle bin`, 'success');
  } catch (error: any) {
    console.error('Failed to delete skill:', error);
    showToast(`Failed to delete skill: ${error.message}`, 'error');
    throw error;
  }
};
```

#### 修改后
```typescript
const handleDeleteSkill = async (skill: Skill): Promise<void> => {
  try {
    // Close the editor if the skill being deleted is currently open
    if (editingSkill && editingSkill.path === skill.path) {
      console.log('Closing editor for skill being deleted:', skill.name);
      setEditingSkill(null);
    }

    // Clear selection if the deleted skill was selected
    if (selectedSkillPath === skill.path) {
      setSelectedSkillPath(null);
    }

    const response = await window.electronAPI.deleteSkill(skill.path);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete skill');
    }

    await loadSkills();
    showToast(`Skill "${skill.name}" moved to recycle bin`, 'success');
  } catch (error: any) {
    console.error('Failed to delete skill:', error);
    showToast(`Failed to delete skill: ${error.message}`, 'error');
    throw error;
  }
};
```

## 工作流程

### 删除流程

```
用户点击删除按钮
    ↓
SkillCard 调用 onDeleteSkill
    ↓
App.handleDeleteSkill 接收调用
    ↓
检查 editingSkill.path === skill.path ?
    ├─ 是 → setEditingSkill(null) 关闭编辑器
    └─ 否 → 继续
    ↓
检查 selectedSkillPath === skill.path ?
    ├─ 是 → setSelectedSkillPath(null) 清除选择
    └─ 否 → 继续
    ↓
调用 window.electronAPI.deleteSkill(skill.path)
    ↓
刷新技能列表
    ↓
显示成功提示
```

## 新增功能

### 1. 自动关闭编辑器

**条件**: `editingSkill.path === skill.path`
**操作**: `setEditingSkill(null)`
**效果**: 编辑器立即关闭，用户看到技能列表

### 2. 清除选择状态

**条件**: `selectedSkillPath === skill.path`
**操作**: `setSelectedSkillPath(null)`
**效果**: 清除技能高亮选择状态

## 用户体验改进

### 修改前
1. 用户打开技能 A 进行编辑
2. 用户删除技能 A
3. 编辑器仍然显示技能 A 的内容
4. 用户可能尝试保存已删除的技能
5. 混淆和潜在错误

### 修改后
1. 用户打开技能 A 进行编辑
2. 用户删除技能 A
3. **编辑器自动关闭**
4. **选择状态自动清除**
5. 用户看到干净的技能列表
6. 清晰的视觉反馈

## 边界情况处理

### 场景 1: 删除未打开的技能
```typescript
editingSkill = null
skill = { name: "Skill B", path: "/path/to/b" }

// 结果: 不关闭编辑器，正常删除
```

### 场景 2: 删除当前编辑的技能
```typescript
editingSkill = { name: "Skill A", path: "/path/to/a" }
skill = { name: "Skill A", path: "/path/to/a" }

// 结果: 关闭编辑器，然后删除
```

### 场景 3: 删除另一个技能
```typescript
editingSkill = { name: "Skill A", path: "/path/to/a" }
skill = { name: "Skill B", path: "/path/to/b" }

// 结果: 保持编辑器打开，删除 Skill B
```

### 场景 4: 删除失败
```typescript
// 如果删除操作失败
// 编辑器已经关闭
// 用户可以重新打开其他技能
// 错误提示正常显示
```

## 相关状态

### editingSkill
- **类型**: `Skill | null`
- **用途**: 当前在编辑器中打开的技能
- **管理**: `setEditingSkill()`

### selectedSkillPath
- **类型**: `string | null`
- **用途**: 当前在列表中选中的技能路径
- **管理**: `setSelectedSkillPath()`

## 触发方式

### 方式 1: 点击删除按钮
```typescript
// SkillCard 组件
<button onClick={() => onDeleteSkill?.(skill)}>
  删除
</button>
```

### 方式 2: 键盘快捷键 (Delete)
```typescript
// App.tsx 键盘事件处理
if (event.key === 'Delete' && selectedSkillPath) {
  const selectedSkill = state.skills.find(s => s.path === selectedSkillPath);
  if (selectedSkill) {
    setDeletingSkill(selectedSkill);
  }
}
```

## 相关组件

### 调用链
```
SkillCard (删除按钮)
    ↓ onDeleteSkill
SkillList (透传)
    ↓ onDeleteSkill
App.tsx (处理)
    ↓ handleDeleteSkill
DeleteConfirmDialog (确认)
    ↓ onConfirm
App.handleDeleteSkill (执行)
```

### 相关文件
- `src/renderer/App.tsx` - 主要逻辑
- `src/renderer/components/SkillList.tsx` - 列表组件
- `src/renderer/components/SkillCard.tsx` - 卡片组件
- `src/renderer/components/DeleteConfirmDialog.tsx` - 确认对话框

## 测试建议

### 测试场景 1: 删除打开的技能
1. 打开技能 A 进行编辑
2. 点击删除按钮
3. 确认删除
4. **预期**: 编辑器关闭，技能被删除

### 测试场景 2: 删除未打开的技能
1. 不打开任何技能
2. 删除技能 A
3. 确认删除
4. **预期**: 技能被删除，界面正常

### 测试场景 3: 编辑 A，删除 B
1. 打开技能 A 进行编辑
2. 删除技能 B
3. 确认删除
4. **预期**: 技能 A 保持打开，技能 B 被删除

### 测试场景 4: 键盘快捷键删除
1. 选中技能 A（高亮显示）
2. 按 Delete 键
3. 确认删除
4. **预期**: 选择清除，技能被删除

## 日志输出

### 正常删除
```
Closing editor for skill being deleted: My Skill
Skill deleted successfully: My Skill
```

### 删除未打开的技能
```
Skill deleted successfully: My Skill
```

## 注意事项

1. **顺序重要**: 必须先关闭编辑器，再执行删除
2. **状态清理**: 同时清除编辑状态和选择状态
3. **错误处理**: 即使删除失败，编辑器也已关闭
4. **用户体验**: 提供清晰的视觉反馈

## 相关功能

- [技能编辑器](./SKILL_EDITOR.md)
- [删除确认对话框](./DELETE_CONFIRM_DIALOG.md)
- [技能列表](./SKILL_LIST.md)

## 更新历史

- **2026-03-18**: 初始实现 - 删除技能时自动关闭编辑器
