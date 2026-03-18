# Claude Agent SDK Error Investigation

## Error Details

**Error Message:**
```
Claude Code process exited with code 1
```

**Stack Trace:**
```
Error: Claude Code process exited with code 1
  at x9.getProcessExitError (sdk.mjs:19:6837)
  at ChildProcess.Y (sdk.mjs:19:9388)
  at ChildProcess.emit (node:events:529:35)
  at ChildProcess._handle.onexit (node:internal/child_process:292:12)
```

**Timeline:**
- 14:13:06 - Started AI generation
- 14:13:12 - Failed (6 seconds)
- 14:13:38 - Second attempt started
- 14:13:46 - Second attempt failed (8 seconds)

## Root Cause Analysis

### Your Configuration
```json
{
  "provider": "anthropic",
  "apiKey": "[encrypted]",
  "model": "glm-5",
  "baseUrl": "https://open.bigmodel.cn/api/anthropic"
}
```

### The Problem

The **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) is a sophisticated tool that:

1. **Spawns a child process** - Runs the `claude` binary as a subprocess
2. **Expects Claude-specific features** - Including tool use, function calling, streaming
3. **Designed for official API** - Works with `api.anthropic.com`
4. **Requires Claude models** - `claude-sonnet-4-6`, `claude-opus-4-6`, etc.

Your setup uses:
- ❌ **Custom endpoint**: `https://open.bigmodel.cn/api/anthropic`
- ❌ **Non-Claude model**: `glm-5` (Zhipu AI's model)

### Why It Fails

When the Agent SDK spawns the Claude Code process:

1. Sets environment variable `ANTHROPIC_BASE_URL` to your custom endpoint
2. Passes `model="glm-5"` parameter
3. Expects the API to support:
   - Claude-specific response formats
   - Agent SDK tool protocols
   - Streaming with specific event types
4. The custom endpoint doesn't support these features
5. Process exits with code 1

## Verification

### What Works ✅
- Claude binary installed: `C:\Users\lyq\AppData\Roaming\npm\claude`
- Claude version: `2.1.78 (Claude Code)`
- AIService initialization: Successful
- Environment variables: Set correctly
- Our path fix: Working perfectly

### What Doesn't Work ❌
- Agent SDK with custom endpoint
- Non-Claude model (`glm-5`)
- Tool execution and streaming

## Solutions

### Option 1: Use Official Anthropic API (Recommended) ⭐

**Steps:**
1. Get API key from https://console.anthropic.com/
2. Update `C:\Users\lyq\AppData\Roaming\skillsmn\ai-config.json`:

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-api03-...",
  "model": "claude-sonnet-4-6-20250514",
  "streamingEnabled": true,
  "timeout": 30000,
  "maxRetries": 2
}
```

**Note:** Remove or set `baseUrl` to `null` to use the official API.

**Benefits:**
- ✅ Full Agent SDK support
- ✅ All Claude models available
- ✅ Tool use and function calling work
- ✅ Official support and documentation

**Cost:**
- Claude Sonnet 4.6: ~$3/$15 per million tokens
- Competitive pricing for most use cases

### Option 2: Verify Custom Endpoint Compatibility

**Contact Zhipu AI (open.bigmodel.cn) and ask:**

1. **Does your Anthropic-compatible endpoint support Claude Agent SDK?**
   - The Agent SDK uses advanced features beyond basic API calls
   - May require specific server-side support

2. **What models are actually supported?**
   - Is `glm-5` the correct model identifier?
   - Are there Claude models available?

3. **What are the limitations?**
   - Tool use support?
   - Streaming protocol?
   - Function calling?

**How to test:**
```bash
# Test basic API connectivity
curl https://open.bigmodel.cn/api/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "glm-5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Option 3: Modify Code to Use Direct API (Advanced)

If you must use the custom endpoint, we can modify `AIService.ts` to use direct Anthropic SDK calls instead of Agent SDK.

**Pros:**
- Works with custom endpoints
- More control over API calls

**Cons:**
- Lose Agent SDK features (automatic tool loading, skill execution)
- Requires significant code changes
- Manual tool management

**Implementation would require:**
1. Replace Agent SDK with Anthropic SDK
2. Implement manual tool calling logic
3. Handle skill loading manually
4. Update streaming implementation

## Testing the Fix

### If You Switch to Official API:

1. Update configuration as shown in Option 1
2. Restart the application
3. Test AI Skill Creator:
   ```
   Create a skill called "test-ls" that lists files
   ```
4. Verify in logs:
   ```
   [INFO] [AIService] Starting AI generation with Claude Agent SDK
   [DEBUG] [AIService] Agent using tool | { "tool": "Write", ... }
   ```

### If You Keep Custom Endpoint:

1. Contact provider for compatibility info
2. Test basic API calls first
3. Consider Option 3 if Agent SDK won't work

## Technical Details

### Claude Agent SDK Architecture

```
Application
    ↓
AIService.ts
    ↓ (sets env vars)
ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL
    ↓
Agent SDK (query())
    ↓ (spawns subprocess)
claude binary (2.1.78)
    ↓ (makes API calls)
API Endpoint (custom or official)
    ↓
Model (claude-* or glm-5)
```

### What Agent SDK Expects

1. **Streaming protocol**: Specific SSE event format
2. **Tool responses**: Structured tool use results
3. **Model behavior**: Claude-specific response patterns
4. **Error handling**: Anthropic API error formats

### Why Custom Endpoints May Not Work

Many Anthropic-compatible endpoints:
- ✅ Support basic chat completion
- ❌ Don't support advanced Agent SDK features
- ❌ May not implement tool calling correctly
- ❌ May use different streaming formats

## Recommendation

**For immediate fix:** Use Option 1 (official API)

**For long-term with custom endpoint:**
1. Verify compatibility (Option 2)
2. If not compatible, implement Option 3

## Related Files

- `src/main/services/AIService.ts` - AI service implementation
- `src/main/models/AIGenerationRequest.ts` - Request models
- `C:\Users\lyq\AppData\Roaming\skillsmn\ai-config.json` - Configuration
- `node_modules/@anthropic-ai/claude-agent-sdk/` - Agent SDK

## Additional Resources

- [Claude Agent SDK Documentation](https://docs.anthropic.com/claude-agent-sdk)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Get API Key](https://console.anthropic.com/)

## Conclusion

The Agent SDK error is **not related to our path fix** - that's working correctly!

The issue is a **configuration mismatch**:
- Agent SDK expects official Anthropic API + Claude models
- Your config uses custom endpoint + non-Claude model

**Next step:** Update to official API or verify custom endpoint compatibility.
