# SkillsMN 项目长期记忆

## 项目定位
Claude Code 本地 Skill 管理桌面应用（Electron + React + TypeScript）。

## 核心技术栈
- 桌面框架：Electron 35.7.5
- 前端：React 18 + Tailwind CSS 3.4 + Monaco Editor
- 语言：TypeScript 5.3 (strict mode)
- 构建：Vite（渲染层）+ tsc（主进程）
- AI：@anthropic-ai/claude-agent-sdk 0.2.74
- 测试：Jest（单元/集成）+ Playwright（E2E，P0/P1/P2 分级）
- 国际化：i18next + react-i18next

## 架构要点
- 典型 Electron 双进程架构：主进程（Node.js）+ 渲染进程（浏览器）
- 安全桥接：contextBridge + contextIsolation，preload.ts 暴露 electronAPI
- IPC 模块：12 个 Handler（skillHandlers/aiHandlers/gitHubHandlers 等）
- 主进程 Services：17 个（SkillService 最重，AIService 集成 Claude SDK）
- 状态管理：React useReducer（全局 AppContext）+ 大量 useState
- 共享类型：src/shared/types.ts 双进程共用

## 技能存储
- 技能以目录形式存储，每目录含 SKILL.md + 附属文件
- 集中存放于 applicationSkillsDirectory（默认 .claude/skills/）
- 支持 symlink 模式（不复制文件）

## 已知关注点（2026-04-07）
- App.tsx 承担 25+ useState，可考虑拆分 Context
- SkillService 职责过重（扫描/读写/删除/版本管理）
- 各 Service 各自处理 proxy/retry，缺少统一 HTTP 客户端抽象
