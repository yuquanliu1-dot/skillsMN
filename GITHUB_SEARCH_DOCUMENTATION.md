# GitHub 公共仓库搜索功能详解

## 🔍 搜索逻辑

### 搜索流程

```
用户输入查询 → 构建搜索 URL → 调用 GitHub API → 处理结果 → 缓存 → 返回
```

### 详细步骤

#### 1️⃣ **构建搜索查询**

```typescript
// 用户输入: "code review"
// 实际查询: code review "skill.md" in:path
const searchQuery = `${query} "skill.md" in:path`;
```

**GitHub API URL**:
```
https://api.github.com/search/code?q=code%20review%20%22skill.md%22%20in%3Apath&page=1&per_page=30
```

#### 2️⃣ **检查缓存**

- **TTL**: 5 分钟
- **Key**: `search:${query}:${page}`
- **目的**: 减少 API 调用，避免速率限制

#### 3️⃣ **速率限制检查**

GitHub API 限制：

| 认证状态 | 速率限制 | 说明 |
|---------|---------|------|
| **未认证** | 60 请求/小时 | ⚠️ 容易达到限制 |
| **已认证** | 5,000 请求/小时 | ✅ 推荐使用 |

#### 4️⃣ **发送请求**

```typescript
const headers: Record<string, string> = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'skillsMN-App',
};

// 添加认证（如果配置了 token）
if (githubToken) {
  headers['Authorization'] = `token ${githubToken}`;
}
```

**重试策略**:
- 最多重试 3 次
- 指数退避（1s → 2s → 4s）
- 自动处理网络错误

#### 5️⃣ **处理搜索结果**

1. **按仓库分组**: 同一仓库的多个 skill.md 文件合并
2. **提取文件信息**: 路径、下载 URL、最后修改时间
3. **排序**: 按 ⭐ Star 数降序

#### 6️⃣ **返回结果**

```typescript
{
  results: [
    {
      repositoryName: "owner/repo",
      repositoryUrl: "https://github.com/owner/repo",
      description: "Repository description",
      stars: 123,
      skillFiles: [
        {
          path: "skills/code-review/skill.md",
          downloadUrl: "https://raw.githubusercontent.com/...",
          lastModified: Date
        }
      ],
      totalSkills: 1
    }
  ],
  totalCount: 100,
  incomplete: false,
  rateLimit: {
    remaining: 59,
    limit: 60,
    resetTime: 1234567890
  }
}
```

---

## ⚙️ 配置 GitHub Token（推荐）

### 为什么需要 Token？

❌ **未认证访问**:
- 60 请求/小时
- 容易遇到 401 错误
- 搜索功能受限

✅ **认证访问**:
- 5,000 请求/小时
- 无 401 错误
- 更好的用户体验

### 如何获取 Token

1. **访问 GitHub Settings**
   - 登录 GitHub
   - Settings → Developer settings → Personal access tokens
   - Tokens (classic)

2. **创建 Token**
   - 点击 "Generate new token (classic)"
   - Note: "skillsMN - Public Skill Discovery"
   - Scopes: 无需任何权限（公开仓库访问）
   - 点击 "Generate token"

3. **复制 Token**
   - 格式: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ 只显示一次，请立即复制

### 如何配置 Token

1. **打开应用设置**
   - Settings → General 标签

2. **输入 Token**
   - 找到 "GitHub Personal Access Token (Optional)"
   - 粘贴你的 token

3. **保存设置**
   - 点击 "Save Settings"
   - 重启应用生效

---

## 🔧 技术实现

### 关键文件

| 文件 | 功能 |
|------|------|
| `GitHubService.ts` | GitHub API 搜索逻辑 |
| `SearchResult.ts` | 搜索结果模型 |
| `Configuration.ts` | 配置模型（包含 githubToken） |
| `Settings.tsx` | 设置 UI（GitHub Token 输入） |

### 代码示例

#### 搜索技能

```typescript
const results = await GitHubService.searchSkills('code review', 1);

console.log(`Found ${results.totalCount} repositories`);
results.results.forEach(repo => {
  console.log(`${repo.repositoryName} (${repo.stars} ⭐)`);
  console.log(`  Skills: ${repo.totalSkills}`);
});
```

#### 处理速率限制

```typescript
if (results.rateLimit.remaining < 10) {
  console.warn('GitHub API rate limit low');
  console.log(`Resets at: ${results.rateLimit.resetDate}`);
}
```

---

## 📊 性能优化

| 优化项 | 实现 | 效果 |
|--------|------|------|
| **缓存** | 5分钟 TTL | 减少 API 调用 |
| **重试** | 指数退避 3 次 | 网络容错 |
| **速率限制** | 主动检查 | 避免 403 错误 |
| **分页** | 30条/页 | 平衡性能 |
| **排序** | 按 stars 降序 | 优先显示热门仓库 |
| **认证** | GitHub Token | 提升速率限制 83 倍 |

---

## ⚠️ 常见问题

### 1. 401 Unauthorized 错误

**原因**: 未配置 GitHub Token，达到速率限制

**解决方案**:
1. 配置 GitHub Token（推荐）
2. 等待速率限制重置（通常 1 小时）

### 2. 403 Forbidden 错误

**原因**: GitHub API 速率限制用尽

**解决方案**:
1. 检查 `rateLimit.remaining`
2. 等待 `rateLimit.resetTime` 重置
3. 配置 GitHub Token 提升限制

### 3. 搜索结果不完整

**原因**: GitHub API 返回 `incomplete: true`

**可能原因**:
- 超时
- 速率限制
- 结果太多

**解决方案**:
- 缩小搜索范围
- 使用更具体的查询
- 等待片刻后重试

### 4. Token 泄露风险

**当前状态**: ⚠️ Token 明文存储

**未来改进**:
- 加密存储（类似 API Key）
- 使用系统密钥链
- Token 权限最小化

---

## 🔐 安全性

### Token 存储

**当前实现**:
- ❌ 明文存储在 `config.json`
- ⚠️ 有泄露风险

**最佳实践**:
1. **最小权限**: Token 不需要任何权限（只访问公开仓库）
2. **定期轮换**: 定期重新生成 token
3. **监控使用**: GitHub 会显示 token 使用情况
4. **及时撤销**: 如果泄露，立即在 GitHub 撤销

**未来改进**:
- 使用 Electron `safeStorage` 加密
- 类似 API Key 的加密存储

---

## 📝 使用示例

### 基础搜索

```typescript
// 搜索 "code review" 技能
const results = await window.electronAPI.searchGitHubSkills('code review', 1);

if (results.success) {
  results.data.results.forEach(repo => {
    console.log(`📁 ${repo.repositoryName}`);
    console.log(`   ⭐ ${repo.stars} stars`);
    console.log(`   📄 ${repo.totalSkills} skills`);
  });
}
```

### 高级搜索

```typescript
// 搜索 TypeScript 相关技能
const results = await window.electronAPI.searchGitHubSkills('typescript', 1);

// 搜索测试技能
const results = await window.electronAPI.searchGitHubSkills('testing jest', 1);

// 搜索文档技能
const results = await window.electronAPI.searchGitHubSkills('documentation', 1);
```

---

## 🎯 总结

### 搜索特点

✅ **优势**:
- 利用 GitHub 强大的搜索引擎
- 自动缓存和重试
- 智能分组和排序
- 速率限制保护
- 可选认证提升限制

⚠️ **限制**:
- 只搜索文件路径（不搜索内容）
- 依赖 GitHub API
- 未认证有速率限制
- 新仓库可能有延迟

### 推荐配置

🎯 **最佳实践**:
1. ✅ **配置 GitHub Token** - 5,000 请求/小时
2. ✅ **使用具体查询** - 缩小搜索范围
3. ✅ **查看 stars 排序** - 优先选择热门技能
4. ✅ **预览技能内容** - 安装前检查质量

---

**状态**: ✅ 完整实现
**最后更新**: 2026-03-11
**提交**: 03b3907 - feat: add optional GitHub token for higher API rate limits
