# skillsMM 需求规格说明书

**版本**: 0.2.0  
**日期**: 2026-03-07  
**产品名称**: skillsMM - Claude Code 技能管理中心  

---

## 1. 产品概述

### 1.1 产品定位

skillsMM 是一款跨平台桌面应用，专为 Claude Code 用户设计，提供统一的本地技能管理、私有仓库同步及全网技能搜索能力。通过图形化界面，开发者可以高效地管理自己的技能库，并从社区发现、安装优质技能。产品深度集成 AI 辅助生成能力，基于 Claude Code 的 `skill-creator` 技能和 Claude Agent SDK，帮助用户快速创建和迭代技能。

### 1.2 目标用户

- **Claude Code 深度用户**：需要频繁创建、编辑、组织技能文件的开发者。
- **团队协作者**：希望通过私有 GitHub 仓库共享和维护团队内部技能库。
- **技能探索者**：希望从 GitHub 公开仓库中发现并安装 Claude Code 技能。
- **多环境开发者**：在不同项目中使用不同的技能集合，需要灵活的本地技能管理。
- **AI 辅助创作者**：希望借助 AI 快速生成或优化技能内容，提升效率。

### 1.3 解决的核心问题

| 痛点 | skillsMM 的解决方案 |
|------|----------------------|
| Claude Code 技能分散在项目目录和全局目录，管理不便 | 统一界面扫描并管理所有本地技能 |
| 团队内部技能无法便捷共享 | 支持连接私有 GitHub 仓库，一键同步技能 |
| 难以发现社区优质技能 | 集成 GitHub 搜索，快速筛选包含技能的仓库并安装 |
| 技能创建、编辑缺乏效率工具 | 提供内置编辑器，支持快速新建、修改技能文件 |
| 从零编写技能耗时费力 | 集成 AI 辅助生成，基于 Claude Agent SDK 调用 `skill-creator` 技能，根据需求自动生成或修改技能内容，支持流式响应，所见即所得 |

---

## 2. 核心概念

### 2.1 Skill（技能）

**定义**: 一个包含 `SKILL.md` 文件的目录，遵循 [Agent Skills 规范](https://agentskills.io/specification)。

**目录结构**:
```
skill-directory/
├── SKILL.md              # 必需，包含 YAML frontmatter
├── examples.md           # 可选，示例文件
├── prompts/              # 可选，子目录
│   └── coding.md
└── .skillsyoga-source.json  # 元数据（自动生成）
```

**SKILL.md 格式**:
```markdown
---
name: React Best Practices
description: Guidelines for writing clean React code
---

# React Best Practices

[技能内容...]
```

**关键属性**:
- `id`: 唯一标识符，格式为 `{toolId}:{dirName}`
- `name`: 从 frontmatter 或第一个 `#` 标题提取
- `description`: 从 frontmatter 或第一段正文提取
- `path`: 技能目录的绝对路径
- `source`: 所属工具 ID
- `enabledFor`: 启用此技能的工具列表
- `githubRepoUrl`: GitHub 来源 URL（用于更新）

### 2.2 本地技能目录

skillsMM 管理两类本地技能目录：
- **项目 skills 目录**: 用户指定的项目根目录下的 `skills/` 文件夹（或自定义路径）
- **Cloud Code 全局目录**: Claude Code 默认的全局技能目录（通常为 `~/.claude/skills/`）

### 2.3 私有 GitHub 仓库

用户配置的私有 GitHub 仓库，包含一个或多个 skills（可位于仓库任意层级）。skillsMM 通过 PAT 访问并拉取技能到本地。

### 2.4 公开技能源

**定义**: 精选的 GitHub 仓库，提供可安装的技能集合。

**关键属性**:
- `id`: 源唯一标识符
- `name`: 源显示名称
- `repoUrl`: GitHub 仓库 URL
- `description`: 源描述
- `tags`: 标签数组

**精选源列表**:
- `cc-plugins`: Claude Code Plugins + Skills
- `composio`: Awesome Claude Skills (Composio)
- `antigravity-awesome`: Antigravity Awesome Skills

---

## 3. 功能需求

### 3.1 启动与初始化

**用户故事**: 作为新用户，我希望首次启动时快速选择或创建项目技能目录，以便开始管理技能。

**功能描述**:
- 应用首次启动时，弹出目录选择对话框：
  - 选择现有目录作为项目技能根目录
  - 或创建新目录
- 自动检测是否为Claude项目目录，判断目录下是否有一个“.claude”目录存在，若不存在则提示用户选择Claude项目目录
- 保存配置到本地 JSON 文件

**验收标准**:
- [ ] 首次启动强制选择/创建项目目录
- [ ] 配置保存后立即生效，并开始扫描本地技能

### 3.2 本地技能管理

#### 3.2.1 查看本地技能

**用户故事**: 作为日常用户，我希望在一个界面中看到所有本地技能（项目目录 一般在项目目录下的/ .claude/skills/ + 全局目录 一般为用户目录下的 \.claude\skills），并能快速定位。

**功能描述**:
- 侧边栏点击“本地管理”，主内容区以列表形式展示技能
- 每项技能显示名称、描述、来源（项目/全局）、最后修改时间
- 支持按来源、名称筛选
- 自动实时扫描目录变化，技能列表动态更新

**验收标准**:
- [ ] 启动时扫描耗时 ≤2 秒（100 个技能内）
- [ ] 文件系统变更（增/删/改）触发自动刷新
- [ ] 列表支持排序（按名称、时间）

#### 3.2.2 创建技能

**用户故事**: 作为技能创作者，我希望快速创建一个新的技能文件，无需手动创建目录和文件。

**功能描述**:
- 在本地管理页面，点击“新建技能”按钮
- 选择目标目录（项目或全局）
- 输入技能名称（自动生成文件名 slug）
- 系统自动生成包含 frontmatter 模板的skills文件，并打开编辑器

**验收标准**:
- [ ] 文件名生成规则：小写字母、数字、连字符，例如 `react-best-practices.skill`
- [ ] 自动填充 frontmatter 的 name 和 description 占位符
- [ ] 创建后技能立即出现在列表中

#### 3.2.3 编辑技能

**用户故事**: 作为技能维护者，我希望能够编辑技能内容，包括元数据和正文，并借助 AI 辅助生成或修改内容。

**功能描述**:
- 点击技能列表中的编辑按钮（或双击技能）
- 打开内嵌编辑器（基于 Monaco Editor），支持语法高亮、自动补全
- 编辑器上方显示技能文件路径，并提供 **AI 辅助** 按钮
- 保存时实时更新文件，并刷新列表中的元数据

**验收标准**:
- [ ] 编辑器支持 YAML frontmatter 和 Markdown 混合编辑
- [ ] 保存操作耗时 <100ms
- [ ] 若文件被外部修改，提示用户重新加载
- [ ] 编辑器内嵌 AI 辅助功能（详见 3.2.5）

#### 3.2.4 删除技能

**用户故事**: 作为技能管理者，我希望删除不再需要的技能。

**功能描述**:
- 点击技能列表中的删除按钮
- 弹出确认对话框
- 确认后将文件移至系统回收站（非永久删除）

**验收标准**:
- [ ] 删除前确认
- [ ] 使用系统回收站，可恢复
- [ ] 删除后列表立即更新

#### 3.2.5 AI 辅助技能生成与修改

**用户故事**: 作为技能创作者，我希望利用 AI 快速生成或修改技能内容，通过自然语言对话完成技能编写，提高创作效率。

**功能描述**:
- **入口**：在技能编辑器工具栏中提供 **AI 辅助** 按钮，点击后弹出 AI 辅助对话框；或在本地管理列表中对选中的技能右键选择“AI 修改”。
- **AI 辅助对话框**：
  - 包含一个多行文本输入框，用于输入需求描述（如“创建一个用于代码审查的 React 技能，包含最佳实践检查”）。
  - 提供操作模式选择：
    - **生成新技能**：基于描述生成完整的技能文件（包括 frontmatter 和正文），生成后可在编辑器中预览并保存。
    - **修改当前技能**：基于当前编辑器内容，根据描述进行修改（如添加示例、优化措辞、补充 frontmatter 字段）。
    - **插入到光标处**：将生成的内容插入到编辑器当前光标位置。
    - **替换选中内容**：用生成的内容替换编辑器中已选中的文本。
  - 支持流式响应：AI 生成的内容逐字显示在对话框的预览区域，用户可随时停止生成。
  - 提供“应用”按钮，将最终生成的内容按所选模式应用到编辑器中；提供“重新生成”按钮，基于相同描述再次请求。
- **技术实现**：
  - 后端通过 Claude Agent SDK 调用 `skill-creator` 技能，该技能专为生成和修改 Claude Code 技能而优化。
  - 请求参数包含：用户描述、当前技能内容（若修改模式）、操作模式等。
  - 支持流式传输：后端通过 Server-Sent Events 或 WebSocket 将生成内容分块推送到前端，前端实时渲染。
  - 超时处理：若生成时间超过 30 秒，提示用户可选择继续等待或取消。
- **设置**：可在设置中配置 AI 服务提供商（默认使用 Anthropic Claude）、API Key、模型（如 `claude-3-sonnet-20240229`）以及 `skill-creator` 技能版本。

**验收标准**:
- [ ] AI 生成的技能内容格式正确，包含有效的 YAML frontmatter 和 Markdown 正文。
- [ ] 生成时间 ≤5 秒（普通网络条件），流式响应每 200ms 至少推送一次内容。
- [ ] 支持基于现有内容进行修改（如增加示例、优化描述），修改后保留原内容结构。
- [ ] 对话框提供停止生成按钮，可中断流式响应。
- [ ] API Key 加密存储，测试连接功能有效。
- [ ] 支持多种模型选择，并能正确调用 `skill-creator` 技能。

### 3.3 全网技能搜索

#### 3.3.1 搜索公开技能

**用户故事**: 作为技能探索者，我希望在公开的 GitHub 技能源找到可用的技能。

**功能描述**:
- 侧边栏点击“全网搜索”，主内容区显示搜索框和结果列表
- 输入关键词，触发 GitHub 代码搜索 API，筛选包含 `.skill` 文件的仓库
- 结果展示：仓库名称、描述、更新时间、包含的技能文件数
- 支持按更新时间排序

**验收标准**:
- [ ] 搜索防抖 500ms
- [ ] API 超时 ≤5 秒，失败时显示错误提示
- [ ] 分页加载，每页 20 条

#### 3.3.2 预览技能内容

**用户故事**: 在安装前，我希望预览技能的具体内容，以决定是否安装。

**功能描述**:
- 点击搜索结果中的技能文件，弹出预览窗口
- 预览窗口显示技能文件内容（只读模式）
- 提供“安装”按钮

**验收标准**:
- [ ] 预览内容来自 GitHub 原始文件，无需下载整个仓库
- [ ] 预览窗口可关闭

#### 3.3.3 安装技能

**用户故事**: 当我找到满意的技能后，我希望一键安装到本地项目目录或全局目录。

**功能描述**:
- 在预览窗口或结果列表中点击“安装”
- 弹出安装选项：
  - 选择目标目录（项目/全局/指定子目录）
  - 若同名技能已存在，提示“覆盖”或“重命名”
- 下载技能文件并保存到指定位置
- 安装完成后刷新本地列表

**验收标准**:
- [ ] 使用 `fetch` 或 `git clone --depth 1` 获取文件（根据文件大小选择最优方式）
- [ ] 下载进度提示
- [ ] 同名冲突处理：覆盖或自动重命名（加时间戳后缀）
- [ ] 安装成功后显示 Toast 通知

### 3.4 私有仓库管理

#### 3.4.1 配置私有仓库

**用户故事**: 作为团队开发者，我希望配置私有 GitHub 仓库，以便同步团队内部的技能。

**功能描述**:
- 在设置页面，输入私有仓库 URL（如 `https://github.com/org/team-skills`）
- 输入 GitHub Personal Access Token（PAT），具有读取仓库权限
- 点击“测试连接”验证仓库可访问性
- 保存配置

**验收标准**:
- [ ] PAT 输入时掩码显示，本地加密存储（如使用 Electron 的 safeStorage）
- [ ] 测试连接成功/失败有明确提示
- [ ] 支持配置多个私有仓库（列表形式）

#### 3.4.2 查看私有仓库技能

**用户故事**: 配置完成后，我希望浏览私有仓库中的所有技能，并选择安装。

**功能描述**:
- 侧边栏点击“私有仓库”，显示已配置的仓库列表
- 点击某个仓库，展示该仓库内所有 `.skill` 文件（递归扫描）
- 每个技能项显示名称、路径、最后提交时间
- 支持手动刷新同步（重新扫描仓库）

**验收标准**:
- [ ] 技能列表来自仓库的最新 commit
- [ ] 若仓库较大，扫描时间 ≤5 秒，显示加载动画
- [ ] 支持按文件名过滤

#### 3.4.3 安装私有技能

**用户故事**: 从私有仓库找到需要的技能后，我希望安装到本地。

**功能描述**:
- 在私有仓库技能列表中，点击技能的“安装”按钮
- 选择本地目标目录（项目/全局）
- 处理同名冲突（同 3.3.3）
- 下载并保存文件
- 刷新本地列表

**验收标准**:
- [ ] 安装过程与全网搜索安装一致
- [ ] 文件保存后，在本地列表中标记来源为私有仓库（便于后续更新）

#### 3.4.4 更新已安装的私有技能

**用户故事**: 私有仓库中的技能更新后，我希望一键更新本地对应的技能。

**功能描述**:
- 在本地管理页面，对来源为私有仓库的技能，显示“更新可用”标记（通过对比本地文件与远程 commit）
- 点击“更新”按钮，从仓库拉取最新版本覆盖本地
- 更新前提示确认

**验收标准**:
- [ ] 更新检测：定期或在手动刷新时对比 commit hash
- [ ] 覆盖前备份原文件（可选）
- [ ] 更新后技能内容刷新

### 3.5 设置

#### 3.5.1 账号与权限

- **GitHub PAT 管理**：输入、测试、保存 PAT，支持多个 Token（用于不同仓库）
- **私有仓库列表**：增删改查私有仓库配置

#### 3.5.2 功能设置

- **默认安装目录**：设置技能默认安装到项目目录还是全局目录
- **编辑器默认模式**：设置双击技能时默认打开编辑模式还是预览模式
- **AI 辅助设置**：
  - AI 服务提供商：选择 `Anthropic Claude`（默认）或兼容 OpenAI API 的服务。
  - API Key：输入并加密存储，支持测试连接。
  - 模型选择：下拉列表，从提供商支持的模型中选取（如 `claude-3-sonnet-20240229`、`claude-3-opus` 等）。
  - `skill-creator` 技能版本：可选（默认最新），用于指定调用的技能版本。
  - 流式响应开关：开启后 AI 生成内容实时显示，关闭则一次性返回。
- **自动刷新**：开启/关闭本地目录的实时监控

#### 3.5.3 数据管理

- **清除本地缓存**：清理 GitHub API 请求缓存、技能列表缓存
- **导出本地技能列表**：生成包含所有技能元数据的 JSON 文件，便于备份或分享
- **重置所有配置**：清除所有设置，恢复到初始状态

#### 3.5.4 关于

- 显示应用版本、更新日志、反馈链接

---

## 4. 非功能需求

### 4.1 性能要求

| 指标 | 目标 |
|------|------|
| 应用启动时间 | < 3 秒 |
| 本地技能列表首次加载 | ≤2 秒（500 个技能内） |
| GitHub API 请求超时 | ≤5 秒 |
| 文件保存延迟 | < 100ms |
| AI 生成响应时间（首字返回） | ≤2 秒 |
| AI 生成完整内容时间 | ≤5 秒（普通复杂度） |
| 内存占用 | < 300 MB |
| CPU 使用率（空闲） | < 5% |

### 4.2 安全性要求

- **PAT 存储**：使用 Electron 的 `safeStorage` 加密存储，或操作系统凭据管理器
- **路径遍历防护**：所有文件操作必须验证路径在授权目录内（项目/全局目录）
- **GitHub 请求**：仅使用 HTTPS，不发送敏感信息到第三方
- **删除操作**：使用系统回收站，避免永久删除
- **AI 请求**：API Key 加密存储，请求通过 HTTPS 发送，不记录用户输入内容（除非用户同意用于改进）

### 4.3 可用性要求

- **即时反馈**：所有操作提供加载状态、成功/失败 Toast 提示
- **错误提示**：明确的错误信息，指导用户解决问题（如“PAT 无效”、“网络超时”）
- **键盘快捷键**：常用操作支持快捷键（如刷新列表、新建技能、AI 生成）
- **一致性**：界面元素、操作流程保持统一
- **国际化**：支持中文/英文界面（后续版本）

### 4.4 兼容性要求

- **操作系统**：Windows 10/11，macOS 12+，Linux (Ubuntu 20.04+)
- **分辨率**：最小窗口 1024x768，支持缩放
- **Claude Code 版本**：兼容 Claude Code 最新版（技能目录结构稳定）

### 4.5 可维护性要求

- **模块化**：前端、后端服务职责分离，IPC 接口清晰
- **代码规范**：TypeScript + ESLint，Python 使用 Black
- **日志**：记录关键操作和错误，便于排查
- **自动化测试**：核心逻辑单元测试覆盖率 ≥70%

---

## 5. 用户界面设计

### 5.1 布局结构

```
┌─────────────────────────────────────────────────┐
│ 标题栏 (窗口控制 + 标题)                         │
├──────────┬──────────────────────────────────────┤
│ 侧边栏   │ 主内容区                              │
│ (200px)  │ (padding: 24px)                      │
│          │  - 搜索/筛选栏（按页面变化）          │
│ - 本地管理│  - 内容列表（卡片或表格）            │
│ - 全网搜索│                                      │
│ - 私有仓库│                                      │
│ - 设置    │                                      │
└──────────┴──────────────────────────────────────┘
```

### 5.2 主要视图

#### 5.2.1 本地管理视图

- **工具栏**：新建技能、AI 生成、刷新、筛选（来源、名称）
- **技能列表**：卡片布局，每张卡片包含：
  - 技能名称（加粗）
  - 描述（截断）
  - 来源标签（项目/全局，颜色区分）
  - 最后修改时间
  - 操作按钮：编辑、删除、更新（若可更新）、AI 修改（右键菜单）
- **空状态**：无技能时显示引导文案和“新建技能”、“AI 生成”按钮

#### 5.2.2 全网搜索视图

- **搜索框**：居中，带搜索图标
- **结果列表**：列表布局，每项包含：
  - 仓库名称（带链接，可点击跳转 GitHub）
  - 仓库描述
  - 包含的技能文件列表（缩略）
  - “安装”按钮（点击展开选择目录）
- **分页**：底部显示页码

#### 5.2.3 私有仓库视图

- **仓库选择器**：下拉选择已配置的私有仓库（若无则跳转设置）
- **技能列表**：同本地管理卡片，但操作仅为“安装”
- **刷新按钮**：手动重新扫描仓库

#### 5.2.4 设置视图

- **左侧导航**：账号与权限、功能设置、数据管理、关于
- **右侧表单**：对应配置项，输入框、按钮、开关等

### 5.3 对话框

- **技能编辑器对话框**：内嵌 Monaco Editor，顶部显示文件路径和保存按钮，底部提供 **AI 辅助** 按钮
- **AI 辅助对话框**：输入需求描述，选择操作模式，实时流式显示生成内容，底部有“应用”、“重新生成”、“取消”按钮
- **安装确认对话框**：选择目标目录、处理冲突选项
- **新建技能对话框**：输入名称、选择目录
- **确认删除对话框**：提示“确定将文件移至回收站？”

### 5.4 主题

- **默认主题**：暗色主题，符合开发者习惯
- **配色**：基于 Tailwind CSS 的语义化颜色变量（primary、secondary、danger 等）

---

## 6. 数据模型

### 6.1 本地配置 (config.json)

```json
{
  "projectSkillDir": "/path/to/project/skills",
  "globalSkillDir": "/Users/username/.claude/skills",
  "githubTokens": [
    {
      "id": "token-uuid",
      "name": "个人令牌",
      "token": "encrypted:xxx"
    }
  ],
  "privateRepos": [
    {
      "id": "repo-uuid",
      "url": "https://github.com/org/team-skills",
      "tokenId": "关联的token id",
      "lastSync": "2026-03-07T10:00:00Z"
    }
  ],
  "defaultInstallTarget": "project",
  "editorDefaultMode": "edit",
  "aiConfig": {
    "provider": "anthropic",
    "apiKey": "encrypted:xxx",
    "model": "claude-3-sonnet-20240229",
    "skillCreatorVersion": "latest",
    "streamResponse": true
  },
  "autoRefresh": true
}
```

### 6.2 技能元数据 (内存对象)

```typescript
interface Skill {
  id: string;               // 文件路径的哈希或唯一ID
  name: string;
  description: string;
  path: string;             // 绝对路径
  source: 'project' | 'global' | 'private' | 'public';
  sourceRepoUrl?: string;   // 若来自私有/公开仓库
  modifiedAt: string;       // ISO 时间
  fileSize: number;
}
```

### 6.3 搜索结果项

```typescript
interface SearchResult {
  repoFullName: string;     // owner/name
  repoUrl: string;
  description: string;
  updatedAt: string;
  skillFiles: {
    path: string;           // 仓库内路径
    name: string;
    downloadUrl: string;
  }[];
}
```

### 6.4 私有仓库技能项

```typescript
interface PrivateRepoSkill {
  repoId: string;
  repoName: string;
  filePath: string;         // 仓库内路径
  name: string;             // 从 frontmatter 提取或文件名
  description: string;
  downloadUrl: string;
  sha: string;              // 文件blob的SHA，用于检测更新
}
```

---

## 7. 接口规范

### 7.1 前端-后端 IPC 命令

后端服务（Node.js/Express + Python）提供 REST API 或 WebSocket，但考虑到 Electron 架构，我们使用 IPC（主进程与渲染进程通信）。以下为关键 IPC 事件：

| 事件名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `scan-local-skills` | `{projectDir, globalDir}` | `Skill[]` | 扫描本地技能 |
| `create-skill` | `{name, targetDir}` | `{path, skill}` | 创建技能文件 |
| `read-skill-file` | `path` | `string` | 读取技能内容 |
| `write-skill-file` | `{path, content}` | `boolean` | 写入技能内容 |
| `delete-skill` | `path` | `boolean` | 删除技能（移至回收站） |
| `search-github` | `{query, page}` | `SearchResult[]` | 调用 GitHub 搜索 |
| `fetch-skill-content` | `{downloadUrl}` | `string` | 获取远程技能内容 |
| `install-skill` | `{downloadUrl, targetDir, filename, conflictAction}` | `{path}` | 安装技能 |
| `get-private-repo-skills` | `{repoId}` | `PrivateRepoSkill[]` | 获取私有仓库技能列表 |
| `check-skill-update` | `{localPath, remoteSha}` | `boolean` | 检查是否有更新 |
| `update-skill` | `{localPath, downloadUrl}` | `boolean` | 更新技能 |
| `test-pat` | `{token, repoUrl}` | `{success, message}` | 测试 PAT 有效性 |
| `save-config` | `{config}` | `void` | 保存配置 |
| `get-config` | - | `Config` | 获取配置 |
| `clear-cache` | - | `void` | 清除缓存 |
| `export-skills` | - | `{filePath}` | 导出技能列表 JSON |
| `ai-generate-stream` | `{prompt, context, mode}` | 流式事件 | 启动 AI 流式生成，通过 `ai-chunk` 和 `ai-end` 事件返回 |
| `ai-chunk` | `{chunk, done}` | - | 由主进程向渲染进程发送的生成内容片段 |
| `ai-end` | `{fullContent}` | - | AI 生成完成事件 |
| `stop-ai-generation` | - | `void` | 停止当前 AI 生成任务 |
| `test-ai-connection` | `{apiKey, provider, model}` | `{success, message}` | 测试 AI 服务连通性 |

### 7.2 外部 API

#### GitHub REST API v3

- **搜索代码**：`GET /search/code?q=extension:skill+repo:owner/name`（搜索指定仓库，但更常用全局搜索）
- **获取文件内容**：`GET /repos/{owner}/{repo}/contents/{path}`
- **获取提交信息**：`GET /repos/{owner}/{repo}/commits?path={path}`

使用 PAT 进行认证，请求头 `Authorization: token xxx`。

#### Claude Agent SDK (AI 服务)

- **调用 `skill-creator` 技能**：通过 Claude Agent SDK 提供的接口，传递用户描述和上下文，获取流式或一次性响应。
- 请求格式：遵循 SDK 规范，通常包含 `prompt`、`system` 指令（指导生成技能格式）、`stream` 选项。
- 响应：若启用流式，通过 Server-Sent Events 返回内容块。

---

## 8. 业务规则

### 8.1 技能命名规则

- 文件名必须为 `*.skill`，建议使用 kebab-case（如 `my-awesome-skill.skill`）
- 同一目录下不允许同名文件（不区分大小写）

### 8.2 冲突处理

安装技能时，若目标目录已存在同名文件，用户可选择：
- **覆盖**：用新文件替换旧文件
- **重命名**：新文件自动重命名为 `{原名}-{时间戳}.skill`
- **跳过**：不安装该文件

### 8.3 私有仓库同步

- 每次进入私有仓库视图时，自动拉取最新文件列表（缓存 5 分钟）
- 手动刷新强制重新扫描
- 检测更新：对比本地文件的 `sha` 与远程文件的 `sha`

### 8.4 AI 生成规则

- 生成的技能内容必须包含有效的 YAML frontmatter 和 Markdown 正文。
- 若用户指定了技能名称（通过输入或编辑器中已有），AI 应将其填入 frontmatter 的 `name` 字段；若未指定，根据描述智能生成。
- 生成的描述建议简洁，不超过 200 字符。
- 支持在现有文件中插入/替换内容（需用户确认）。
- 生成的代码示例应使用标准 Markdown 代码块。
- 使用 `skill-creator` 技能时，需传递系统提示词，指导 AI 遵循 Agent Skills 规范。
- 流式响应时，前端需逐步渲染，允许用户中途停止。
- 若生成内容不符合预期，用户可点击“重新生成”再次请求。

### 8.5 安全限制

- 只允许操作配置的项目目录和全局目录，禁止遍历系统其他路径
- GitHub 下载 URL 必须来自 `raw.githubusercontent.com` 或 `api.github.com`
- AI 请求仅通过后端代理发送，前端不直接暴露 API Key

---

## 9. 未来规划

### 9.1 短期规划 (v0.2.x)

- [x] **AI 辅助技能生成**：已纳入当前版本（v0.2.0），详见 3.2.5。
- [ ] 支持技能分类和标签管理
- [ ] 技能批量安装/导出
- [ ] 编辑器增加语法校验和预览
- [ ] 支持 Git 操作（提交到私有仓库）

### 9.2 中期规划 (v0.3.x)

- [ ] 多项目切换（管理多个项目的 skills 目录）
- [ ] 技能依赖关系管理
- [ ] 团队协作功能（共享技能列表）
- [ ] 插件系统（扩展支持其他 AI 工具）

### 9.3 长期规划 (v1.0)

- [ ] 云同步（官方账户同步技能）
- [ ] AI 辅助技能优化建议
- [ ] 技能市场评分、评论
- [ ] 与 IDE 集成（如 VS Code 插件）

---

## 10. 附录

### 10.1 术语表

| 术语 | 定义 |
|------|------|
| PAT | Personal Access Token，GitHub 个人访问令牌 |
| 项目目录 | 用户指定的项目根目录，其下的 `skills/` 用于存放项目专属技能 |
| 全局目录 | Claude Code 的全局技能目录，通常位于用户主目录下 |
| 私有仓库 | 用户配置的 GitHub 私有仓库，用于团队技能共享 |
| AI 辅助生成 | 利用 Claude Agent SDK 调用 `skill-creator` 技能，根据用户需求自动生成或修改技能内容 |
| 流式响应 | AI 生成内容以流的形式逐步返回，前端实时显示，提升用户体验 |

### 10.2 参考资源

- [Claude Code 技能文档](https://docs.anthropic.com/claude-code/skills)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)
- [Anthropic API 文档](https://docs.anthropic.com/claude/reference)
- [Claude Agent SDK 文档](https://docs.anthropic.com/claude/agent-sdk)

### 10.3 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 0.1.0 | 2026-03-07 | 初始版本 |
| 0.2.0 | 2026-03-07 | 增加 AI 辅助技能生成功能（基于 Claude Agent SDK 和 `skill-creator` 技能，支持流式响应），调整短期规划，将 AI 功能纳入当前需求。 |

---

**文档结束**