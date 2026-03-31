/**
 * AI Service (Using Claude Agent SDK)
 *
 * Handles AI-powered skill generation using Claude Agent SDK
 * Implements NormalizedMessage format, permission management, and session control
 * Reference: claudecodeui integration pattern
 */

import { safeStorage, app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/Logger';
import type { AIGenerationRequest } from '../models/AIGenerationRequest';
import { validateAIGenerationRequest } from '../models/AIGenerationRequest';
import type {
  AIConfiguration,
  NormalizedMessage,
  MessageKind,
  PermissionDecision,
  PendingPermissionRequest,
  createNormalizedMessage,
  generateMessageId,
} from '../../shared/types';

/**
 * Write prompt log to ai_prompt.log file in app's user data directory
 */
function logPromptToFile(type: 'USER PROMPT' | 'SYSTEM PROMPT', content: string): void {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'ai_prompt.log');
    const timestamp = new Date().toISOString();
    const separator = '='.repeat(50);
    const logEntry = `\n${separator}\n[${timestamp}] ${type}\n${separator}\n${content}\n${separator}\n`;

    fs.appendFileSync(logPath, logEntry, 'utf-8');
    console.log(`[AIService] ${type} logged to: ${logPath}`);
  } catch (error) {
    console.error('[AIService] Failed to write prompt log:', error);
  }
}

// Dynamic imports for Claude Agent SDK (ES Module)
type ClaudeAgentSDK = {
  query: any;
  createSdkMcpServer: any;
  tool: any;
};

let sdkModule: ClaudeAgentSDK | null = null;
let currentConfig: AIConfiguration | null = null;

// ============================================================================
// Session Management
// ============================================================================

interface SessionInfo {
  id: string;
  instance: any; // SDK query instance
  startTime: number;
  status: 'active' | 'aborted' | 'completed';
  abortController: AbortController;
  mainWindow: BrowserWindow | null;
}

const activeSessions = new Map<string, SessionInfo>();
const activeStreams = new Map<string, AbortController>();

// ============================================================================
// Permission Management
// ============================================================================

const pendingToolApprovals = new Map<string, {
  resolve: (decision: PermissionDecision) => void;
  sessionId?: string;
  toolName: string;
  input: any;
  receivedAt: Date;
}>();

const TOOL_APPROVAL_TIMEOUT_MS = 55000;
const TOOLS_REQUIRING_INTERACTION = new Set(['AskUserQuestion']);

// ============================================================================
// SDK Loading
// ============================================================================

/**
 * Get the correct path to the Claude Agent SDK
 */
function getSDKPath(): string {
  const sdkPackageName = '@anthropic-ai/claude-agent-sdk';

  if (app.isPackaged) {
    const unpackedPath = path.join(
      path.dirname(app.getPath('exe')),
      'resources',
      'app.asar.unpacked',
      'node_modules',
      sdkPackageName,
      'sdk.mjs'
    );

    if (fs.existsSync(unpackedPath)) {
      const fileUrl = 'file:///' + unpackedPath.replace(/\\/g, '/');
      logger.info('Using unpacked SDK path', 'AIService', { path: unpackedPath, fileUrl });
      return fileUrl;
    }
  }

  return sdkPackageName;
}

/**
 * Load Claude Agent SDK module dynamically
 */
async function loadSDK(): Promise<ClaudeAgentSDK> {
  if (!sdkModule) {
    const sdkPath = getSDKPath();
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const module = await dynamicImport(sdkPath);

    sdkModule = {
      query: module.query,
      createSdkMcpServer: module.createSdkMcpServer,
      tool: module.tool,
    };
  }
  return sdkModule;
}

// ============================================================================
// Permission Helpers
// ============================================================================

function createRequestId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for user to approve/deny a tool permission request
 */
function waitForToolApproval(
  requestId: string,
  options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    sessionId?: string;
    toolName: string;
    input: any;
  }
): Promise<PermissionDecision | null> {
  const { timeoutMs = TOOL_APPROVAL_TIMEOUT_MS, signal, sessionId, toolName, input } = options;

  return new Promise(resolve => {
    let settled = false;

    const finalize = (decision: PermissionDecision | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(decision);
    };

    let timeout: NodeJS.Timeout | undefined;

    const cleanup = () => {
      pendingToolApprovals.delete(requestId);
      if (timeout) clearTimeout(timeout);
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    // Interactive tools wait indefinitely
    const actualTimeout = TOOLS_REQUIRING_INTERACTION.has(toolName) ? 0 : timeoutMs;
    if (actualTimeout > 0) {
      timeout = setTimeout(() => finalize(null), actualTimeout);
    }

    const abortHandler = () => {
      finalize({ allow: false, cancelled: true, message: 'Request cancelled' });
    };

    if (signal) {
      if (signal.aborted) {
        finalize({ allow: false, cancelled: true, message: 'Request already aborted' });
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    // Store resolver with metadata
    pendingToolApprovals.set(requestId, {
      resolve: finalize,
      sessionId,
      toolName,
      input,
      receivedAt: new Date(),
    });
  });
}

/**
 * Match tool permission against allowed/disallowed lists
 */
function matchesToolPermission(entry: string, toolName: string, input: any): boolean {
  if (!entry || !toolName) return false;

  if (entry === toolName) return true;

  // Handle Bash(command:*) pattern
  const bashMatch = entry.match(/^Bash\((.+):\*\)$/);
  if (toolName === 'Bash' && bashMatch) {
    const allowedPrefix = bashMatch[1];
    let command = '';

    if (typeof input === 'string') {
      command = input.trim();
    } else if (input && typeof input === 'object' && typeof input.command === 'string') {
      command = input.command.trim();
    }

    return command.startsWith(allowedPrefix);
  }

  return false;
}

// ============================================================================
// Normalized Message Helpers
// ============================================================================

function createMessage(
  kind: MessageKind,
  fields: Partial<NormalizedMessage> = {}
): NormalizedMessage {
  return {
    id: fields.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: fields.sessionId || '',
    timestamp: new Date().toISOString(),
    provider: 'anthropic',
    kind,
    ...fields,
  };
}

// ============================================================================
// Main Service Class
// ============================================================================

export class AIService {
  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  private static getExecutableOptions(): {
    executable?: string;
    pathToClaudeCodeExecutable?: string;
  } {
    if (app.isPackaged) {
      const cliPath = path.join(
        path.dirname(app.getPath('exe')),
        'resources',
        'app.asar.unpacked',
        'node_modules',
        '@anthropic-ai',
        'claude-agent-sdk',
        'cli.js'
      );

      if (fs.existsSync(cliPath)) {
        logger.info('Using CLI path for packaged app', 'AIService', { cliPath });
        return {
          executable: 'node',
          pathToClaudeCodeExecutable: cliPath,
        };
      }
    }
    return {};
  }

  static encryptAPIKey(apiKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn('Encryption not available, storing API key in plaintext');
      return Buffer.from(apiKey).toString('base64');
    }
    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }

  static decryptAPIKey(encryptedKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8');
    }
    const buffer = Buffer.from(encryptedKey, 'base64');
    return safeStorage.decryptString(buffer);
  }

  static async initialize(config: AIConfiguration): Promise<void> {
    try {
      currentConfig = config;
      process.env.ANTHROPIC_API_KEY = config.apiKey;

      if (config.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = config.baseUrl;
        logger.info('Using custom base URL', 'AIService', { hasCustomBaseUrl: true });
      }

      logger.info('AI service initialized', 'AIService');
    } catch (error) {
      logger.error('Failed to initialize AI service', 'AIService', error);
      throw new Error('Failed to initialize AI service. Please check your API key.');
    }
  }

  static async updateConfiguration(config: AIConfiguration): Promise<void> {
    await AIService.initialize(config);
  }

  static isInitialized(): boolean {
    return currentConfig !== null;
  }

  // --------------------------------------------------------------------------
  // Permission Management
  // --------------------------------------------------------------------------

  /**
   * Resolve a pending permission request with user decision
   */
  static resolvePermission(requestId: string, decision: PermissionDecision): boolean {
    const resolver = pendingToolApprovals.get(requestId);
    if (resolver) {
      resolver.resolve(decision);
      return true;
    }
    return false;
  }

  /**
   * Get all pending permission requests for a session
   */
  static getPendingPermissions(sessionId: string): PendingPermissionRequest[] {
    const pending: PendingPermissionRequest[] = [];
    for (const [requestId, info] of pendingToolApprovals.entries()) {
      if (info.sessionId === sessionId) {
        pending.push({
          requestId,
          toolName: info.toolName,
          input: info.input,
          sessionId: info.sessionId,
          receivedAt: info.receivedAt,
        });
      }
    }
    return pending;
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  /**
   * Abort an active session
   */
  static async abortSession(sessionId: string): Promise<boolean> {
    const session = activeSessions.get(sessionId);
    if (!session) {
      logger.info('Session not found for abort', 'AIService', { sessionId });
      return false;
    }

    try {
      logger.info('Aborting session', 'AIService', { sessionId });

      // Call interrupt if available
      if (session.instance && typeof session.instance.interrupt === 'function') {
        await session.instance.interrupt();
      }

      // Also abort via controller
      session.abortController.abort();
      session.status = 'aborted';

      activeSessions.delete(sessionId);
      return true;
    } catch (error) {
      logger.error('Error aborting session', 'AIService', error);
      return false;
    }
  }

  /**
   * Check if a session is currently active
   */
  static isSessionActive(sessionId: string): boolean {
    const session = activeSessions.get(sessionId);
    return session?.status === 'active';
  }

  /**
   * Get all active session IDs
   */
  static getActiveSessions(): string[] {
    return Array.from(activeSessions.entries())
      .filter(([, info]) => info.status === 'active')
      .map(([id]) => id);
  }

  /**
   * Reconnect a session to a new window (for page refresh)
   */
  static reconnectSession(sessionId: string, mainWindow: BrowserWindow): boolean {
    const session = activeSessions.get(sessionId);
    if (!session) return false;
    session.mainWindow = mainWindow;
    logger.info('Session reconnected', 'AIService', { sessionId });
    return true;
  }

  // --------------------------------------------------------------------------
  // Streaming Generation
  // --------------------------------------------------------------------------

  /**
   * Generate skill content with streaming support
   * Uses NormalizedMessage format for all outputs
   */
  static async *generateStream(
    requestId: string,
    request: AIGenerationRequest,
    mainWindow: BrowserWindow | null = null
  ): AsyncGenerator<NormalizedMessage> {
    // Validate request
    const validationError = validateAIGenerationRequest(request);
    if (validationError) {
      yield createMessage('error', { error: validationError });
      return;
    }

    // Create abort controller
    const abortController = new AbortController();
    activeStreams.set(requestId, abortController);

    // Store original env vars
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    const originalBaseUrl = process.env.ANTHROPIC_BASE_URL;
    const originalClaudeCode = process.env.CLAUDECODE;

    let capturedSessionId: string | null = null;
    let sessionCreatedSent = false;

    try {
      // Debug: Log environment and paths for test debugging
      console.log('[AIService] === DEBUG INFO ===');
      console.log('[AIService] process.cwd():', process.cwd());
      console.log('[AIService] NODE_ENV:', process.env.NODE_ENV);
      console.log('[AIService] hasApiKey:', !!currentConfig?.apiKey);
      console.log('[AIService] baseUrl:', currentConfig?.baseUrl);
      console.log('[AIService] model:', currentConfig?.model);
      console.log('[AIService] targetPath:', request?.skillContext?.targetPath);
      console.log('[AIService] =====================');

      logger.info('Starting AI generation', 'AIService', {
        mode: request.mode,
        requestId,
        targetPath: request?.skillContext?.targetPath,
        cwd: process.cwd(),
        nodeEnv: process.env.NODE_ENV,
      });

      const userPrompt = AIService.buildUserPrompt(request);

      // Log user prompt to file
      logPromptToFile('USER PROMPT', userPrompt);

      // For modify mode, use the skill's directory; for new skills, use the target directory
      let workingDirectory: string;
      if (request.mode === 'modify' && request?.skillContext?.skillPath) {
        workingDirectory = request.skillContext.skillPath;
      } else if (request?.skillContext?.targetPath) {
        workingDirectory = request.skillContext.targetPath;
      } else {
        workingDirectory = process.cwd();
      }

      // Verify working directory exists
      if (!fs.existsSync(workingDirectory)) {
        console.error('[AIService] Working directory does not exist:', workingDirectory);
        yield createMessage('error', { error: `Working directory does not exist: ${workingDirectory}` });
        return;
      }

      console.log('[AIService] Working directory:', workingDirectory, 'Mode:', request.mode);

      const { query } = await loadSDK();

      // Set environment variables
      if (currentConfig?.apiKey) {
        process.env.ANTHROPIC_API_KEY = currentConfig.apiKey;
      }
      if (currentConfig?.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = currentConfig.baseUrl;
      }

      // CRITICAL: Unset CLAUDECODE to allow SDK to run inside Claude Code
      // The SDK refuses to run if it detects it's inside another Claude Code session
      delete process.env.CLAUDECODE;
      console.log('[AIService] Unset CLAUDECODE env var (was:', originalClaudeCode, ')');

      if (!currentConfig?.model) {
        yield createMessage('error', { error: 'AI model is not configured' });
        return;
      }

      // Build allowed/disallowed tools lists
      const allowedTools: string[] = ['Write', 'Read', 'Edit', 'Bash', 'Grep', 'Glob', 'Skill', 'NotebookEdit', 'TaskOutput', 'AskUserQuestion'];
      const disallowedTools: string[] = [];

      const execOptions = AIService.getExecutableOptions();

      // Build query options with permission callback
      // No custom system prompt - let skill-creator skill handle all guidance
      const queryOptions: any = {
        prompt: userPrompt,
        options: {
          // Use preset system prompt without any custom append
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
          },
          // Load CLAUDE.md from project, user, and local directories
          settingSources: ['project', 'user', 'local'],
          model: currentConfig.model,
          cwd: workingDirectory,
          // Tools preset for built-in tools
          tools: { type: 'preset', preset: 'claude_code' },
          allowedTools,
          disallowedTools,
          ...execOptions,
          stderr: (msg: string) => {
            logger.info('CLI stderr', 'AIService', { stderr: msg });
            // Also log to console for debugging
            console.log('[CLI stderr]', msg);
          },
        },
      };

      // Log the configuration being used
      logger.info('Query options configured', 'AIService', {
        model: currentConfig.model,
        hasApiKey: !!currentConfig.apiKey,
        baseUrl: currentConfig.baseUrl,
        workingDirectory,
      });

      // Add permission callback (canUseTool)
      queryOptions.options.canUseTool = async (toolName: string, input: any, context: any) => {
        const requiresInteraction = TOOLS_REQUIRING_INTERACTION.has(toolName);

        // Interactive tools bypass permission checks
        if (!requiresInteraction) {
          // Check disallowed tools
          const isDisallowed = disallowedTools.some(entry =>
            matchesToolPermission(entry, toolName, input)
          );
          if (isDisallowed) {
            return { behavior: 'deny' as const, message: 'Tool disallowed by settings' };
          }

          // Check allowed tools
          const isAllowed = allowedTools.some(entry =>
            matchesToolPermission(entry, toolName, input)
          );
          if (isAllowed) {
            return { behavior: 'allow' as const, updatedInput: input };
          }
        }

        // Request permission from user
        const requestId = createRequestId();
        const sessionId = capturedSessionId || request.id || null;

        // Send permission request to frontend
        const permissionMsg = createMessage('permission_request', {
          requestId,
          toolName,
          toolInput: input,
          context,
          sessionId: sessionId || undefined,
        });

        // Send to main window if available
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai:message', permissionMsg);
        }

        // Wait for user response
        const decision = await waitForToolApproval(requestId, {
          timeoutMs: requiresInteraction ? 0 : undefined,
          signal: context?.signal,
          sessionId: sessionId || undefined,
          toolName,
          input,
        });

        if (!decision) {
          return { behavior: 'deny' as const, message: 'Permission request timed out' };
        }

        if (decision.cancelled) {
          return { behavior: 'deny' as const, message: 'Permission request cancelled' };
        }

        if (decision.allow) {
          // Add to allowed list if remember is set
          if (decision.rememberEntry && !allowedTools.includes(decision.rememberEntry)) {
            allowedTools.push(decision.rememberEntry);
          }
          return { behavior: 'allow' as const, updatedInput: decision.updatedInput ?? input };
        }

        return { behavior: 'deny' as const, message: decision.message ?? 'User denied tool use' };
      };

      // Execute query
      console.log('[AIService] Executing query with options:', {
        model: currentConfig.model,
        cwd: workingDirectory,
        promptLength: userPrompt.length,
      });
      const stream = query(queryOptions);
      console.log('[AIService] Query initiated, starting stream processing...');

      // Process stream events
      let eventCount = 0;
      for await (const item of stream) {
        eventCount++;
        console.log(`[AIService] Stream event #${eventCount}:`, item.type, item.subtype || '');

        // Check for abort
        if (abortController.signal.aborted) {
          console.log('[AIService] Stream aborted');
          yield createMessage('complete', { aborted: true, exitCode: 0 });
          return;
        }

        // Capture session ID from first message
        if (item.session_id && !capturedSessionId) {
          capturedSessionId = item.session_id;

          // Register session
          activeSessions.set(capturedSessionId, {
            id: capturedSessionId,
            instance: stream,
            startTime: Date.now(),
            status: 'active',
            abortController,
            mainWindow,
          });

          // Send session_created event for new sessions
          if (!request.id && !sessionCreatedSent) {
            sessionCreatedSent = true;
            yield createMessage('session_created', {
              newSessionId: capturedSessionId,
              sessionId: capturedSessionId,
            });
          }
        }

        const sessionId = capturedSessionId || request.id || '';

        // Handle different message types
        switch (item.type) {
          case 'content_block_delta':
            // Streaming text delta
            if (item.delta?.text) {
              yield createMessage('stream_delta', {
                content: item.delta.text,
                sessionId,
              });
            }
            break;

          case 'content_block_stop':
            // Streaming ended for this block
            yield createMessage('stream_end', { sessionId });
            break;

          case 'assistant':
            // Full assistant message
            for (const piece of item.message?.content || []) {
              if (piece.type === 'text' && piece.text) {
                yield createMessage('text', {
                  content: piece.text,
                  role: 'assistant',
                  sessionId,
                });
              } else if (piece.type === 'tool_use') {
                yield createMessage('tool_use', {
                  toolName: piece.name,
                  toolInput: piece.input,
                  toolId: piece.id,
                  sessionId,
                });
              } else if (piece.type === 'thinking' && piece.thinking) {
                yield createMessage('thinking', {
                  content: piece.thinking,
                  sessionId,
                });
              }
            }
            break;

          case 'user':
            // Tool results in user message
            for (const piece of item.message?.content || []) {
              if (piece.type === 'tool_result') {
                yield createMessage('tool_result', {
                  toolId: piece.tool_use_id,
                  toolResult: {
                    content: typeof piece.content === 'string'
                      ? piece.content
                      : JSON.stringify(piece.content),
                    isError: Boolean(piece.is_error),
                  },
                  sessionId,
                });
              }
            }
            break;

          case 'system':
            if (item.subtype === 'init') {
              logger.debug('Session initialized', 'AIService', { sessionId: item.session_id });
            }
            break;

          case 'result':
            // Handle result with token budget
            if (item.modelUsage) {
              const modelKey = Object.keys(item.modelUsage)[0];
              const modelData = item.modelUsage[modelKey];
              if (modelData) {
                const inputTokens = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
                const outputTokens = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;
                const totalUsed = inputTokens + outputTokens;
                const contextWindow = parseInt(process.env.CONTEXT_WINDOW || '160000', 10);

                yield createMessage('status', {
                  text: 'token_budget',
                  tokenBudget: { used: totalUsed, total: contextWindow },
                  sessionId,
                });
              }
            }

            // Check for errors
            if (item.subtype?.startsWith('error')) {
              const errorMsg = item.errors?.join('; ') || item.subtype;
              yield createMessage('error', { error: errorMsg, sessionId });
              return;
            }
            break;
        }
      }

      // Generation complete
      if (capturedSessionId) {
        const session = activeSessions.get(capturedSessionId);
        if (session) {
          session.status = 'completed';
        }
      }

      yield createMessage('complete', {
        exitCode: 0,
        sessionId: capturedSessionId || request.id || '',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      logger.error('AI generation failed', 'AIService', {
        error: errorMessage,
        stack: errorStack,
        model: currentConfig?.model,
        baseUrl: currentConfig?.baseUrl,
      });

      // Log full error details to console for debugging
      console.error('[AIService] Generation failed:', error);

      yield createMessage('error', {
        error: errorMessage,
        sessionId: capturedSessionId || request.id || '',
      });
    } finally {
      // Restore environment variables
      if (originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      if (originalBaseUrl !== undefined) {
        process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
      } else {
        delete process.env.ANTHROPIC_BASE_URL;
      }
      // Restore CLAUDECODE environment variable
      if (originalClaudeCode !== undefined) {
        process.env.CLAUDECODE = originalClaudeCode;
      }

      activeStreams.delete(requestId);
      if (capturedSessionId) {
        activeSessions.delete(capturedSessionId);
      }
    }
  }

  /**
   * Cancel an active generation stream
   */
  static async cancelGeneration(requestId: string): Promise<boolean> {
    const controller = activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      activeStreams.delete(requestId);
      logger.info('AI generation cancelled', 'AIService', { requestId });
      return true;
    }

    // Also check sessions
    return AIService.abortSession(requestId);
  }

  // --------------------------------------------------------------------------
  // Connection Testing
  // --------------------------------------------------------------------------

  static async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    const originalBaseUrl = process.env.ANTHROPIC_BASE_URL;

    try {
      logger.info('Testing AI connection', 'AIService');
      const startTime = Date.now();

      const { query } = await loadSDK();

      if (currentConfig?.apiKey) {
        process.env.ANTHROPIC_API_KEY = currentConfig.apiKey;
      }
      if (currentConfig?.baseUrl) {
        process.env.ANTHROPIC_BASE_URL = currentConfig.baseUrl;
      }

      if (!currentConfig?.model) {
        return { success: false, error: 'AI model is not configured' };
      }

      const execOptions = AIService.getExecutableOptions();
      const stream = query({
        prompt: 'Say "OK" if you can read this.',
        options: {
          model: currentConfig.model,
          ...execOptions,
          stderr: (msg: string) => {
            logger.info('CLI stderr', 'AIService', { stderr: msg });
          },
        },
      });

      for await (const item of stream) {
        if (item.type === 'assistant') {
          break;
        }
      }

      const latency = Date.now() - startTime;
      logger.info('AI connection test successful', 'AIService');
      return { success: true, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI connection test failed', 'AIService', error);
      return { success: false, error: errorMessage };
    } finally {
      if (originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      if (originalBaseUrl !== undefined) {
        process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
      } else {
        delete process.env.ANTHROPIC_BASE_URL;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Prompt Building (Simplified)
  // --------------------------------------------------------------------------

  private static buildUserPrompt(request: AIGenerationRequest): string {
    const { mode, prompt, skillContext } = request;
    // All non-new modes use skillPath - AI will use Read tool to get content
    // Use "New Skill" for new mode, actual name for others, or "Untitled" as fallback
    const skillName = mode === 'new' ? 'New Skill' : (skillContext?.name || 'Untitled');
    const targetPath = skillContext?.targetPath;
    const skillPath = skillContext?.skillPath;

    // Strip any existing /skill-creator prefix from user input to avoid duplication
    let cleanPrompt = prompt.trim();
    if (cleanPrompt.startsWith('/skill-creator')) {
      cleanPrompt = cleanPrompt.replace(/^\/skill-creator\s*/i, '').trim();
    }

    // Build context section with save location - make it VERY explicit
    let contextSection = '';
    if (mode === 'new' && targetPath) {
      contextSection = `

## CRITICAL: Save Location
You MUST save the skill to this EXACT directory (use absolute path):
${targetPath}/<skill-name>/SKILL.md

IMPORTANT:
- Do NOT save to ~/.claude/skills or any other location
- Do NOT use the global Claude skills directory
- Use the path above which is the project's local skills directory
- The file MUST be named "SKILL.md" (uppercase)`;
    } else if (skillPath) {
      // All non-new modes: provide skillPath, AI will use Read tool
      contextSection = `

## CRITICAL: File Location and Save Instructions
The skill file is located at: ${skillPath}/SKILL.md

IMPORTANT Instructions:
1. First, use the Read tool to read the current content from: ${skillPath}/SKILL.md
2. Perform the requested operation
3. Save the changes to the EXACT same path: ${skillPath}/SKILL.md
4. Do NOT create a new directory. Do NOT change the location.`;
    }

    // Prepend /skill-creator to invoke the skill-creator skill
    const skillCreatorPrefix = '/skill-creator\n\n';

    switch (mode) {
      case 'new':
        return `${skillCreatorPrefix}Create a new skill with these requirements:\n\n${cleanPrompt}${contextSection}`;

      case 'modify':
        return `${skillCreatorPrefix}Modify the skill "${skillName}" with these instructions:\n\n${cleanPrompt}${contextSection}`;

      case 'insert':
        return `${skillCreatorPrefix}Insert content at position ${skillContext?.cursorPosition ?? 0} in the skill "${skillName}":\n\n${cleanPrompt}${contextSection}`;

      case 'replace':
        return `${skillCreatorPrefix}Replace the selected text in skill "${skillName}":\n\nSelected text: "${skillContext?.selectedText || ''}"\n\nInstructions: ${cleanPrompt}${contextSection}`;

      case 'evaluate':
        return `${skillCreatorPrefix}Evaluate the skill "${skillName}":\n\nFocus: ${cleanPrompt || 'General'}${contextSection}`;

      case 'benchmark':
        return `${skillCreatorPrefix}Benchmark the skill "${skillName}":\n\nFocus: ${cleanPrompt || 'General'}${contextSection}`;

      case 'optimize':
        return `${skillCreatorPrefix}Optimize the skill "${skillName}" for better triggering:\n\nFocus: ${cleanPrompt || 'Triggering accuracy'}${contextSection}`;

      default:
        return `${skillCreatorPrefix}${cleanPrompt}`;
    }
  }
}
