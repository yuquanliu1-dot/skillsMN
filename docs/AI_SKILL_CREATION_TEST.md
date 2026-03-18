# AI Skill Creation - 测试指南

## 测试步骤

### 1. 启动应用
```bash
npm start
```

### 2. 测试AI创建按钮位置
1. 点击主界面的"Create New Skill"按钮
2. **验证**: 看到三个按钮 - `[Cancel] [AI Create] [Create Skill]`
3. **验证**: AI Create按钮是紫色渐变色

### 3. 测试目录路径显示
1. 在CreateSkillDialog中选择"Project Directory"
2. 点击"AI Create"按钮
3. **验证**: AISkillCreationDialog显示实际路径，如：`/path/to/your/project/.claude/skills`
4. 关闭对话框，选择"Global Directory"
5. 再次点击"AI Create"
6. **验证**: 显示"Global Skills Directory"

### 4. 测试输入框位置
1. 打开AISkillCreationDialog
2. **验证**: 布局顺序为：
   - Info Box (Save Location)
   - Preview区域
   - Skill Description输入框
   - 控制按钮

### 5. 测试AI生成和保存流程
1. 在Skill Description输入框输入描述：
   ```
   A skill that helps review code by analyzing pull requests and providing feedback on code quality, potential bugs, and best practices.
   ```
2. 点击"Generate"按钮
3. **验证**: Preview区域实时显示生成的内容（流式效果）
4. 等待生成完成（状态变为"Complete"）
5. 点击"Apply"按钮
6. **验证**:
   - ✅ 对话框关闭
   - ✅ Skill列表自动刷新
   - ✅ 新创建的skill出现在列表中
   - ✅ **没有**弹出的alert提示框
7. 在主界面底部看到成功toast："Skill created successfully with AI!"

### 6. 验证skill已保存
1. 在skill列表中找到刚创建的skill
2. 点击打开查看内容
3. **验证**: 内容与AI生成的一致，包含正确的YAML frontmatter

## 预期行为总结

| 操作 | 预期结果 |
|------|---------|
| 点击AI Create | 打开AI创建对话框，显示实际目录路径 |
| 输入描述并Generate | Preview区域流式显示生成内容 |
| 生成完成 | 状态显示"Complete"，Apply按钮可用 |
| 点击Apply | 对话框关闭，列表刷新，无alert |
| 查看新skill | 已保存到正确目录，内容完整 |

## 常见问题排查

### Q: 点击Apply后没有反应？
- 检查浏览器控制台是否有错误
- 确认AI生成的内容包含有效的YAML frontmatter
- 验证skill name字段存在且格式正确

### Q: 目录路径显示"Loading..."？
- 检查应用配置是否正确
- 确认project directory已设置

### Q: 生成失败？
- 检查AI API配置
- 查看控制台错误日志
- 尝试Retry按钮

## 成功标准

✅ 所有验证点通过
✅ UI布局符合要求
✅ 用户体验流畅
✅ 无错误提示
✅ Skill正确保存和刷新
