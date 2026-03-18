# Private Repository Source Update Feature

## 功能概述

当从公共仓库下载的 skill 被上传到私有仓库后，系统会自动更新该 skill 的来源元数据（source metadata），将其标记为私有仓库来源。这样后续的版本升级检查会与私有仓库进行比对，而不是继续与公共仓库比对。

## 实现细节

### 1. 修改的文件

#### `src/main/services/PrivateRepoService.ts`

**新增方法：`updateSkillSourceToPrivateRepo`**
```typescript
private static async updateSkillSourceToPrivateRepo(
  skillPath: string,
  repoId: string,
  repo: PrivateRepo,
  skillDirName: string,
  commitSha?: string
): Promise<void>
```

- **功能**：更新 skill 的 `.source.json` 文件，将来源类型改为 `private-repo`
- **参数**：
  - `skillPath`: 本地 skill 目录路径
  - `repoId`: 私有仓库 ID
  - `repo`: 私有仓库对象
  - `skillDirName`: skill 目录名称
  - `commitSha`: 上传后的 commit SHA（可选）

**修改方法：`uploadSkillToRepo`**
- 在成功上传 skill 到私有仓库后，自动调用 `updateSkillSourceToPrivateRepo`
- 将上传后获取的 commit SHA 保存到元数据中

#### `src/main/services/GitHubService.ts`

**修改方法：`uploadSkillDirectory`**
- 返回类型新增 `commitSha?: string` 字段
- 上传完成后，通过 GitHub API 获取最新的 commit SHA
- 将 commit SHA 包含在返回结果中

#### `src/main/services/GitLabService.ts`

**修改方法：`uploadSkillDirectory`**
- 返回类型新增 `commitSha?: string` 字段
- 上传完成后，通过 GitLab API 获取最新的 commit SHA
- 将 commit SHA 包含在返回结果中

### 2. 工作流程

```
1. 用户从公共仓库安装 skill
   └─> .source.json 包含:
       {
         "type": "registry",
         "source": "public-org/public-repo",
         "skillId": "my-skill",
         ...
       }

2. 用户将 skill 上传到私有仓库
   └─> PrivateRepoService.uploadSkillToRepo() 执行:
       a. 上传文件到私有仓库
       b. 获取 commit SHA
       c. 调用 updateSkillSourceToPrivateRepo()
       d. 更新 .source.json 为:
          {
            "type": "private-repo",
            "repoId": "repo-123",
            "repoPath": "my-org/my-private-repo",
            "skillPath": "my-skill",
            "commitHash": "abc123...",
            "installedAt": "2026-03-19T..."
          }

3. 后续版本检查
   └─> SkillService.checkForUpdates() 识别到:
       - source.type === 'private-repo'
       - 使用 checkPrivateRepoSkillForUpdates() 方法
       - 与私有仓库比对 commit SHA
       - 不再与公共仓库比对
```

### 3. 版本检查逻辑

**更新前**：
- Registry skill → 检查公共仓库更新
- 上传到私有仓库后 → 仍然检查公共仓库（问题所在）

**更新后**：
- Registry skill → 检查公共仓库更新
- 上传到私有仓库后 → source type 变为 `private-repo` → 检查私有仓库更新 ✅

### 4. 关键优势

1. **自动更新来源**：无需用户手动干预，上传后自动切换来源
2. **准确的版本检查**：确保后续更新检查与正确的仓库比对
3. **保留 commit SHA**：保存上传后的 commit SHA，便于精确的版本比对
4. **向后兼容**：如果上传失败或 commit SHA 获取失败，不影响基本功能

### 5. 测试覆盖

新增测试文件：`tests/unit/services/PrivateRepoUpload.test.ts`

测试用例：
- ✅ 从 registry 更新到 private-repo
- ✅ 不提供 commit SHA 的情况
- ✅ 元数据格式正确性验证

## 使用示例

```typescript
// 用户操作：上传 skill 到私有仓库
const result = await ipcClient.uploadSkillToPrivateRepo({
  repoId: 'repo-123',
  skillPath: '/path/to/skill',
  skillContent: '...',
  skillName: 'my-skill',
  commitMessage: 'Update skill'
});

// 系统自动执行：
// 1. 上传文件到私有仓库
// 2. 获取 commit SHA: "abc123..."
// 3. 更新 .source.json:
//    - type: "private-repo"
//    - repoId: "repo-123"
//    - commitHash: "abc123..."

// 后续版本检查会自动与私有仓库比对
const updates = await skillService.checkForUpdates(skills);
// ✅ 该 skill 会与私有仓库比对，而不是公共仓库
```

## 相关文件

- `src/main/services/PrivateRepoService.ts` - 私有仓库服务
- `src/main/services/SkillService.ts` - Skill 服务（版本检查逻辑）
- `src/main/services/GitHubService.ts` - GitHub API 服务
- `src/main/services/GitLabService.ts` - GitLab API 服务
- `src/main/models/SkillSource.ts` - Source metadata 模型定义
- `tests/unit/services/PrivateRepoUpload.test.ts` - 单元测试

## 技术细节

### Source Metadata 类型

```typescript
// Registry 来源（公共仓库）
interface RegistrySource {
  type: 'registry';
  registryUrl: string;
  source: string;        // org/repo
  skillId: string;
  installedAt: string;
  commitHash?: string;
}

// Private Repo 来源（私有仓库）
interface PrivateRepoSource {
  type: 'private-repo';
  repoId: string;        // UUID
  repoPath: string;      // org/repo
  skillPath: string;     // skill 目录路径
  installedAt: string;
  commitHash?: string;   // 最新 commit SHA
}
```

### 版本检查流程

```typescript
async checkForUpdates(skills: Skill[]) {
  for (const skill of skills) {
    if (isRegistrySkill(skill.sourceMetadata)) {
      // 检查公共仓库更新
      await this.checkRegistrySkillForUpdates(...);
    } else if (isPrivateRepoSkill(skill.sourceMetadata)) {
      // 检查私有仓库更新
      await this.checkPrivateRepoSkillForUpdates(...);
    }
  }
}
```

## 注意事项

1. **元数据文件**：`.source.json` 文件不会被上传到仓库（在 `.gitignore` 中排除）
2. **错误处理**：如果更新元数据失败，不会影响上传操作的成功
3. **Commit SHA**：如果无法获取 commit SHA，仍然会更新来源类型，只是没有 commit SHA 记录
4. **日志记录**：所有操作都有详细的日志记录，便于调试

## 未来改进

- [ ] 支持批量上传时更新多个 skill 的来源
- [ ] 提供用户界面显示 skill 的当前来源
- [ ] 支持手动切换来源类型（高级功能）
