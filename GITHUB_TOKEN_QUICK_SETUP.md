# 🔑 GitHub Token 配置快速指南

## ⚡ 快速配置（3 分钟）

### 1️⃣ 获取 Token

**访问**: https://github.com/settings/tokens

**步骤**:
1. 点击 **"Generate new token (classic)"**
2. 填写表单:
   ```
   Note: skillsMN - Skill Discovery
   Expiration: No expiration
   Scopes: [不需要勾选任何选项]
   ```
3. 点击 **"Generate token"**
4. ⚠️ **立即复制** token（只显示一次！）

**Token 格式**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### 2️⃣ 配置应用

**打开应用** → **Settings** → **General**

找到 **"GitHub Personal Access Token (Optional)"**

```
┌─────────────────────────────────────────────────┐
│ GitHub Personal Access Token (Optional)         │
├─────────────────────────────────────────────────┤
│ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx        │
│                                                 │
│ Optional: Provides higher GitHub API rate      │
│ limits (5,000 requests/hour vs 60/hour)        │
│                                                 │
│ Get your token from GitHub Settings →          │
│ Developer settings → Personal access tokens    │
└─────────────────────────────────────────────────┘
```

点击 **"Save Settings"**

**重启应用** ✅

---

## ❓ 常见问题

### Q: 为什么需要 Token？

**A**: 避免 GitHub API 速率限制

| 认证状态 | 速率限制 | 搜索能力 |
|---------|---------|---------|
| ❌ 未配置 Token | 60 请求/小时 | 容易遇到 401 错误 |
| ✅ 已配置 Token | 5,000 请求/小时 | 几乎无限制 |

### Q: Token 安全吗？

**A**: 安全 - 只访问公开数据

- ✅ **不需要任何权限**
- ✅ **只读取公开仓库**
- ✅ **不能访问你的私有数据**
- ⚠️ **不要分享给他人**

### Q: 忘记复制 Token 怎么办？

**A**: 重新生成一个

1. 访问 https://github.com/settings/tokens
2. 找到之前的 token
3. 点击 **"Delete"** 删除
4. 重新生成新的 token

### Q: Token 泄露了怎么办？

**A**: 立即撤销

1. 访问 https://github.com/settings/tokens
2. 找到泄露的 token
3. 点击 **"Delete"**
4. 生成新 token 并更新配置

---

## 🎯 验证配置

配置完成后，在应用中搜索公共技能：

1. 点击 **"Discover Public Skills"**
2. 输入搜索词（如: `code review`）
3. 应该能看到结果，没有 401 错误

✅ **成功标志**: 可以正常搜索和浏览技能

---

## 📊 对比效果

### 未配置 Token

```
❌ Error: GitHub API error: 401 Unauthorized
⚠️  Rate limit: 60 requests/hour
⏰ Reset time: Wait 1 hour
```

### 已配置 Token

```
✅ Search results: 25 repositories found
✅ Rate limit: 5,000 requests/hour
✅ Remaining: 4,975 requests
⏰ Reset time: 1 hour from now
```

---

## 🔧 故障排除

### 问题 1: 配置后仍然 401

**解决方案**:
1. 检查 token 是否正确复制（没有多余空格）
2. 确认已点击 "Save Settings"
3. **重启应用**（必须！）

### 问题 2: Token 格式错误

**正确格式**: `ghp_` 开头
```
✅ ghp_1234567890abcdef1234567890abcdef12345678
❌ 1234567890abcdef1234567890abcdef12345678
❌ ghp_1234567890abcdef1234567890abcdef12345678 extra
```

### 问题 3: Token 被撤销

**症状**: 之前可以用，现在突然 401

**解决方案**:
1. 检查 GitHub token 设置
2. 确认 token 未被删除
3. 如果被删除，重新生成

---

## 📝 检查清单

配置前确认：

- [ ] GitHub 账号已登录
- [ ] Token 已生成
- [ ] Token 格式正确（`ghp_` 开头）
- [ ] Token 已粘贴到应用设置
- [ ] 已点击 "Save Settings"
- [ ] **应用已重启** ⚠️

---

## 🚀 下一步

配置完成后：

1. **搜索技能**: 尝试搜索 "code review"、"testing" 等
2. **预览技能**: 点击技能查看详情
3. **安装技能**: 将喜欢的技能安装到项目中

---

**需要帮助？** 查看完整文档: `GITHUB_SEARCH_DOCUMENTATION.md`

**状态**: ✅ 准备就绪 | **更新**: 2026-03-11
