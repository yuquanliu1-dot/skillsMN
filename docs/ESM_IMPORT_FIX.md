# ERR_REQUIRE_ESM Fix

## Problem

When using Claude Agent SDK in an Electron app with CommonJS compilation, we encountered:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module @anthropic-ai/claude-agent-sdk not supported.
```

## Root Cause

TypeScript's `tsc` compiler transpiles dynamic `import()` statements to `require()` when compiling to CommonJS (`"module": "commonjs"` in tsconfig.json):

```typescript
// Source code
const module = await import('@anthropic-ai/claude-agent-sdk');

// Compiled to (WRONG for ES Modules)
const module = await Promise.resolve().then(() => __importStar(require('@anthropic-ai/claude-agent-sdk')));
```

This fails because `@anthropic-ai/claude-agent-sdk` is an ES Module and cannot be loaded with `require()`.

## Solution

Use the `Function` constructor to create a dynamic import that TypeScript cannot statically analyze and transpile:

```typescript
async function loadSDK(): Promise<ClaudeAgentSDK> {
  if (!sdkModule) {
    // Use Function constructor to prevent TypeScript from transpiling to require()
    // This is necessary because @anthropic-ai/claude-agent-sdk is an ES Module
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const module = await dynamicImport('@anthropic-ai/claude-agent-sdk');

    sdkModule = {
      query: module.query,
      createSdkMcpServer: module.createSdkMcpServer,
      tool: module.tool,
    };
  }
  return sdkModule;
}
```

### Why This Works

1. `new Function()` creates a function at runtime
2. TypeScript cannot statically analyze the function body
3. The `import()` statement remains as-is in the compiled code
4. Node.js can then properly load the ES Module

### Compiled Output

```javascript
async function loadSDK() {
  if (!sdkModule) {
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const module = await dynamicImport('@anthropic-ai/claude-agent-sdk');
    sdkModule = {
      query: module.query,
      createSdkMcpServer: module.createSdkMcpServer,
      tool: module.tool,
    };
  }
  return sdkModule;
}
```

## Alternative Solutions Considered

### 1. Change tsconfig.json to ES Modules
```json
{
  "compilerOptions": {
    "module": "ES2020"  // or "ESNext"
  }
}
```

**Pros:** Native ES Module support
**Cons:** Requires major refactoring of entire codebase, breaks other CommonJS dependencies

### 2. Use esm package
```javascript
require = require('esm')(module);
const module = require('@anthropic-ai/claude-agent-sdk');
```

**Pros:** Simple
**Cons:** Deprecated, adds runtime overhead, can cause other issues

### 3. Webpack/Rollup bundling
**Pros:** Better module handling
**Cons:** Adds build complexity, not needed for Electron main process

## Chosen Solution

**Function constructor** approach because:
- ✅ Minimal code change (just 2 lines)
- ✅ No build configuration changes
- ✅ No additional dependencies
- ✅ Works with existing CommonJS setup
- ✅ Maintains type safety through manual type definitions

## Lessons Learned

1. **ES Modules in CommonJS**: Dynamic imports are the bridge between CommonJS and ES Modules
2. **TypeScript Transpilation**: TypeScript aggressively transpiles `import()` to `require()` in CommonJS mode
3. **Runtime Evaluation**: `new Function()` provides a way to bypass static analysis
4. **Module Systems**: Mixing CommonJS and ES Modules requires careful handling

## References

- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Dynamic Import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)

## Related Commits

- `3de56bd` - fix: use Function constructor to prevent require() transpilation
- `2ee95ac` - fix: remove manual skill loading - Agent SDK handles this
- `a52cb90` - refactor: migrate AI service to use Claude Agent SDK
