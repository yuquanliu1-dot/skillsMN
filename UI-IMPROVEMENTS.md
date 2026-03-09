# skillsMN UI/UX 改进方案

基于 ui-ux-pro-max skill 的设计智能分析

## 设计系统

### 产品类型
- **类型**: Developer Tool / IDE
- **主要风格**: Dark Mode (OLED) + Minimalism
- **次要风格**: Flat Design
- **参考**: VS Code, JetBrains IDEs

### 色彩系统 (Developer Tools Dark Mode)

```javascript
colors: {
  // 品牌色
  primary: {
    DEFAULT: '#3B82F6',  // Blue-500 - 主要交互
    light: '#60A5FA',    // Blue-400 - Hover states
    dark: '#2563EB',     // Blue-600 - Active/CTA
  },

  // 背景色 (OLED 优化)
  background: {
    DEFAULT: '#0F172A',  // Slate-900 - 主背景
    secondary: '#1E293B', // Slate-800 - 卡片/面板
    tertiary: '#334155',  // Slate-700 - 悬浮/选中
  },

  // 文本色
  text: {
    primary: '#F1F5F9',    // Slate-50 - 主要文本
    secondary: '#CBD5E1',  // Slate-300 - 次要文本
    muted: '#94A3B8',      // Slate-400 - 提示文本
    disabled: '#64748B',   // Slate-500 - 禁用文本
  },

  // 边框色
  border: {
    DEFAULT: '#334155',   // Slate-700 - 默认边框
    light: '#475569',     // Slate-600 - 高亮边框
    focus: '#3B82F6',     // Blue-500 - Focus 边框
  },

  // 状态色
  success: '#10B981',  // Green-500
  warning: '#F59E0B',  // Amber-500
  error: '#EF4444',    // Red-500
  info: '#3B82F6',     // Blue-500
}
```

### 字体系统 (Developer Mono)

```javascript
fontFamily: {
  sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace'],
}

fontSize: {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
}
```

### 间距系统

```javascript
spacing: {
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
}
```

## 组件改进

### 1. SkillCard 改进

**当前问题:**
- 缺少视觉层次
- Hover 状态不明显
- 间距不够合理
- 缺少阴影和深度

**改进方案:**
```css
/* 改进后的卡片 */
.skill-card {
  /* 基础样式 */
  background: #1E293B;           /* Slate-800 */
  border: 1px solid #334155;     /* Slate-700 */
  border-radius: 12px;           /* 更圆润 */
  padding: 20px;                 /* 更多呼吸空间 */

  /* 阴影和深度 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

  /* 交互 */
  cursor: pointer;
  transition: all 0.2s ease-out;  /* 平滑过渡 */

  /* Hover 效果 */
  &:hover {
    background: #334155;          /* Slate-700 */
    border-color: #475569;        /* Slate-600 */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);  /* 轻微上浮 */
  }

  /* Focus 效果 */
  &:focus-visible {
    outline: none;
    ring: 2px solid #3B82F6;
    ring-offset: 2px;
    ring-offset-color: #0F172A;
  }
}
```

### 2. 按钮系统改进

**改进方案:**
```css
/* 主要按钮 */
.btn-primary {
  background: #3B82F6;           /* Blue-500 */
  color: #F1F5F9;                /* Slate-50 */
  padding: 10px 20px;            /* 更舒适的点击区域 */
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease-out;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #2563EB;         /* Blue-600 */
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* 次要按钮 */
.btn-secondary {
  background: transparent;
  color: #CBD5E1;                /* Slate-300 */
  border: 1px solid #334155;     /* Slate-700 */

  &:hover:not(:disabled) {
    background: #1E293B;         /* Slate-800 */
    border-color: #475569;       /* Slate-600 */
  }
}

/* 危险按钮 */
.btn-danger {
  background: #EF4444;           /* Red-500 */

  &:hover:not(:disabled) {
    background: #DC2626;         /* Red-600 */
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
}
```

### 3. Badge 系统改进

**改进方案:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.025em;
}

.badge-project {
  background: rgba(59, 130, 246, 0.15);   /* Blue-500 with low opacity */
  color: #60A5FA;                          /* Blue-400 */
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.badge-global {
  background: rgba(168, 85, 247, 0.15);   /* Purple-500 with low opacity */
  color: #C084FC;                          /* Purple-400 */
  border: 1px solid rgba(168, 85, 247, 0.3);
}
```

### 4. 输入框改进

**改进方案:**
```css
.input {
  width: 100%;
  padding: 10px 14px;
  background: #0F172A;           /* Slate-900 - 更深 */
  border: 1px solid #334155;     /* Slate-700 */
  border-radius: 8px;
  color: #F1F5F9;                /* Slate-50 */
  font-size: 14px;
  transition: all 0.2s ease-out;

  &::placeholder {
    color: #64748B;              /* Slate-500 */
  }

  &:hover {
    border-color: #475569;       /* Slate-600 */
  }

  &:focus {
    outline: none;
    border-color: #3B82F6;       /* Blue-500 */
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}
```

### 5. Dialog/Modal 改进

**改进方案:**
```css
.dialog-overlay {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.dialog-content {
  background: #1E293B;           /* Slate-800 */
  border: 1px solid #334155;     /* Slate-700 */
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  /* 入场动画 */
  animation: dialog-enter 0.2s ease-out;
}

@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

## 交互改进

### 1. 过渡动画

```css
/* 标准过渡 */
.transition-standard {
  transition: all 0.2s ease-out;
}

/* 快速过渡 */
.transition-fast {
  transition: all 0.15s ease-out;
}

/* 慢速过渡 */
.transition-slow {
  transition: all 0.3s ease-out;
}
```

### 2. 无障碍支持

```css
/* 尊重用户的动画偏好 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus 可见性 */
.focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

### 3. 加载状态

```css
/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(
    90deg,
    #1E293B 0%,
    #334155 50%,
    #1E293B 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## 布局改进

### 1. 页面布局

```css
/* 主容器 */
.app-container {
  min-height: 100vh;
  background: #0F172A;
  color: #F1F5F9;
}

/* 内容区域 */
.content-area {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* 网格布局 */
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
```

### 2. 头部导航

```css
.header {
  background: rgba(15, 23, 42, 0.8);  /* Slate-900 with opacity */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #334155;
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

## 图标规范

### 1. 图标使用规则

- **禁止使用 emoji** 作为图标 (🚫 🎨 ⚙️)
- **使用 SVG 图标** (Heroicons, Lucide, Phosphor)
- **统一尺寸**: 16px (w-4 h-4), 20px (w-5 h-5), 24px (w-6 h-6)
- **统一样式**: outline 或 solid,不要混用

### 2. 图标颜色

```css
.icon-primary {
  color: #3B82F6;  /* Blue-500 */
}

.icon-secondary {
  color: #94A3B8;  /* Slate-400 */
}

.icon-success {
  color: #10B981;  /* Green-500 */
}

.icon-danger {
  color: #EF4444;  /* Red-500 */
}
```

## 响应式设计

### 断点系统

```javascript
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}
```

## 实施优先级

### Phase 1: 基础系统 (高优先级)
1. ✅ 更新 Tailwind 配置 (色彩、字体、间距)
2. ✅ 改进全局样式 (scrollbar, 基础排版)
3. ✅ 创建设计 tokens

### Phase 2: 核心组件 (高优先级)
1. ⬜ 改进 SkillCard 组件
2. ⬜ 改进按钮系统
3. ⬜ 改进输入框样式
4. ⬜ 改进 Badge 样式

### Phase 3: 对话框和布局 (中优先级)
1. ⬜ 改进 Dialog/Modal 样式
2. ⬜ 改进页面布局
3. ⬜ 改进头部导航

### Phase 4: 交互和动画 (中优先级)
1. ⬜ 添加过渡动画
2. ⬜ 添加加载状态
3. ⬜ 优化 hover 效果

### Phase 5: 图标和细节 (低优先级)
1. ⬜ 替换 emoji 为 SVG 图标
2. ⬜ 优化图标样式
3. ⬜ 添加无障碍支持

## 测试检查清单

### 视觉质量
- [ ] 无 emoji 图标
- [ ] 所有图标来自统一的图标库
- [ ] Hover 状态不引起布局偏移
- [ ] 使用主题色彩

### 交互
- [ ] 所有可点击元素有 cursor-pointer
- [ ] Hover 状态提供清晰的视觉反馈
- [ ] 过渡平滑 (150-300ms)
- [ ] Focus 状态可见

### Dark Mode
- [ ] 文本对比度足够 (4.5:1 最低)
- [ ] 边框在深色背景上可见
- [ ] 半透明元素可见

### 布局
- [ ] 响应式在 640px, 768px, 1024px, 1280px
- [ ] 无水平滚动
- [ ] 内容不被固定元素遮挡

### 无障碍
- [ ] 所有图片有 alt 文本
- [ ] 表单输入有标签
- [ ] prefers-reduced-motion 被尊重
