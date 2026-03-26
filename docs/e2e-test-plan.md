# skillsMN E2E 测试计划

> 全面使用 Playwright 进行端到端测试
> 最后更新: 2026-03-26

## 1. 测试策略概述

### 1.1 目标

- 确保核心功能稳定可靠
- 覆盖所有关键用户流程
- 及早发现回归问题
- 支持持续集成/持续部署 (CI/CD)

### 1.2 测试原则

1. **优先级驱动**: P0 > P1 > P2，确保核心功能优先测试
2. **独立性**: 每个测试用例独立运行，互不依赖
3. **可重复性**: 测试结果一致，支持多次运行
4. **快速反馈**: 优化测试执行时间，快速发现问题

### 1.3 测试范围

| 范围 | 包含 | 不包含 |
|------|------|--------|
| 功能测试 | 所有用户可操作功能 | 内部实现细节 |
| UI测试 | 界面交互、样式 | 像素级对比 |
| 集成测试 | Electron主进程与渲染进程 | 外部服务（通过Mock） |
| 性能测试 | 响应时间、加载速度 | 压力测试 |

---

## 2. 测试优先级定义

### P0 - 关键路径 (Smoke Tests)
- 应用启动和基本导航
- 核心CRUD操作
- 必须在每次提交前通过

### P1 - 重要功能
- AI集成功能
- 设置和配置
- 私有仓库管理
- 每日构建验证

### P2 - 边界情况
- 错误处理
- 异常场景
- 性能边界
- 发布前完整验证

---

## 3. 测试架构

### 3.1 目录结构

```
tests/e2e/
├── helpers/
│   ├── page-objects/       # 页面对象模型
│   │   ├── AppPage.ts      # 基础页面
│   │   ├── SkillsPage.ts   # 技能管理页面
│   │   ├── EditorPage.ts   # 编辑器页面
│   │   ├── DiscoverPage.ts # 发现页面
│   │   ├── PrivateReposPage.ts # 私有仓库页面
│   │   └── SettingsPage.ts # 设置页面
│   ├── fixtures/           # 测试数据
│   │   ├── skills.ts       # 技能数据
│   │   └── config.ts       # 配置数据
│   ├── mocks/              # API Mock
│   │   ├── registry-api.ts # 注册表API
│   │   ├── github-api.ts   # GitHub API
│   │   └── ai-api.ts       # AI API
│   ├── index.ts            # 导出入口
│   └── test-setup.ts       # 测试设置
├── specs/                  # 测试规范
│   ├── 00-setup.spec.ts    # 环境验证
│   ├── 01-navigation.spec.ts # 导航测试
│   ├── 02-skills.spec.ts   # 技能管理
│   ├── 03-editor.spec.ts   # 编辑器
│   ├── 04-discover.spec.ts # 发现/搜索
│   ├── 05-private-repos.spec.ts # 私有仓库
│   ├── 06-ai-creation.spec.ts # AI创建
│   ├── 07-settings.spec.ts # 设置
│   ├── 08-error-handling.spec.ts # 错误处理
│   ├── 09-ai-sidebar.spec.ts # AI侧边栏
│   ├── 10-ai-permissions.spec.ts # AI权限
│   ├── 11-ai-interaction-flow.spec.ts # AI交互流
│   └── 12-new-features.spec.ts # 新功能
└── app.spec.ts             # 应用基础测试
```

### 3.2 Page Object Model

```typescript
// 页面对象基类
class AppPage {
  // 导航
  async navigateTo(view: ViewType): Promise<void>
  async openSettings(): Promise<void>
  async closeSettings(): Promise<void>

  // 通用操作
  async waitForToast(message?: string): Promise<void>
  async isLoadingVisible(): Promise<boolean>
  async pressShortcut(shortcut: string): Promise<void>

  // 状态检查
  async getCurrentView(): Promise<ViewType | null>
  async isElementVisible(testId: string): Promise<boolean>
}

// 技能页面
class SkillsPage extends AppPage {
  // CRUD
  async createSkill(name: string): Promise<void>
  async deleteSkill(name: string): Promise<void>
  async clickSkill(name: string): Promise<void>

  // 搜索和过滤
  async searchSkills(query: string): Promise<void>
  async filterSkills(filter: string): Promise<void>
  async sortSkills(sortBy: string): Promise<void>

  // 状态
  async skillExists(name: string): Promise<boolean>
  async getSkillCount(): Promise<number>
}

// 编辑器页面
class EditorPage extends AppPage {
  async waitForEditor(): Promise<void>
  async typeInEditor(content: string): Promise<void>
  async save(): Promise<void>
  async close(): Promise<void>
  async hasUnsavedChanges(): Promise<boolean>
}

// 发现页面
class DiscoverPage extends AppPage {
  async search(query: string): Promise<void>
  async getResults(): Promise<SearchResult[]>
  async clickResult(name: string): Promise<void>
  async installSkill(name: string): Promise<void>
}
```

---

## 4. 详细测试用例

### 4.1 P0 - 关键路径测试

#### 4.1.1 应用启动 (00-setup.spec.ts)

| ID | 测试用例 | 前置条件 | 步骤 | 预期结果 |
|----|----------|----------|------|----------|
| P0-001 | 应用正常启动 | Electron已安装 | 启动应用 | 窗口显示，无崩溃 |
| P0-002 | 显示侧边栏 | 应用已启动 | 检查侧边栏 | 侧边栏可见 |
| P0-003 | 显示主内容区 | 应用已启动 | 检查主内容 | 主内容区可见 |
| P0-004 | 默认显示技能视图 | 应用已启动 | 检查当前视图 | 技能列表显示 |

#### 4.1.2 导航测试 (01-navigation.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P0-010 | 导航到技能视图 | 点击Skills导航 | 显示技能列表 |
| P0-011 | 导航到发现视图 | 点击Discover导航 | 显示搜索框 |
| P0-012 | 导航到私有仓库 | 点击Private Repos导航 | 显示仓库列表 |
| P0-013 | 键盘导航 | 使用Tab键 | 焦点正确移动 |
| P0-014 | 快捷键导航 | Ctrl+1/2/3 | 切换到对应视图 |

#### 4.1.3 技能管理 (02-skills.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P0-020 | 创建技能 | 点击创建按钮，输入名称，确认 | 技能出现在列表 |
| P0-021 | 创建技能验证-空名称 | 输入空名称 | 创建按钮禁用 |
| P0-022 | 创建技能验证-非法字符 | 输入非法字符 | 显示错误提示 |
| P0-023 | 创建技能验证-重复名称 | 输入已存在名称 | 显示错误提示 |
| P0-024 | 删除技能 | 悬停技能卡片，点击删除，确认 | 技能从列表移除 |
| P0-025 | 取消删除 | 点击删除，点击取消 | 技能仍然存在 |
| P0-026 | 快捷键创建 | Ctrl+N | 打开创建对话框 |
| P0-027 | 搜索技能 | 输入搜索词 | 列表过滤 |
| P0-028 | 过滤技能 | 选择过滤器 | 列表过滤 |
| P0-029 | 排序技能 | 选择排序方式 | 列表重新排序 |

#### 4.1.4 编辑器测试 (03-editor.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P0-030 | 打开编辑器 | 点击技能卡片 | 编辑器显示 |
| P0-031 | 显示Monaco编辑器 | 打开编辑器 | Monaco编辑器可见 |
| P0-032 | 编辑内容 | 输入内容 | 内容显示在编辑器 |
| P0-033 | 保存内容 | Ctrl+S | 内容保存成功 |
| P0-034 | 关闭编辑器 | Ctrl+W | 编辑器关闭 |
| P0-035 | 未保存提示 | 编辑后关闭 | 显示未保存提示 |
| P0-036 | 显示技能名称 | 打开编辑器 | 标题显示技能名称 |

#### 4.1.5 发现/搜索 (04-discover.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P0-040 | 显示搜索框 | 导航到Discover | 搜索框可见 |
| P0-041 | 搜索技能 | 输入关键词 | 显示搜索结果 |
| P0-042 | 显示无结果 | 搜索不存在内容 | 显示无结果提示 |
| P0-043 | 清除搜索 | 清除搜索框 | 结果清除 |
| P0-044 | 查看预览 | 点击搜索结果 | 显示技能预览 |
| P0-045 | 安装技能 | 点击安装按钮 | 开始安装流程 |

### 4.2 P1 - 重要功能测试

#### 4.2.1 私有仓库 (05-private-repos.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P1-001 | 显示仓库列表 | 导航到Private Repos | 显示已配置仓库 |
| P1-002 | 添加GitHub仓库 | 添加仓库URL | 仓库添加成功 |
| P1-003 | 添加GitLab仓库 | 添加仓库URL | 仓库添加成功 |
| P1-004 | 删除仓库 | 删除仓库 | 仓库移除 |
| P1-005 | 刷新仓库 | 点击刷新 | 技能列表更新 |
| P1-006 | 查看仓库技能 | 展开仓库 | 显示技能列表 |
| P1-007 | 安装仓库技能 | 点击安装 | 技能安装成功 |

#### 4.2.2 AI技能创建 (06-ai-creation.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P1-010 | 显示AI创建按钮 | 查看技能列表 | AI按钮可见 |
| P1-011 | 打开AI对话框 | 点击AI按钮 | 对话框显示 |
| P1-012 | 输入提示词 | 输入描述 | 输入框接受内容 |
| P1-013 | 字符限制 | 输入超长内容 | 限制在2000字符 |
| P1-014 | 开始生成 | 点击生成 | 开始流式生成 |
| P1-015 | 停止生成 | 点击停止 | 生成停止 |
| P1-016 | 保存生成技能 | 点击保存 | 技能保存成功 |
| P1-017 | 显示预览 | 生成过程中 | 显示预览内容 |

#### 4.2.3 设置 (07-settings.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P1-020 | 打开设置 | 点击设置按钮 | 设置面板显示 |
| P1-021 | 关闭设置 | 点击关闭 | 设置面板关闭 |
| P1-022 | 修改编辑器主题 | 选择主题 | 主题应用 |
| P1-023 | 修改字体大小 | 调整大小 | 字体变化 |
| P1-024 | 修改Tab大小 | 调整大小 | Tab变化 |
| P1-025 | 配置AI设置 | 输入API密钥 | 配置保存 |
| P1-026 | 配置GitHub Token | 输入Token | 配置保存 |
| P1-027 | 重置设置 | 点击重置 | 恢复默认 |

#### 4.2.4 AI侧边栏 (09-ai-sidebar.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P1-030 | 打开AI侧边栏 | 点击AI按钮 | 侧边栏显示 |
| P1-031 | 发送消息 | 输入消息发送 | AI响应 |
| P1-032 | 流式响应 | 发送消息 | 流式显示响应 |
| P1-033 | 停止响应 | 点击停止 | 响应停止 |
| P1-034 | 清除对话 | 点击清除 | 对话清除 |
| P1-035 | 应用AI建议 | 点击应用 | 内容应用到编辑器 |

### 4.3 P2 - 边界情况测试

#### 4.3.1 错误处理 (08-error-handling.spec.ts)

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P2-001 | 网络错误处理 | 模拟网络失败 | 显示错误提示 |
| P2-002 | API限流处理 | 模拟限流 | 显示限流提示 |
| P2-003 | 文件权限错误 | 模拟权限不足 | 显示错误提示 |
| P2-004 | 无效YAML处理 | 加载无效YAML | 显示解析错误 |
| P2-005 | 超时处理 | 模拟超时 | 显示超时提示 |
| P2-006 | 重试机制 | 点击重试 | 重新执行操作 |
| P2-007 | 错误Toast消失 | 等待 | Toast自动消失 |
| P2-008 | XSS防护 | 输入脚本标签 | 不执行脚本 |

#### 4.3.2 性能边界

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P2-010 | 大量技能列表 | 加载1000+技能 | 虚拟滚动正常 |
| P2-011 | 大文件编辑 | 打开1MB+文件 | 编辑器响应 |
| P2-012 | 快速输入 | 快速打字 | 无延迟卡顿 |
| P2-013 | 快速导航 | 快速切换视图 | 无崩溃 |
| P2-014 | 内存使用 | 长时间运行 | 内存稳定 |

#### 4.3.3 特殊场景

| ID | 测试用例 | 步骤 | 预期结果 |
|----|----------|------|----------|
| P2-020 | 特殊字符搜索 | 输入特殊字符 | 无异常 |
| P2-021 | Unicode字符 | 输入中文/emoji | 正确显示 |
| P2-022 | 空列表状态 | 无技能时 | 显示空状态 |
| P2-023 | 离线模式 | 断开网络 | 离线功能正常 |
| P2-024 | 多窗口 | 打开多个窗口 | 独立运行 |

---

## 5. 测试数据管理

### 5.1 Fixtures

```typescript
// 技能测试数据
export const testSkills: TestSkill[] = [
  { name: 'test-basic', content: 'Basic skill content' },
  { name: 'test-complex', content: complexYamlSkillContent },
  { name: 'test-special-chars', content: specialCharsSkillContent },
];

// 配置测试数据
export const sampleConfig = {
  editor: { theme: 'vs-dark', fontSize: 14, tabSize: 2 },
  ai: { apiKey: 'test-key', model: 'claude-3' },
};

// 生成唯一技能名称
export function generateUniqueSkillName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
```

### 5.2 Mock API

```typescript
// 注册表搜索Mock
export async function mockRegistrySearch(page: Page, results: Skill[]): Promise<void>

// GitHub API Mock
export async function mockGitHubRepoContents(page: Page, files: File[]): Promise<void>

// AI生成Mock
export async function mockAIStreaming(page: Page, content: string): Promise<void>
```

---

## 6. 执行策略

### 6.1 本地开发

```bash
# 运行所有测试
npm run test:e2e

# 运行特定优先级
npm run test:e2e:p0   # 关键路径
npm run test:e2e:p1   # 重要功能
npm run test:e2e:p2   # 边界情况

# 调试模式
npm run test:e2e:debug

# UI模式
npm run test:e2e:ui

# 运行特定功能
npm run test:e2e:skills   # 技能相关
npm run test:e2e:discover # 发现相关
npm run test:e2e:ai       # AI相关
```

### 6.2 CI/CD 集成

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install

      - name: Build application
        run: npm run build

      - name: Run P0 tests
        run: npm run test:e2e:p0

      - name: Run P1 tests
        run: npm run test:e2e:p1

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### 6.3 测试报告

- **HTML报告**: `playwright-report/index.html`
- **JSON结果**: `test-results/results.json`
- **失败截图**: `test-results/artifacts/`
- **失败视频**: `test-results/artifacts/`

---

## 7. 覆盖率目标

### 7.1 功能覆盖率

| 模块 | 当前覆盖 | 目标 | 状态 |
|------|----------|------|------|
| 技能管理 | 90% | 95% | ✅ 良好 |
| 编辑器 | 85% | 90% | ✅ 良好 |
| 发现/搜索 | 75% | 85% | ⚠️ 需改进 |
| 私有仓库 | 70% | 80% | ⚠️ 需改进 |
| AI功能 | 50% | 75% | ❌ 需加强 |
| 设置 | 80% | 85% | ✅ 良好 |
| 错误处理 | 60% | 80% | ⚠️ 需改进 |

### 7.2 测试用例统计

| 优先级 | 当前数量 | 目标数量 | 完成率 |
|--------|----------|----------|--------|
| P0 | 45 | 50 | 90% |
| P1 | 35 | 50 | 70% |
| P2 | 25 | 40 | 62.5% |
| **总计** | **105** | **140** | **75%** |

---

## 8. 持续改进

### 8.1 待完成测试

1. **AI功能增强**
   - [ ] 完整的AI生成流程测试
   - [ ] AI流式响应测试
   - [ ] AI错误处理测试
   - [ ] AI权限测试

2. **网络场景**
   - [ ] 离线模式测试
   - [ ] 网络重连测试
   - [ ] 超时处理测试

3. **性能测试**
   - [ ] 大数据量测试
   - [ ] 内存泄漏检测
   - [ ] 启动时间测试

### 8.2 测试维护

- 每周审查失败测试
- 及时更新测试用例
- 保持测试数据同步
- 优化测试执行时间

---

## 9. 最佳实践

### 9.1 编写测试

```typescript
// ✅ 好的测试
test('should create skill with valid name', async () => {
  const skillName = generateUniqueSkillName('test');
  await skillsPage.createSkill(skillName);
  expect(await skillsPage.skillExists(skillName)).toBeTruthy();
});

// ❌ 避免的测试
test('should work', async () => {
  await page.click('button');
  // 没有断言
});
```

### 9.2 使用 Page Object

```typescript
// ✅ 使用 Page Object
await skillsPage.createSkill('my-skill');

// ❌ 直接操作页面
await page.click('[data-testid="create-skill-button"]');
await page.fill('[data-testid="skill-name-input"]', 'my-skill');
```

### 9.3 等待策略

```typescript
// ✅ 使用明确的等待
await page.waitForSelector('[data-testid="skill-card"]', { timeout: 10000 });

// ❌ 避免固定等待
await page.waitForTimeout(5000);
```

---

## 10. 附录

### 10.1 命令速查

| 命令 | 描述 |
|------|------|
| `npm run test:e2e` | 运行所有E2E测试 |
| `npm run test:e2e:p0` | 运行P0关键测试 |
| `npm run test:e2e:p1` | 运行P1重要测试 |
| `npm run test:e2e:p2` | 运行P2边界测试 |
| `npm run test:e2e:ui` | UI模式运行 |
| `npm run test:e2e:debug` | 调试模式运行 |
| `npx playwright test --grep "技能"` | 运行匹配测试 |
| `npx playwright test --headed` | 有头模式运行 |
| `npx playwright show-report` | 显示测试报告 |

### 10.2 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [Electron 测试指南](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [项目测试指南](../tests/README.md)
