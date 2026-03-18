# AI Skill Creator UI 改进

## 概述

优化 AI Skill Creator 对话框的按钮显示和用户反馈机制，提供更简洁、直观的用户体验。

## 改进内容

### 1. 按钮只显示图标（无文字）

#### 修改前 ❌
```tsx
<button className="...">
  <svg className="w-4 h-4 mr-2">...</svg>
  Generate  {/* 文字 */}
</button>
```

#### 修改后 ✅
```tsx
<button
  className="... flex items-center justify-center"
  title="Generate skill with AI"
>
  <svg className="w-5 h-5">...</svg>
</button>
```

**改进点**:
- 移除按钮文字，只保留图标
- 图标尺寸从 `w-4 h-4` 增加到 `w-5 h-5`
- 添加 `title` 属性提供悬停提示
- 添加 `flex items-center justify-center` 确保图标居中

### 2. 移除成功提示信息

#### 修改前 ❌
```tsx
{isComplete && (
  <div className="flex-1 flex items-center justify-center gap-2 text-green-600 ...">
    <svg>...</svg>
    <span>Skill created successfully!</span>
  </div>
)}
```

#### 修改后 ✅
```tsx
// 完全移除此部分
```

**原因**:
- Preview 窗口顶部已有 "Complete" 标签（绿色）
- 重复的成功提示造成视觉冗余
- 按钮本身的状态变化已提供足够反馈

### 3. 移除 Retry 按钮，改为重复点击 Generate

#### 修改前 ❌
```tsx
{!isIdle && !isStreaming && (
  <>
    <button onClick={retry} className="btn bg-amber-500 ...">
      <svg>...</svg>
      Retry
    </button>
    {isComplete && <成功提示>}
  </>
)}
```

#### 修改后 ✅
```tsx
{!isIdle && !isStreaming && (
  <button
    onClick={handleGenerate}
    className="btn bg-gradient-to-r from-purple-600 ..."
    title="Generate again"
  >
    <svg>...</svg>
  </button>
)}
```

**改进点**:
- 统一使用 Generate 按钮（闪电图标）
- 允许在 Complete 状态下重新生成
- 点击后自动清空之前的内容
- 更简洁的界面逻辑

## 按钮状态流转

### 状态机

```
┌─────────────┐
│    IDLE     │  初始状态
│  (紫色按钮)  │  图标: 闪电
└──────┬──────┘
       │ 点击
       ▼
┌─────────────┐
│  STREAMING  │  生成中
│  (红色按钮)  │  图标: 停止方块
└──────┬──────┘
       │ 完成或停止
       ▼
┌─────────────┐
│  COMPLETE   │  完成
│  (紫色按钮)  │  图标: 闪电
│  可重复点击  │
└─────────────┘
```

### 按钮显示

| 状态 | 按钮颜色 | 图标 | 功能 | 提示文本 |
|------|---------|------|------|---------|
| **IDLE** | 紫色渐变 | ⚡ 闪电 | 开始生成 | "Generate skill with AI" |
| **STREAMING** | 红色 | ⏹ 停止方块 | 停止生成 | "Stop generation" |
| **COMPLETE** | 紫色渐变 | ⚡ 闪电 | 重新生成 | "Generate again" |
| **ERROR** | 紫色渐变 | ⚡ 闪电 | 重新生成 | "Generate again" |

## 用户体验改进

### 修改前的交互流程

```
1. 输入提示词
2. 点击 "Generate" 按钮（带文字）
3. 按钮变为 "Stop"（带文字）
4. 生成完成
5. 显示 "Retry" 按钮（琥珀色）
6. 显示 "Skill created successfully!" 提示
7. 如需重新生成，点击 Retry
```

### 修改后的交互流程

```
1. 输入提示词
2. 点击 ⚡ 按钮（只有图标）
3. 按钮变为 ⏹（只有图标）
4. 生成完成，Preview 显示 "Complete" 标签
5. 如需重新生成，再次点击 ⚡ 按钮
```

### 改进优势

1. **视觉简洁** ✨
   - 减少文字干扰
   - 按钮更紧凑
   - 界面更清爽

2. **操作直观** 🎯
   - 一个按钮完成所有操作
   - 无需思考是点 Retry 还是 Generate
   - 图标含义明确

3. **反馈清晰** 💡
   - Preview 的 "Complete" 标签已足够
   - 按钮颜色变化提供状态指示
   - 无重复信息

4. **易于重复** 🔄
   - 随时可以重新生成
   - 不需要额外的 Retry 按钮
   - 流程更自然

## 技术实现

### 按钮渲染逻辑

```tsx
{/* Controls */}
<div className="flex gap-2">
  {/* IDLE 状态 */}
  {isIdle && (
    <button onClick={handleGenerate} disabled={!prompt.trim()}>
      <svg>⚡</svg>  {/* 闪电图标 */}
    </button>
  )}

  {/* STREAMING 状态 */}
  {isStreaming && (
    <button onClick={stop}>
      <svg>⏹</svg>  {/* 停止图标 */}
    </button>
  )}

  {/* COMPLETE 或 ERROR 状态 */}
  {!isIdle && !isStreaming && (
    <button onClick={handleGenerate} disabled={!prompt.trim()}>
      <svg>⚡</svg>  {/* 闪电图标 */}
    </button>
  )}
</div>
```

### 重复生成逻辑

当在 Complete 状态点击 Generate 按钮时：

```tsx
const handleGenerate = async () => {
  if (!prompt.trim()) return;
  await generate(prompt, 'new');
};
```

`generate()` 函数内部会：
1. 触发 `START_GENERATION` action
2. 重置状态（清空 content、error、toolCalls）
3. 开始新的生成流程

### 状态重置

```typescript
case 'START_GENERATION':
  return {
    ...state,
    status: 'STREAMING',
    content: '',        // 清空之前的内容
    error: null,        // 清空错误
    requestId: action.requestId,
    toolCalls: [],      // 清空调用记录
  };
```

## 相关文件

- **修改**: `src/renderer/components/AISkillCreationDialog.tsx`
- **Hook**: `src/renderer/hooks/useAIGeneration.ts`
- **类型**: `src/shared/types.ts`

## 设计决策

### 为什么移除成功提示？

1. **Preview 已有指示器**
   - 顶部显示 "Complete" 绿色标签
   - 内容已完整显示
   - 用户可以看到生成结果

2. **避免信息重复**
   - 多个成功提示造成视觉噪音
   - 按钮状态变化已提供反馈
   - 简化界面更专注

3. **符合设计原则**
   - 简约设计（Minimalism）
   - 减少认知负担
   - 一个操作一个反馈

### 为什么移除 Retry 按钮？

1. **功能重复**
   - Retry 本质是重新生成
   - Generate 按钮可以实现相同功能
   - 减少界面元素

2. **操作更直观**
   - 用户不需要区分 Retry 和 Generate
   - 一个按钮适应所有场景
   - 降低学习成本

3. **颜色一致性**
   - 琥珀色的 Retry 打破视觉统一
   - 紫色主题贯穿始终
   - 更好的视觉连贯性

### 为什么使用图标而非文字？

1. **国际化友好**
   - 图标无语言障碍
   - 减少翻译需求
   - 全球通用

2. **空间效率**
   - 图标占用空间小
   - 按钮可以更大（更易点击）
   - 界面更简洁

3. **识别速度**
   - 大脑处理图标更快
   - 颜色 + 形状双重识别
   - 提高操作效率

## 测试建议

### 测试场景 1: 首次生成
1. 输入提示词
2. 点击紫色 ⚡ 按钮
3. **预期**: 开始生成，按钮变为红色 ⏹

### 测试场景 2: 生成中停止
1. 生成进行中
2. 点击红色 ⏹ 按钮
3. **预期**: 停止生成，按钮变为紫色 ⚡

### 测试场景 3: 完成后重新生成
1. 生成完成（Preview 显示 Complete）
2. 修改提示词（可选）
3. 再次点击紫色 ⚡ 按钮
4. **预期**: 清空之前内容，开始新生成

### 测试场景 4: 错误后重试
1. 生成失败（显示错误）
2. 点击紫色 ⚡ 按钮
3. **预期**: 清空错误，重新生成

### 测试场景 5: 悬停提示
1. 鼠标悬停在按钮上
2. **预期**: 显示提示文本
   - IDLE: "Generate skill with AI"
   - STREAMING: "Stop generation"
   - COMPLETE: "Generate again"

## 可访问性

### 键盘导航
- ✅ Tab 键可以聚焦按钮
- ✅ Enter/Space 可以激活按钮
- ✅ Escape 关闭对话框

### 屏幕阅读器
- ✅ `title` 属性提供文本描述
- ✅ 图标有语义化的 SVG 结构
- ✅ 状态变化通过视觉和结构传达

### 视觉反馈
- ✅ 按钮禁用状态明显（50% 透明度）
- ✅ 颜色对比度符合 WCAG 标准
- ✅ 悬停和焦点状态清晰

## 未来改进

### 可能的增强
1. **快捷键支持** - Enter 开始生成
2. **动画效果** - 按钮状态转换动画
3. **音效反馈** - 生成完成提示音（可选）
4. **历史记录** - 保存生成历史
5. **对比模式** - 并排对比多次生成结果

## 相关文档

- [AI Generation Hook](./AI_GENERATION_HOOK.md)
- [Dialog Component](./DIALOG_COMPONENT.md)
- [Streaming Implementation](./STREAMING_IMPLEMENTATION.md)

## 更新历史

- **2026-03-18**: 初始改进
  - 按钮改为只显示图标
  - 移除成功提示信息
  - 移除 Retry 按钮，统一使用 Generate
  - 添加悬停提示
