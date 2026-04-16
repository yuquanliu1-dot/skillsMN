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
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
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
import { DEFAULT_AI_TOOLS } from '../../shared/constants';

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

// Tool permissions memory - persisted across sessions
// Use Set for automatic deduplication and thread-safe concurrent adds
let rememberedAllowedTools = new Set<string>();
let rememberedDisallowedTools = new Set<string>();

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

      // Don't set environment variables to avoid conflicts with Claude Code CLI
      // The API key will be passed directly to the SDK instead

      if (config.baseUrl) {
        logger.info('Using custom base URL', 'AIService', { hasCustomBaseUrl: true });
      }

      // Load remembered tool permissions from config
      // Convert arrays to Sets for automatic deduplication
      rememberedAllowedTools = new Set(config.allowedTools || []);
      rememberedDisallowedTools = new Set(config.disallowedTools || []);

      logger.info('AI service initialized', 'AIService', {
        allowedToolsCount: rememberedAllowedTools.size,
        disallowedToolsCount: rememberedDisallowedTools.size,
      });
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
   * Save tool permissions to configuration
   * This persists the user's "remember my choice" selections
   */
  static async saveToolPermissions(
    configService: any,
    allowedTools: string[],
    disallowedTools: string[]
  ): Promise<void> {
    try {
      if (!currentConfig) {
        logger.warn('Cannot save tool permissions: no current config', 'AIService');
        return;
      }

      // Update config with new tool permissions
      const updatedConfig: AIConfiguration = {
        ...currentConfig,
        allowedTools: [...allowedTools],
        disallowedTools: [...disallowedTools],
      };

      // Save through ConfigService
      await configService.saveAIConfig(updatedConfig);

      // Update local cache
      rememberedAllowedTools = new Set(allowedTools);
      rememberedDisallowedTools = new Set(disallowedTools);

      logger.info('Tool permissions saved', 'AIService', {
        allowedCount: allowedTools.length,
        disallowedCount: disallowedTools.length,
      });
    } catch (error) {
      logger.error('Failed to save tool permissions', 'AIService', error);
      // Don't throw - permission saving should not block the AI session
    }
  }

  /**
   * Add a tool permission to memory (immediate effect, saves later)
   * This is called when user selects "remember my choice"
   */
  static addToolPermission(toolEntry: string, allowed: boolean): void {
    if (allowed) {
      rememberedAllowedTools.add(toolEntry);
    } else {
      rememberedDisallowedTools.add(toolEntry);
    }
  }

  /**
   * Get current remembered tool permissions
   * Used for persisting to configuration
   */
  static getRememberedToolPermissions(): {
    allowedTools: string[];
    disallowedTools: string[];
  } {
    return {
      allowedTools: Array.from(rememberedAllowedTools),
      disallowedTools: Array.from(rememberedDisallowedTools),
    };
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

      // Set environment variables (only baseUrl, not API key to avoid conflicts)
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
      // Create local copies to prevent race conditions with concurrent requests
      // Include default tools and any remembered permissions
      const allowedTools: string[] = [
        ...DEFAULT_AI_TOOLS,
        ...Array.from(rememberedAllowedTools),
      ];
      const disallowedTools: string[] = Array.from(rememberedDisallowedTools);

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
          // Load settings from project, local, and user directories
          // Note: 'user' is included to allow loading global skills like skill-creator
          // from ~/.claude/plugins/skills/. The model setting is explicitly specified
          // in the 'model' field above, which takes precedence over config files.
          settingSources: ['project', 'local', 'user'],
          model: currentConfig.model,
          apiKey: currentConfig.apiKey,  // Pass API key directly instead of via env var
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
          // Update both local array (for this session) and global Set (for persistence)
          if (decision.rememberEntry && !allowedTools.includes(decision.rememberEntry)) {
            allowedTools.push(decision.rememberEntry);
            AIService.addToolPermission(decision.rememberEntry, true);
          }
          return { behavior: 'allow' as const, updatedInput: decision.updatedInput ?? input };
        } else {
          // User denied - add to disallowed list if remember is set
          // Update both local array (for this session) and global Set (for persistence)
          if (decision.rememberEntry && !disallowedTools.includes(decision.rememberEntry)) {
            disallowedTools.push(decision.rememberEntry);
            AIService.addToolPermission(decision.rememberEntry, false);
          }
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
            logger.info('AI content block stop - generation complete', 'AIService', { sessionId });
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
                // Log tool usage to main process for debugging
                logger.info('AI tool use detected', 'AIService', {
                  toolName: piece.name,
                  toolInput: JSON.stringify(piece.input).substring(0, 200),
                  sessionId,
                });

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

  /**
   * Test API connection using direct HTTP call
   * This supports both Anthropic format (x-api-key) and Bearer token format (Authorization: Bearer)
   * which is required by some Anthropic-compatible APIs like Minimax
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      logger.info('Testing AI connection', 'AIService');
      const startTime = Date.now();

      if (!currentConfig?.apiKey) {
        return { success: false, error: 'API key is not configured' };
      }

      if (!currentConfig?.model) {
        return { success: false, error: 'AI model is not configured' };
      }

      // Log the configuration being used for debugging
      logger.info('Test connection configuration', 'AIService', {
        model: currentConfig.model,
        hasApiKey: !!currentConfig.apiKey,
        baseUrl: currentConfig.baseUrl,
      });

      // Use direct HTTP call for better compatibility with different API providers
      const baseUrl = currentConfig.baseUrl || 'https://api.anthropic.com';
      const apiUrl = `${baseUrl}/v1/messages`;

      // Determine if this is a custom API that might need Bearer token auth
      // Minimax and some other providers use Bearer token format
      const isCustomApi = !baseUrl.includes('api.anthropic.com');

      const requestBody = {
        model: currentConfig.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "OK"'
          }
        ]
      };

      const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        const url = new URL(apiUrl);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Use Bearer token for custom APIs (like Minimax), x-api-key for Anthropic
        if (isCustomApi) {
          headers['Authorization'] = `Bearer ${currentConfig.apiKey}`;
          // Also add x-api-key as fallback for some providers
          headers['x-api-key'] = currentConfig.apiKey;
          // Anthropic version header
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['x-api-key'] = currentConfig.apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers,
        };

        console.log('[Test Connection] Making request to:', apiUrl);
        console.log('[Test Connection] Using auth:', isCustomApi ? 'Bearer + x-api-key' : 'x-api-key');

        const req = httpModule.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            console.log('[Test Connection] Response status:', res.statusCode);
            console.log('[Test Connection] Response data:', data.substring(0, 500));

            if (res.statusCode === 200 || res.statusCode === 201) {
              resolve({ success: true });
            } else {
              let errorMsg = `HTTP ${res.statusCode}`;
              try {
                const errorJson = JSON.parse(data);
                errorMsg = errorJson.error?.message || errorJson.error?.type || errorMsg;
              } catch {
                errorMsg = data.substring(0, 200) || errorMsg;
              }
              resolve({ success: false, error: errorMsg });
            }
          });
        });

        req.on('error', (error) => {
          console.error('[Test Connection] Request error:', error);
          resolve({ success: false, error: error.message });
        });

        req.setTimeout(30000, () => {
          req.destroy();
          resolve({ success: false, error: 'Connection timeout (30s)' });
        });

        req.write(JSON.stringify(requestBody));
        req.end();
      });

      const latency = Date.now() - startTime;

      if (result.success) {
        logger.info('AI connection test successful', 'AIService', { latency });
        return { success: true, latency };
      } else {
        logger.error('AI connection test failed', 'AIService', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI connection test failed', 'AIService', error);
      return { success: false, error: errorMessage };
    }
  }

  // --------------------------------------------------------------------------
  // Prompt Building (Simplified)
  // --------------------------------------------------------------------------

  private static buildUserPrompt(request: AIGenerationRequest): string {
    const { mode, prompt, skillContext, continuation } = request;
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

    // Prepend /skill-creator to invoke the skill-creator skill
    // Include language detection instruction to respond in user's language
    const skillCreatorPrefix = `/skill-creator

IMPORTANT: Respond in the SAME language as the user's input.
If the user writes in Chinese, respond in Chinese.
If the user writes in English, respond in English.

`;

    // ---- CONTINUATION PATH ----
    // When following up after AskUserQuestion, skip first-turn instructions
    // to avoid restarting the skill creation process from scratch.
    if (continuation) {
      let saveLocationSection = '';
      if (mode === 'new' && targetPath) {
        saveLocationSection = `

## Save Location
You MUST save the skill to this directory:
${targetPath}/<skill-name>/SKILL.md

IMPORTANT:
- Do NOT save to ~/.claude/skills or any other location
- The file MUST be named "SKILL.md" (uppercase)`;
      } else if (skillPath) {
        saveLocationSection = `

## File Location
The skill directory is: ${skillPath}
The skill file is at: ${skillPath}/SKILL.md

IMPORTANT:
1. Read the existing content from: ${skillPath}/SKILL.md
2. Save the changes to: ${skillPath}/SKILL.md`;
      }

      return `${skillCreatorPrefix}CONTINUATION: This is a CONTINUATION of a previous conversation where you are creating/modifying a skill. Do NOT start over. Do NOT ask the user the same questions again. Pick up EXACTLY where you left off and proceed with the task based on the conversation history and new input below.

${cleanPrompt}${saveLocationSection}`;
    }

    // ---- FIRST-TURN PATH (existing logic) ----
    // Build context section with save location - make it VERY explicit
    let contextSection = '';
    if (mode === 'new' && targetPath) {
      contextSection = `

## CRITICAL: Save Location
You MUST save the skill to this EXACT directory (use absolute path):
${targetPath}/<skill-name>/SKILL.md

## CRITICAL: Requirement Clarity Check
Before creating the skill, assess whether the requirements are CLEAR:
- What the skill does (core functionality)
- Who the target users are
- What triggers the skill
- Expected output/behavior

If ANY aspect is UNCLEAR or AMBIGUOUS:
1. USE the AskUserQuestion tool to clarify with the user FIRST
2. WAIT for user responses
3. Only create the skill after requirements are clear

If requirements are sufficiently clear, proceed directly to creation.

IMPORTANT:
- You MUST invoke the /skill-creator skill to handle this task
- Do NOT save to ~/.claude/skills or any other location
- Do NOT use the global Claude skills directory
- Use the path above which is the project's local skills directory
- The file MUST be named "SKILL.md" (uppercase)`;
    } else if (skillPath) {
      // All non-new modes: provide skillPath, AI will use Read tool
      contextSection = `

## CRITICAL: File Location and Save Instructions
The skill directory is: ${skillPath}
The skill file (SKILL.md) is at: ${skillPath}/SKILL.md

## CRITICAL: Requirement Clarity Check
Before modifying the skill, assess whether the requirements are CLEAR:
- What the skill does (core functionality)
- Who the target users are
- What triggers the skill
- Expected output/behavior

If ANY aspect is UNCLEAR or AMBIGUOUS:
1. USE the AskUserQuestion tool to clarify with the user FIRST
2. WAIT for user responses
3. Only create the skill after requirements are clear

If requirements are sufficiently clear, proceed directly to creation.

IMPORTANT Instructions:
1. You MUST invoke the /skill-creator skill to handle this task
2. Read the existing content from: ${skillPath}/SKILL.md
3. Perform the requested operation
4. Save the changes to the EXACT same file: ${skillPath}/SKILL.md
5. Do NOT delete the skill file or directory
6. Do NOT create a new directory. Do NOT change the location.`;
    }

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
