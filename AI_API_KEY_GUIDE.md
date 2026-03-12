# AI助手配置说明

## 需要什么密钥？

AI助手功能需要 **Anthropic API Key**（Claude API密钥）才能使用。

---

## 📋 密钥要求

### 密钥格式
- **前缀**: `sk-ant-`
- **长度**: 108 字符
- **示例**: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 密钥类型
支持两种类型的API密钥：
1. **Claude Pro 订阅** - 每月 $20
   - 更高的使用限制
   - 访问最新模型
   - 优先支持

2. **Claude Team 订阅** - 每月 $25/用户
   - 团队协作功能
   - 更高的API限制
   - 管理员控制

---

## 🔑 如何获取API密钥

### 步骤1: 注册Anthropic账号
1. 访问：https://console.anthropic.com/
2. 点击 "Sign Up" 或 "Get Started"
3. 填写注册信息

### 步骤2: 订阅Claude Pro或Team
1. 登录后，进入 "Plans & Billing"
2. 选择 Claude Pro 或 Claude Team
3. 完成支付

### 步骤3: 生成API密钥
1. 进入 "API Keys" 页面
2. 点击 "Create Key"
3. 给密钥命名（如："skillsMN Desktop"）
4. **立即复制密钥**（只显示一次！）
5. 保存到安全的地方

---

## ⚙️ 在应用中配置

### 方法1: 通过应用界面（推荐）

1. 启动应用
   ```bash
   cd /d/skillsMN
   npm start
   ```

2. 打开设置
   - 点击右上角 **Settings** 按钮
   - 或使用快捷键（如果有）

3. 配置AI
   - 找到 **"AI Configuration"** 部分
   - 在 **"API Key"** 输入框中粘贴密钥
   - 点击 **"Test Connection"** 验证
   - 看到 "✅ Connection successful" 表示成功

4. 保存设置
   - 点击 **"Save"** 按钮
   - API密钥会被加密存储

### 方法2: 直接编辑配置文件（不推荐）

配置文件位置：
- **Windows**: `%APPDATA%/skillsMN/ai-config.json`
- **macOS**: `~/Library/Application Support/skillsMN/ai-config.json`
- **Linux**: `~/.config/skillsMN/ai-config.json`

---

## 🔒 安全说明

### 密钥存储安全
- ✅ **加密存储**: 使用Electron的safeStorage加密
- ✅ **本地存储**: 密钥只保存在你的电脑上
- ✅ **不上传**: 密钥不会发送到任何服务器
- ✅ **安全传输**: API调用使用HTTPS加密

### 最佳实践
- 🔐 **不要分享密钥** - 每个人应该有自己的密钥
- 🔐 **定期更换** - 如果怀疑泄露，立即重新生成
- 🔐 **限制权限** - 在Anthropic控制台设置使用限制
- 🔐 **监控使用** - 定期检查API使用情况

---

## 💰 费用说明

### Claude Pro ($20/月)
- **API调用限制**: 根据模型不同
- **包含功能**:
  - 所有Claude模型访问
  - 高优先级API
  - 优先支持

### 按使用计费
API调用按token计费：
- **Claude 3 Sonnet**: ~$3/百万输入token，~$15/百万输出token
- **Claude 3 Opus**: ~$15/百万输入token，~$75/百万输出token

### 费用估算
生成一个技能（约1000 tokens）：
- 输入: ~$0.003 (0.3分)
- 输出: ~$0.015 (1.5分)
- **总计**: ~$0.018 (1.8分人民币)

---

## ❓ 常见问题

### Q: 没有API密钥可以使用AI助手吗？
A: 不可以。AI助手需要调用Claude API，必须提供有效的API密钥。

### Q: 免费试用吗？
A: Anthropic提供 $5 的免费额度给新用户，但需要在官网注册。

### Q: 可以使用其他AI服务吗？
A: 目前只支持Anthropic的Claude API。未来可能支持其他服务。

### Q: 密钥会过期吗？
A: API密钥不会自动过期，但你可以随时在Anthropic控制台撤销或重新生成。

### Q: 忘记密钥怎么办？
A: 在Anthropic控制台可以查看、重新生成或删除密钥。

### Q: 多少人可以共用一个密钥？
A: API密钥没有使用人数限制，但建议每人使用自己的密钥以便管理和计费。

---

## 🚀 快速开始

1. ✅ 注册Anthropic账号
2. ✅ 订阅Claude Pro
3. ✅ 生成API密钥
4. ✅ 在应用中配置
5. ✅ 开始使用AI助手！

---

## 📞 获取帮助

- **Anthropic帮助中心**: https://help.anthropic.com/
- **API文档**: https://docs.anthropic.com/
- **应用问题**: 查看应用日志或提交Issue

---

**注意**: AI助手功能是可选的。如果不配置API密钥，你仍然可以使用应用的所有其他功能（技能管理、编辑、搜索等）。
