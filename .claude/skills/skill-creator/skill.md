---
name: skill-creator
description: Guide for creating effective Claude Code skills with proper format, structure, and best practices
version: 1.0.0
author: skillsMN Team
tags: [skill-creation, documentation, best-practices]
---

# Skill Creator Guide

This skill guides Claude in creating new skills for Claude Code. A skill is a YAML + Markdown file that extends Claude's capabilities with specialized knowledge.

## Skill File Format

### 1. Frontmatter (YAML)

Every skill must start with YAML frontmatter:

```yaml
---
name: Skill Name
description: Brief description of what this skill does
version: 1.0.0
author: Your Name
tags: [tag1, tag2, tag3]
---
```

**Required fields:**
- `name`: Clear, descriptive name (Title Case)
- `description`: One-line summary of the skill's purpose

**Optional fields:**
- `version`: Semantic version (default: 1.0.0)
- `author`: Skill creator name
- `tags`: Array of relevant tags for categorization
- `created`: ISO 8601 date
- `updated`: ISO 8601 date

### 2. Content (Markdown)

After frontmatter, write comprehensive Markdown content:

```markdown
# Skill Title

Brief introduction explaining what this skill does and when to use it.

## Purpose

Detailed explanation of the skill's purpose and use cases.

## Guidelines

### Rule 1
- Specific instruction
- Example or detail

### Rule 2
- Another instruction
- Best practice

## Examples

### Example 1: Basic Usage
Show concrete examples of how to use the skill.

### Example 2: Advanced Usage
More complex scenarios.

## Best Practices

- Do this
- Avoid that
- Remember to...

## Common Patterns

### Pattern 1
Description of a common pattern.

### Pattern 2
Another useful pattern.

## Anti-Patterns

What NOT to do:
- Don't do X
- Avoid Y

## References

- Link to relevant documentation
- External resources
```

## Skill Creation Process

### Step 1: Understand Requirements
Before creating a skill:
1. Identify the specific task or domain
2. Understand the target audience
3. Determine what knowledge needs to be encoded
4. Consider edge cases and common mistakes

### Step 2: Define Structure
Plan the skill's structure:
1. Choose a clear, descriptive name
2. Write a concise description
3. Outline the main sections
4. Plan examples and patterns

### Step 3: Write Content
Follow these principles:
1. **Be Specific**: Concrete instructions over vague advice
2. **Be Concise**: Get to the point quickly
3. **Be Practical**: Focus on actionable guidance
4. **Include Examples**: Show, don't just tell
5. **Cover Edge Cases**: Anticipate problems

### Step 4: Validate
Check your skill:
1. Valid YAML frontmatter
2. Proper Markdown formatting
3. Clear structure and headings
4. No typos or grammatical errors
5. Comprehensive coverage of the topic

## Content Guidelines

### Writing Style
- Use clear, direct language
- Prefer active voice
- Use imperative mood for instructions
- Keep paragraphs short
- Use bullet points for lists

### Structure
- Start with a clear introduction
- Use hierarchical headings (H1, H2, H3)
- Group related information
- Provide navigation through sections
- End with summary or references

### Examples
- Provide realistic, working examples
- Explain what each example does
- Show both simple and complex cases
- Include expected outputs when relevant

## Common Skill Types

### 1. Domain Knowledge Skills
Encode expertise in a specific domain:
- Framework-specific knowledge
- Language-specific patterns
- Industry best practices

Example structure:
```
# Framework/Language Guide

## Core Concepts
## Key Patterns
## Common Tasks
## Best Practices
## Common Pitfalls
```

### 2. Process Skills
Guide through multi-step processes:
- Development workflows
- Code review processes
- Deployment procedures

Example structure:
```
# Process Name

## Prerequisites
## Step-by-Step Process
## Validation
## Troubleshooting
```

### 3. Tool Integration Skills
Teach how to use specific tools:
- CLI tools
- APIs
- Libraries

Example structure:
```
# Tool Name Guide

## Installation
## Basic Usage
## Advanced Features
## Configuration
## Examples
```

### 4. Code Generation Skills
Guide code generation for specific patterns:
- Boilerplate code
- Common implementations
- Design patterns

Example structure:
```
# Pattern Name

## Pattern Description
## When to Use
## Implementation Steps
## Complete Example
## Variations
```

## Best Practices

### Do's
✓ Use descriptive names that reflect the skill's purpose
✓ Write clear, actionable instructions
✓ Include practical examples
✓ Keep skills focused and single-purpose
✓ Use consistent formatting
✓ Test skills with real scenarios
✓ Document assumptions and prerequisites
✓ Update skills when patterns change

### Don'ts
✗ Create overly broad or vague skills
✗ Duplicate existing knowledge
✗ Include outdated information
✗ Use jargon without explanation
✗ Create skills without clear use cases
✗ Mix multiple unrelated topics
✗ Forget to handle errors and edge cases

## File Naming Convention

- Use lowercase with hyphens: `skill-name.md`
- Match the skill name in frontmatter
- Be descriptive but concise
- Avoid special characters

## Example: Complete Skill

```markdown
---
name: API Design Best Practices
description: Guidelines for designing RESTful APIs that are scalable, maintainable, and user-friendly
version: 1.0.0
author: API Team
tags: [api, rest, design, architecture]
---

# API Design Best Practices

Comprehensive guide for designing RESTful APIs following industry standards and best practices.

## Purpose

This skill provides guidelines for creating APIs that are:
- Easy to understand and use
- Consistent across endpoints
- Scalable and maintainable
- Secure and reliable

## URL Design

### Use Nouns, Not Verbs
```
✓ GET /users
✗ GET /getUsers

✓ POST /users
✗ POST /createUser

✓ DELETE /users/:id
✗ DELETE /deleteUser/:id
```

### Use Plural Names
```
✓ /users
✓ /products
✗ /user
✗ /product
```

### Nest Related Resources
```
GET /users/:userId/orders
GET /orders/:orderId/items
```

## HTTP Methods

- `GET`: Retrieve resources (idempotent)
- `POST`: Create new resources
- `PUT`: Update entire resource (idempotent)
- `PATCH`: Partial update
- `DELETE`: Remove resource (idempotent)

## Status Codes

### Success Codes
- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE

### Error Codes
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: No permission
- `404 Not Found`: Resource doesn't exist
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

## Request/Response Format

### Use JSON
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [...]
  }
}
```

## Pagination

```
GET /users?page=2&limit=20
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Authentication

Use Bearer tokens in headers:
```
Authorization: Bearer <token>
```

## Versioning

Include version in URL:
```
/api/v1/users
/api/v2/users
```

## Common Patterns

### Search and Filter
```
GET /users?search=john&status=active&sort=-createdAt
```

### Bulk Operations
```
POST /users/bulk
{
  "users": [...]
}
```

## Anti-Patterns

- Returning HTML instead of JSON
- Using GET for state-changing operations
- Exposing database IDs directly
- Not handling errors properly
- Inconsistent naming conventions
```

## When to Create a Skill

Create a skill when:
1. You find yourself repeating the same instructions
2. You have domain expertise worth sharing
3. You want to standardize a process
4. You need to guide Claude's behavior consistently
5. You want to extend Claude's capabilities

## Testing Your Skill

After creating a skill:
1. Load it in Claude Code
2. Test with various prompts
3. Verify it produces expected results
4. Refine based on usage
5. Update when needed

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Markdown Guide](https://www.markdownguide.org)
- [YAML Specification](https://yaml.org/spec/)

---

Remember: A good skill is like a good teacher - clear, patient, and comprehensive, but never overwhelming.
