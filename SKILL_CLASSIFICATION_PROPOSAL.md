# Skill智能分类方案

## 问题分析

当前系统完全依赖tags匹配进行分组，存在以下问题：
- tags随意性强，无法保证标准统一
- 默认分组的tags字段为空
- 大量skill被分到"未分组"类别

## 解决方案：混合分类策略

### 1. 分层分类架构

```
┌─────────────────────────────────────┐
│  手动指定分类 (最高优先级)            │
├─────────────────────────────────────┤
│  AI智能分类 (第二优先级)             │
├─────────────────────────────────────┤
│  关键词匹配 (第三优先级)             │
├─────────────────────────────────────┤
│  Tags匹配 (当前逻辑，最低优先级)     │
└─────────────────────────────────────┘
```

### 2. 核心组件

#### 2.1 分类器服务 (SkillClassificationService)

**职责：**
- 执行分类逻辑
- 缓存分类结果
- 提供批量分类API

**核心方法：**
```typescript
class SkillClassificationService {
  // 分类单个skill
  async classifySkill(skill: Skill, groups: SkillGroup[]): Promise<string | null>

  // 批量分类skills
  async classifySkills(skills: Skill[], groups: SkillGroup[]): Promise<Map<string, string>>

  // 清除分类缓存
  clearCache(skillPath?: string): void
}
```

#### 2.2 关键词匹配器 (KeywordMatcher)

为每个分组配置关键词和模式：

```typescript
interface GroupKeywords {
  groupId: string;
  keywords: string[];
  patterns?: RegExp[];  // 正则表达式模式
  examples: string[];    // 示例描述
}

const GROUP_KEYWORDS: GroupKeywords[] = [
  {
    groupId: 'default-plan',
    keywords: ['plan', 'design', 'architecture', 'spec', 'requirement'],
    examples: ['设计系统架构', '规划实现方案', '编写规格说明']
  },
  {
    groupId: 'default-code',
    keywords: ['code', 'implement', 'develop', 'write', 'program'],
    examples: ['编写代码', '实现功能', '开发应用']
  },
  // ... 其他分组
];
```

#### 2.3 AI分类器 (AIClassifier)

利用现有AI配置进行智能分类：

```typescript
class AIClassifier {
  async classifyByAI(
    skill: Skill,
    groups: SkillGroup[]
  ): Promise<string | null> {
    // 构造分类提示词
    const prompt = this.buildClassificationPrompt(skill, groups);

    // 调用AI API
    const response = await this.callAI(prompt);

    // 解析分类结果
    return this.parseClassificationResult(response);
  }

  private buildClassificationPrompt(skill: Skill, groups: SkillGroup[]): string {
    return `
你是一个技能分类助手。请根据以下技能信息，将其归类到最合适的分组中。

技能信息：
- 名称：${skill.name}
- 描述：${skill.description || '无'}

可选分组：
${groups.map(g => `- ${g.name}: ${g.description}`).join('\n')}

请只返回分组ID，不要包含其他内容。
`;
  }
}
```

### 3. 分类缓存

为了避免重复分类，使用缓存机制：

```typescript
interface ClassificationCache {
  skillPath: string;
  groupId: string;
  method: 'manual' | 'ai' | 'keyword' | 'tag';
  timestamp: string;
  skillHash: string;  // 基于name+description的hash
}

class ClassificationCacheManager {
  private cache: Map<string, ClassificationCache> = new Map();

  get(skillPath: string, skillHash: string): ClassificationCache | null {
    const cached = this.cache.get(skillPath);
    if (cached && cached.skillHash === skillHash) {
      return cached;
    }
    return null;
  }

  set(entry: ClassificationCache): void {
    this.cache.set(entry.skillPath, entry);
  }

  clear(skillPath?: string): void {
    if (skillPath) {
      this.cache.delete(skillPath);
    } else {
      this.cache.clear();
    }
  }
}
```

### 4. 手动分类API

允许用户手动指定分类：

```typescript
interface ManualClassification {
  skillPath: string;
  groupId: string;
  overwriteCache: boolean;
}

// 在SkillGroupService中添加
class SkillGroupService {
  // 手动设置skill的分组
  setSkillClassification(
    skillPath: string,
    groupId: string
  ): IPCResponse<void> {
    // 保存到配置文件
    // 清除缓存
    // 触发UI更新
  }

  // 批量设置分类
  batchSetSkillClassification(
    classifications: ManualClassification[]
  ): IPCResponse<void> {
    // 批量处理
  }
}
```

### 5. 配置文件结构

在config.json中添加分类相关配置：

```json
{
  "skillClassifications": {
    "version": 1,
    "classifications": [
      {
        "skillPath": "/path/to/skill",
        "groupId": "default-code",
        "method": "manual",
        "timestamp": "2026-01-01T00:00:00.000Z",
        "skillHash": "abc123"
      }
    ]
  }
}
```

### 6. UI改进

#### 6.1 分类状态指示器

在SkillCard上显示分类状态：
- 🔵 AI自动分类
- 🟢 关键词匹配
- 🟡 手动指定
- ⚪ 未分类

#### 6.2 批量分类操作

```typescript
// 添加到SkillList组件
const handleBatchClassify = async () => {
  const selectedSkills = getSelectedSkills();
  const result = await classificationService.classifySkills(selectedSkills, groups);
  // 应用分类结果
};
```

#### 6.3 手动重新分类

```typescript
// 添加到SkillCard组件
const handleReclassify = async (skill: Skill) => {
  const groupId = await showDialog({
    title: '选择分组',
    options: groups
  });
  await skillGroupService.setSkillClassification(skill.path, groupId);
};
```

### 7. 实施步骤

#### 阶段1：基础架构 (1-2天)
1. 创建`SkillClassificationService`
2. 实现`KeywordMatcher`
3. 添加分类缓存机制

#### 阶段2：AI分类集成 (2-3天)
1. 创建`AIClassifier`
2. 集成到现有AI服务
3. 实现分类提示词模板

#### 阶段3：UI实现 (2-3天)
1. 添加分类状态指示器
2. 实现批量分类操作
3. 添加手动重新分类功能

#### 阶段4：优化和完善 (1-2天)
1. 性能优化
2. 错误处理
3. 用户反馈收集

### 8. 配置示例

#### 关键词配置

```json
{
  "groupKeywords": {
    "default-plan": {
      "keywords": ["plan", "design", "architecture", "spec"],
      "patterns": ["^design.*", "^plan.*", ".*architecture.*"],
      "examples": ["设计系统架构", "规划实现方案"]
    },
    "default-code": {
      "keywords": ["code", "implement", "develop", "write"],
      "patterns": ["^implement.*", "^code.*", ".*develop.*"],
      "examples": ["编写代码", "实现功能"]
    }
  }
}
```

#### AI分类提示词模板

```typescript
const CLASSIFICATION_PROMPT_TEMPLATE = `
你是一个技能分类专家。请根据技能信息将其归类到最合适的分组。

技能名称：{{skillName}}
技能描述：{{skillDescription}}

可选分组：
{{groups}}

分类规则：
1. 优先根据技能的主要功能和用途分类
2. 如果技能涉及多个阶段，选择最主要的阶段
3. 如果无法确定，选择"未分组"

请只返回分组ID（如：default-code），不要包含其他内容。
`;
```

## 优势

1. **智能分类**：AI能理解skill的实际用途，不依赖tags
2. **快速匹配**：关键词匹配提供即时结果
3. **手动控制**：用户可以随时调整分类
4. **性能优化**：缓存机制避免重复计算
5. **渐进增强**：可以逐步启用AI分类

## 风险和缓解

| 风险 | 缓解措施 |
|------|---------|
| AI分类成本高 | 使用关键词匹配作为第一层，AI只处理未分类的 |
| AI分类不准确 | 提供手动覆盖和反馈机制 |
| 分类不一致 | 统一分类提示词和规则 |
| 性能问题 | 异步分类 + 缓存机制 |

## 总结

这个方案通过混合分类策略，既保证了分类的准确性（AI分类），又兼顾了性能（关键词匹配），同时给用户足够的控制权（手动指定）。可以根据实际情况逐步启用各个分类层次。
