/**
 * AI Skill Sidebar Component
 *
 * A conversational sidebar for AI-powered skill creation with chat history
 * This is a sidebar version of AISkillCreationDialog with multi-turn conversation support
 * Includes persistent conversation history storage
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { PermissionRequestPanel } from './PermissionRequestPanel';
import ConfirmDialog from './ConfirmDialog';
import type { Configuration, AIConversation, AIConversationMessage, PermissionDecision, AIGenerationMode } from '../../shared/types';
import StreamingMarkdown from './StreamingMarkdown';

interface AISkillSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated: (skillInfo?: { name: string; path: string }) => void;
  onSkillModified?: (filePath?: string) => void;
  config: Configuration | null;
  currentSkillContent?: string;
  currentSkillName?: string;
  /** Full path to the current skill directory (for modify mode - ensures writes go to this directory) */
  currentSkillPath?: string;
  /** Callback when AI streaming state changes */
  onStreamingChange?: (isStreaming: boolean) => void;
  /** Callback to show toast notification */
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

/**
 * Internal message type that uses Date for timestamp
 * (for display purposes in the component)
 */
interface InternalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; input?: any }>;
}

/**
 * Convert stored message (with string timestamp) to internal message (with Date timestamp)
 */
function toInternalMessage(msg: AIConversationMessage): InternalMessage {
  return {
    ...msg,
    timestamp: new Date(msg.timestamp),
  };
}

/**
 * Convert internal message (with Date timestamp) to stored message (with string timestamp)
 */
function toStoredMessage(msg: InternalMessage): AIConversationMessage {
  return {
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  };
}

/**
 * Generate unique ID for messages and conversations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Message compression configuration
 */
const MESSAGE_COMPRESSION = {
  /** Maximum number of messages to include in context */
  MAX_MESSAGES: 20,
  /** Maximum total characters for conversation context */
  MAX_CONTEXT_CHARS: 15000,
  /** Minimum messages to keep (most recent) */
  MIN_KEEP_MESSAGES: 6,
  /** Warning threshold for prompt size (in characters) */
  WARNING_THRESHOLD_CHARS: 20000,
  /** Hard limit for prompt size (in characters) */
  HARD_LIMIT_CHARS: 50000,
};

/**
 * Estimate token count from character count
 * Rough approximation: ~4 characters per token for English text
 */
function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}

/**
 * Compress conversation history to fit within token limits
 * Strategy: Keep most recent messages, truncate old messages if needed
 */
function compressMessages(messages: InternalMessage[]): InternalMessage[] {
  if (messages.length === 0) return messages;

  // Always filter out streaming messages first
  const nonStreaming = messages.filter((m) => !m.isStreaming);

  // If within limits, return as-is
  if (nonStreaming.length <= MESSAGE_COMPRESSION.MAX_MESSAGES) {
    const totalChars = nonStreaming.reduce((sum, m) => sum + m.content.length, 0);
    if (totalChars <= MESSAGE_COMPRESSION.MAX_CONTEXT_CHARS) {
      return nonStreaming;
    }
  }

  // Keep most recent messages
  const recentMessages = nonStreaming.slice(-MESSAGE_COMPRESSION.MAX_MESSAGES);

  // Check if still over char limit
  let totalChars = recentMessages.reduce((sum, m) => sum + m.content.length, 0);

  if (totalChars <= MESSAGE_COMPRESSION.MAX_CONTEXT_CHARS) {
    return recentMessages;
  }

  // Need to truncate - keep minimum recent messages and truncate older ones
  const result: InternalMessage[] = [];
  let currentChars = 0;

  // Process from newest to oldest, then reverse
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const msgLength = msg.content.length;

    // Always keep the most recent MIN_KEEP_MESSAGES
    if (result.length < MESSAGE_COMPRESSION.MIN_KEEP_MESSAGES) {
      if (msgLength > 2000) {
        // Truncate individual long messages
        const truncatedContent = msg.content.substring(0, 2000) + '\n...[truncated]';
        result.unshift({
          ...msg,
          content: truncatedContent,
        });
        currentChars += truncatedContent.length;
      } else {
        result.unshift(msg);
        currentChars += msgLength;
      }
    } else if (currentChars + msgLength <= MESSAGE_COMPRESSION.MAX_CONTEXT_CHARS) {
      if (msgLength > 1500) {
        // Truncate older long messages more aggressively
        const truncatedContent = msg.content.substring(0, 1500) + '\n...[truncated]';
        result.unshift({
          ...msg,
          content: truncatedContent,
        });
        currentChars += truncatedContent.length;
      } else {
        result.unshift(msg);
        currentChars += msgLength;
      }
    }
    // If we can't fit more messages, stop
  }

  console.log('[AISkillSidebar] Compressed messages:', {
    original: messages.length,
    result: result.length,
    totalChars: currentChars,
  });

  return result;
}

/**
 * Generate a title from the first user message
 */
function generateTitle(content: string): string {
  const maxLen = 40;
  const title = content.trim().split('\n')[0];
  return title.length > maxLen ? title.substring(0, maxLen) + '...' : title;
}

/**
 * Preset prompt category keys for mode determination
 */
const PRESET_CATEGORY_KEYS = {
  CREATE: 'create',
  MODIFY_IMPROVE: 'modifyImprove',
  EVALUATE: 'evaluate',
  BENCHMARK: 'benchmark',
  OPTIMIZE_TRIGGERING: 'optimizeTriggering',
} as const;

/**
 * Get recommended prompts with internationalization
 */
const getRecommendedPrompts = (t: (key: string, options?: any) => string) => [
  {
    categoryKey: PRESET_CATEGORY_KEYS.CREATE,
    category: t('aiSidebar.promptCategories.create'),
    items: [
      { label: t('aiSidebar.promptsList.newSkill'), prompt: t('aiSidebar.promptsList.newSkillPrompt') },
    ],
  },
  {
    categoryKey: PRESET_CATEGORY_KEYS.MODIFY_IMPROVE,
    category: t('aiSidebar.promptCategories.modifyImprove'),
    items: [
      { label: t('aiSidebar.promptsList.enhanceSkill'), prompt: t('aiSidebar.promptsList.enhanceSkillPrompt') },
      { label: t('aiSidebar.promptsList.fixIssue'), prompt: t('aiSidebar.promptsList.fixIssuePrompt') },
    ],
  },
  {
    categoryKey: PRESET_CATEGORY_KEYS.EVALUATE,
    category: t('aiSidebar.promptCategories.evaluate'),
    items: [
      { label: t('aiSidebar.promptsList.runEvals'), prompt: t('aiSidebar.promptsList.runEvalsPrompt') },
      { label: t('aiSidebar.promptsList.testTriggers'), prompt: t('aiSidebar.promptsList.testTriggersPrompt') },
      { label: t('aiSidebar.promptsList.edgeCases'), prompt: t('aiSidebar.promptsList.edgeCasesPrompt') },
    ],
  },
  {
    categoryKey: PRESET_CATEGORY_KEYS.BENCHMARK,
    category: t('aiSidebar.promptCategories.benchmark'),
    items: [
      { label: t('aiSidebar.promptsList.performance'), prompt: t('aiSidebar.promptsList.performancePrompt') },
      { label: t('aiSidebar.promptsList.varianceAnalysis'), prompt: t('aiSidebar.promptsList.varianceAnalysisPrompt') },
      { label: t('aiSidebar.promptsList.compare'), prompt: t('aiSidebar.promptsList.comparePrompt') },
    ],
  },
  {
    categoryKey: PRESET_CATEGORY_KEYS.OPTIMIZE_TRIGGERING,
    category: t('aiSidebar.promptCategories.optimizeTriggering'),
    items: [
      { label: t('aiSidebar.promptsList.improveDescription'), prompt: t('aiSidebar.promptsList.improveDescriptionPrompt') },
      { label: t('aiSidebar.promptsList.betterTriggers'), prompt: t('aiSidebar.promptsList.betterTriggersPrompt') },
    ],
  },
];

/**
 * Question type for AskUserQuestion tool
 */
interface PendingQuestion {
  question: string;
  header: string;
  options: Array<{
    label: string;
    description?: string;
    preview?: string;
  }>;
  multiSelect: boolean;
  selectedOptions: Set<number>;
  customValues: Map<number, string>;
}

/**
 * AskUserQuestion tool input structure
 */
interface AskUserQuestionInput {
  questions: Array<{
    question: string;
    header?: string;
    options: Array<{
      label: string;
      description?: string;
      preview?: string;
    }>;
    multiSelect?: boolean;
  }>;
}

export const AISkillSidebar: React.FC<AISkillSidebarProps> = ({
  isOpen,
  onClose,
  onSkillCreated,
  onSkillModified,
  config,
  currentSkillContent,
  currentSkillName,
  currentSkillPath,
  onStreamingChange,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Track selected preset prompt category for mode determination
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string | null>(null);

  // Attached files for skill creation - only store paths
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    name: string;
    path: string;
  }>>([]);

  // Pending questions from AskUserQuestion tool
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [isWaitingForAnswers, setIsWaitingForAnswers] = useState(false);

  // Track IME composition state to prevent sending messages while inputting Chinese
  const [isComposing, setIsComposing] = useState(false);

  // Conversation history state
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  // Track the created skill name to update conversation history
  // Use ref for immediate access in onComplete callback (state updates are async)
  const createdSkillNameRef = useRef<string | null>(null);

  // Track currentConversationId to avoid race conditions when saving conversations
  const currentConversationIdRef = useRef<string | null>(null);

  // Update ref when currentConversationId changes
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Track the previous skill path to detect actual skill changes vs. initial skill creation
  const prevSkillPathRef = useRef<string | undefined>(currentSkillPath);

  const {
    status,
    content,
    error,
    toolCalls,
    pendingPermissions,
    isStreaming,
    isComplete,
    isIdle,
    isWaitingPermission,
    generate,
    stop,
    reset,
    resolvePermission,
    abort,
  } = useAIGeneration({
    onComplete: async (finalContent, finalToolCalls) => {
      console.log('[AISkillSidebar] AI skill generation complete');
      console.log('[AISkillSidebar] finalToolCalls:', finalToolCalls);
      console.log('[AISkillSidebar] currentSkillPath:', currentSkillPath);

      // STRATEGY: When modifying existing skill, always refresh editor and file tree
      // Try to get filePath from any tool call, but refresh regardless
      if (currentSkillPath) {
        console.log('[AISkillSidebar] Current skill path exists, treating as modification');
        console.log('[AISkillSidebar] currentSkillPath:', currentSkillPath);

        // Try to get file path from any tool (Write, Edit, or other tools with file_path)
        let filePath: string | undefined = undefined;
        const toolWithFilePath = finalToolCalls.find(t => t.input?.file_path);
        if (toolWithFilePath?.input?.file_path) {
          filePath = toolWithFilePath.input.file_path as string;
          console.log('[AISkillSidebar] Found file path from', toolWithFilePath.name, 'tool:', filePath);
        }

        // Show completion toast
        onShowToast?.('AI response complete!', 'success');

        // CRITICAL: Always refresh editor and file tree after AI completes
        // This ensures any changes made by skills or other tools are reflected
        console.log('[AISkillSidebar] Refreshing editor and file tree, filePath:', filePath);
        onSkillModified?.(filePath);
        onSkillCreated(); // This triggers file tree refresh
        return;
      }

      // Check for new skill creation (only when currentSkillPath is undefined)
      // Look for Write tool in the tool calls
      const writeToolCall = finalToolCalls.find(t => t.name === 'Write');
      if (writeToolCall?.input?.file_path) {
        const filePath = writeToolCall.input.file_path as string;
        console.log('[AISkillSidebar] Write tool found, checking for new skill creation');
        console.log('[AISkillSidebar] file_path:', filePath);

        // Extract skill name from path (e.g., /path/to/skills/skill-name/SKILL.md -> skill-name)
        const pathParts = filePath.replace(/\\/g, '/').split('/');
        const skillsIndex = pathParts.findIndex(p => p === 'skills');
        console.log('[AISkillSidebar] Checking for new skill creation, skillsIndex:', skillsIndex);

        if (skillsIndex !== -1 && pathParts.length > skillsIndex + 1) {
          const skillName = pathParts[skillsIndex + 1];
          console.log('[AISkillSidebar] Skill created:', skillName, 'at path:', filePath);
          // Store in ref for immediate access in saveCurrentConversation
          createdSkillNameRef.current = skillName;
          console.log('[AISkillSidebar] Set createdSkillNameRef.current to:', createdSkillNameRef.current);
          // Show completion toast
          onShowToast?.(`Skill "${skillName}" created successfully!`, 'success');
          onSkillCreated({ name: skillName, path: filePath });
          return;
        }
      }

      // Default behavior for new skill mode without clear creation
      console.log('[AISkillSidebar] No current skill path and no new skill created, default completion');
      onSkillCreated();
    },
    onError: (errorMessage) => {
      console.error('AI skill generation error:', errorMessage);
      // Show error toast to notify user
      onShowToast?.(`AI generation failed: ${errorMessage}`, 'error');
    },
  });

  /**
   * Load conversation history on mount or when skill changes
   * NOTE: We don't clear conversation when transitioning from "new skill" to "edit skill" mode
   * after AI creates a skill, because the user's conversation should be preserved.
   */
  useEffect(() => {
    // Check if this is a transition from new skill creation to edit mode
    // (previous path was undefined, current path is now defined = skill was just created)
    const isTransitionFromCreation = prevSkillPathRef.current === undefined && currentSkillPath !== undefined;

    if (isOpen) {
      // Only clear conversation when:
      // 1. Skill path didn't change (just opening the sidebar), OR
      // 2. User switched to a different existing skill (not from creation)
      if (!isTransitionFromCreation) {
        // Reset current conversation when skill changes
        setMessages([]);
        setCurrentConversationId(null);
        createdSkillNameRef.current = null;
        reset();
      }
      loadConversations();
    }

    // Update the ref to track skill path changes
    prevSkillPathRef.current = currentSkillPath;
  }, [isOpen, currentSkillPath]);

  /**
   * Handle clicking outside menus to close them
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (promptMenuRef.current && !promptMenuRef.current.contains(event.target as Node)) {
        setShowPromptMenu(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target as Node)) {
        setShowHistoryMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Load all conversations from storage, filtered by current skill
   * Limited to MAX_CONVERSATIONS to prevent memory/performance issues
   */
  const MAX_CONVERSATIONS = 50;

  const loadConversations = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await window.electronAPI.loadAIConversations();
      if (response.success && response.data) {
        // Filter conversations by current skill
        const filtered = currentSkillName
          ? response.data.filter(c => c.skillName === currentSkillName)
          : response.data.filter(c => !c.skillName); // Show unassociated conversations when no skill is open

        // Sort by updatedAt (most recent first) and limit to prevent performance issues
        const sorted = filtered.sort((a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
        const limited = sorted.slice(0, MAX_CONVERSATIONS);

        setConversations(limited);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentSkillName]);

  /**
   * Save current conversation to storage
   * If a new skill was just created, associate the conversation with that skill
   */
  const saveCurrentConversation = useCallback(async (
    msgs: InternalMessage[],
    conversationId: string | null,
    newSkillName?: string | null
  ): Promise<string | null> => {
    if (msgs.length === 0) return null;

    const now = new Date().toISOString();
    const firstUserMessage = msgs.find(m => m.role === 'user');
    const title = firstUserMessage ? generateTitle(firstUserMessage.content) : 'New Conversation';

    // Use the newly created skill name if provided, otherwise use current skill name
    const effectiveSkillName = newSkillName || currentSkillName;
    console.log('[AISkillSidebar] saveCurrentConversation - newSkillName:', newSkillName, 'currentSkillName:', currentSkillName, 'effectiveSkillName:', effectiveSkillName);

    const conversation: AIConversation = {
      id: conversationId || generateId(),
      title,
      messages: msgs.map(toStoredMessage),
      createdAt: conversationId
        ? (conversations.find(c => c.id === conversationId)?.createdAt || now)
        : now,
      updatedAt: now,
      skillName: effectiveSkillName,
      skillPath: currentSkillPath,
    };

    console.log('[AISkillSidebar] Saving conversation with skillName:', conversation.skillName);

    try {
      const response = await window.electronAPI.saveAIConversation(conversation);
      if (response.success) {
        await loadConversations();
        return conversation.id;
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
    return null;
  }, [conversations, currentSkillName, currentSkillPath, loadConversations]);

  /**
   * Load a specific conversation
   */
  const handleLoadConversation = useCallback((conversation: AIConversation) => {
    setMessages(conversation.messages.map(toInternalMessage));
    setCurrentConversationId(conversation.id);
    setShowHistoryMenu(false);
    reset();
  }, [reset]);

  /**
   * Delete a conversation - show confirmation first
   */
  const handleDeleteConversation = useCallback((conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Confirm and execute conversation deletion
   */
  const confirmDeleteConversation = useCallback(async () => {
    if (!conversationToDelete) return;

    try {
      await window.electronAPI.deleteAIConversation(conversationToDelete);
      await loadConversations();
      if (currentConversationId === conversationToDelete) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setShowDeleteConfirm(false);
      setConversationToDelete(null);
    }
  }, [conversationToDelete, currentConversationId, loadConversations]);

  /**
   * Start a new conversation
   */
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    createdSkillNameRef.current = null; // Reset created skill name ref
    reset();
    setShowHistoryMenu(false);
  }, [reset]);

  /**
   * Handle selecting a prompt from the menu
   */
  const handleSelectPrompt = useCallback((prompt: string, category?: string) => {
    setInputValue(prompt);
    setSelectedPresetCategory(category || null);
    setShowPromptMenu(false);
    inputRef.current?.focus();
  }, []);

  /**
   * Handle file selection for attachments - uses Electron dialog to get file paths
   */
  const handleFileSelect = useCallback(async () => {
    if (isStreaming) return;

    try {
      const response = await window.electronAPI.selectFiles({
        multiple: true,
        filters: [], // Allow all file types
      });

      if (response.success && response.data && !response.data.canceled) {
        const { filePaths } = response.data;
        if (filePaths && filePaths.length > 0) {
          const newFiles = filePaths.map((filePath) => ({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: filePath.split(/[/\\]/).pop() || filePath,
            path: filePath,
          }));
          setAttachedFiles((prev) => [...prev, ...newFiles]);
        }
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  }, [isStreaming]);

  /**
   * Remove an attached file
   */
  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * Toggle tool call expansion
   */
  const toggleToolExpansion = useCallback((toolKey: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) {
        next.delete(toolKey);
      } else {
        next.add(toolKey);
      }
      return next;
    });
  }, []);

  /**
   * Auto-expand the last tool call during streaming
   * Previous tool calls are collapsed, only the latest one is expanded
   */
  useEffect(() => {
    if (isStreaming && toolCalls.length > 0) {
      // Find the streaming message to get its ID
      const streamingMsg = messages.find(m => m.isStreaming);
      if (streamingMsg) {
        // Only expand the last tool call, collapse all others
        const lastToolIndex = toolCalls.length - 1;
        const lastToolKey = `${streamingMsg.id}-${lastToolIndex}`;
        setExpandedTools(new Set([lastToolKey]));
      }
    }
  }, [isStreaming, toolCalls.length, messages]);

  /**
   * Scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, content]);

  /**
   * Notify parent when streaming state changes
   */
  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  /**
   * Focus input when sidebar opens
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Update streaming message with content and tool calls
   * This must trigger whenever toolCalls changes, even without text content
   */
  useEffect(() => {
    if (isStreaming && (content || toolCalls.length > 0)) {
      setMessages((prev) => {
        const streamingMsgIndex = prev.findIndex((m) => m.isStreaming);
        if (streamingMsgIndex >= 0) {
          const currentMsg = prev[streamingMsgIndex];
          // Only update if there's actual changes
          const hasContentChanges = content !== currentMsg.content;
          const hasToolChanges = toolCalls.length !== (currentMsg.toolCalls?.length || 0) ||
            JSON.stringify(toolCalls) !== JSON.stringify(currentMsg.toolCalls || []);

          if (hasContentChanges || hasToolChanges) {
            const updated = [...prev];
            updated[streamingMsgIndex] = {
              ...updated[streamingMsgIndex],
              content,
              toolCalls,
            };
            return updated;
          }
        }
        return prev;
      });
    }
  }, [content, isStreaming, toolCalls]);

  /**
   * Detect AskUserQuestion tool calls and extract questions
   * IMPORTANT: Stop streaming immediately to wait for user answers
   */
  useEffect(() => {
    if (toolCalls && toolCalls.length > 0) {
      const askUserTool = toolCalls.find(t => t.name === 'AskUserQuestion');
      if (askUserTool?.input) {
        const input = askUserTool.input as AskUserQuestionInput;
        if (input.questions && Array.isArray(input.questions)) {
          const questions: PendingQuestion[] = input.questions.map((q) => ({
            question: q.question || '',
            header: q.header || '',
            options: (q.options || []).map(opt => ({
              label: opt.label || '',
              description: opt.description,
              preview: opt.preview,
            })),
            multiSelect: q.multiSelect || false,
            selectedOptions: new Set<number>(),
            customValues: new Map<number, string>(),
          }));
          setPendingQuestions(questions);
          setIsWaitingForAnswers(true);

          // CRITICAL: Stop the current stream to wait for user answers
          // This prevents the AI from continuing to create the skill before getting answers
          if (isStreaming) {
            console.log('[AISkillSidebar] AskUserQuestion detected, stopping stream to wait for answers');
            stop();
          }
        }
      }
    }
  }, [toolCalls, isStreaming, stop]);

  /**
   * Check if an option is a custom/other type option
   * Detects keywords like 'other', 'custom', '自定义', etc.
   */
  const isOtherOption = useCallback((option: { label: string; description?: string }): boolean => {
    const keywords = ['other', 'custom', '自定义', '其它', '其它（自定义）'];
    const text = `${option.label} ${option.description || ''}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }, []);

  /**
   * Handle selecting an option for a question
   */
  const handleSelectOption = useCallback((questionIndex: number, optionIndex: number) => {
    setPendingQuestions(prev => {
      const updated = [...prev];
      const question = { ...updated[questionIndex] };

      if (question.multiSelect) {
        // Multi-select: toggle selection
        const newSelected = new Set(question.selectedOptions);
        if (newSelected.has(optionIndex)) {
          newSelected.delete(optionIndex);
        } else {
          newSelected.add(optionIndex);
        }
        question.selectedOptions = newSelected;
      } else {
        // Single-select: replace selection
        question.selectedOptions = new Set([optionIndex]);
      }

      updated[questionIndex] = question;
      return updated;
    });
  }, []);

  /**
   * Handle custom value input change for Other/Custom options
   */
  const handleSetCustomValue = useCallback((questionIndex: number, optionIndex: number, value: string) => {
    setPendingQuestions(prev => {
      const updated = [...prev];
      const question = { ...updated[questionIndex] };

      // Create a new Map with the updated value
      const newCustomValues = new Map(question.customValues);
      newCustomValues.set(optionIndex, value);
      question.customValues = newCustomValues;

      updated[questionIndex] = question;
      return updated;
    });
  }, []);

  /**
   * Submit answers and continue conversation
   */
  const handleSubmitAnswers = useCallback(async () => {
    if (pendingQuestions.length === 0) return;

    // Build answer text with full option details for better context
    const answerParts: string[] = [];
    pendingQuestions.forEach((q, qIndex) => {
      const selectedOptionIndices = Array.from(q.selectedOptions);

      if (selectedOptionIndices.length > 0) {
        const header = q.header || `Question ${qIndex + 1}`;
        const optionsText = selectedOptionIndices.map(optIndex => {
          const opt = q.options[optIndex];
          const customValue = q.customValues.get(optIndex);

          // Use custom value if provided (for Other/Custom options)
          if (customValue && customValue.trim()) {
            return customValue.trim();
          }

          // Otherwise use label and description
          if (opt.description) {
            return `${opt.label} (${opt.description})`;
          }
          return opt.label;
        }).join(', ');
        answerParts.push(`**${header}:** ${optionsText}`);
      }
    });

    const answerText = answerParts.join('\n');

    // Clear pending questions
    setPendingQuestions([]);
    setIsWaitingForAnswers(false);

    // Add user message with answers
    const userMessage: InternalMessage = {
      id: generateId(),
      role: 'user',
      content: answerText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for streaming assistant message (IMPORTANT: this is needed to show AI execution)
    const assistantMessageId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolCalls: [],
      },
    ]);

    // Continue conversation with answers
    const conversationContext = messages
      .filter((m) => !m.isStreaming)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // For modify mode: pass skillPath only, AI will use Read tool
    // For new mode: pass targetPath
    const skillContext: any = currentSkillPath
      ? { skillPath: currentSkillPath, name: currentSkillName }
      : { targetPath: config?.applicationSkillsDirectory };

    const fullPrompt = `[Previous conversation]\n${conversationContext}\n\n[User's answers]\n${answerText}\n\nNow proceed to create the skill based on these answers.`;

    // Determine mode: new skill if no skillPath, otherwise modify
    const mode = currentSkillPath ? 'modify' : 'new';
    await generate(fullPrompt, mode, skillContext);
  }, [pendingQuestions, messages, generate, config, currentSkillName, currentSkillPath]);

  /**
   * Skip answering questions (continue without answering)
   */
  const handleSkipQuestions = useCallback(async () => {
    setPendingQuestions([]);
    setIsWaitingForAnswers(false);

    // Add user message indicating skip
    const userMessage: InternalMessage = {
      id: generateId(),
      role: 'user',
      content: '[Skipped questions - proceed without answering]',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for streaming assistant message
    const assistantMessageId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolCalls: [],
      },
    ]);

    // Continue conversation - tell AI to proceed without the questions
    const conversationContext = messages
      .filter((m) => !m.isStreaming)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // For modify mode: pass skillPath only, AI will use Read tool
    // For new mode: pass targetPath
    const skillContext: any = currentSkillPath
      ? { skillPath: currentSkillPath, name: currentSkillName }
      : { targetPath: config?.applicationSkillsDirectory };

    const fullPrompt = `[Previous conversation]\n${conversationContext}\n\n[User skipped the questions]\nPlease proceed with the best approach based on your judgment.`;

    // Determine mode: new skill if no skillPath, otherwise modify
    const mode = currentSkillPath ? 'modify' : 'new';
    await generate(fullPrompt, mode, skillContext);
  }, [messages, generate, config, currentSkillName, currentSkillPath]);

  /**
   * Handle resolving a permission request
   */
  const handleResolvePermission = useCallback(async (
    requestId: string,
    allow: boolean,
    rememberEntry?: string
  ) => {
    const decision: PermissionDecision = {
      allow,
      rememberEntry,
    };
    await resolvePermission(requestId, decision);
  }, [resolvePermission]);

  /**
   * Handle dismissing a permission request
   */
  const handleDismissPermission = useCallback((requestId: string) => {
    // Dismiss by denying without remembering
    handleResolvePermission(requestId, false);
  }, [handleResolvePermission]);

  /**
   * Finalize streaming message and save conversation when complete
   */
  useEffect(() => {
    // Check for completion - either content OR toolCalls should be present
    // (AI might use tools without returning text content)
    if (isComplete && (content || toolCalls.length > 0)) {
      console.log('[AISkillSidebar] isComplete effect triggered, createdSkillNameRef.current:', createdSkillNameRef.current);
      console.log('[AISkillSidebar] content length:', content.length, 'toolCalls:', toolCalls.length);
      setMessages((prev) => {
        const streamingMsgIndex = prev.findIndex((m) => m.isStreaming);
        if (streamingMsgIndex >= 0) {
          const updated = [...prev];
          updated[streamingMsgIndex] = {
            ...updated[streamingMsgIndex],
            content,
            toolCalls,
            isStreaming: false,
          };

          // Save conversation with finalized messages (including toolCalls)
          // Pass createdSkillNameRef.current to associate conversation with newly created skill
          const finalMessages = updated.filter(m => !m.isStreaming);
          console.log('[AISkillSidebar] Saving conversation with skillName:', createdSkillNameRef.current);

          // Capture the current conversation ID at the time of save to avoid race conditions
          const conversationIdAtSaveTime = currentConversationIdRef.current;
          if (finalMessages.length > 0) {
            saveCurrentConversation(finalMessages, conversationIdAtSaveTime, createdSkillNameRef.current).then(newId => {
              // Only update if we were creating a new conversation and the ID hasn't changed
              if (newId && !conversationIdAtSaveTime && currentConversationIdRef.current === conversationIdAtSaveTime) {
                setCurrentConversationId(newId);
              }
            });
          }

          return updated;
        }
        return prev;
      });
      reset();
    }
  }, [isComplete, content, toolCalls, reset, saveCurrentConversation]);

  /**
   * Handle sending a message
   * Automatically adds /skill-creator prefix to invoke the skill-creator skill
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    // Auto-add /skill-creator prefix if not already present
    const userContent = inputValue.trim();
    const promptWithPrefix = userContent.startsWith('/skill-creator')
      ? userContent
      : `/skill-creator ${userContent}`;

    // Build display content with file references
    let displayContent = userContent;
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(', ');
      displayContent = `${userContent}\n\n📎 ${t('aiSidebar.attachedFiles')}: ${fileNames}`;
    }

    const userMessage: InternalMessage = {
      id: generateId(),
      role: 'user',
      content: displayContent, // Display content with file references
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Store files to include in prompt and clear state
    const filesToInclude = [...attachedFiles];
    setAttachedFiles([]);

    // Add placeholder for streaming assistant message
    const assistantMessageId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolCalls: [],
      },
    ]);

    // Build context with compressed conversation history
    // Compress messages to fit within token limits
    const compressedMessages = compressMessages(messages);
    const conversationContext = compressedMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const skillContext: any = {
      targetPath: config?.applicationSkillsDirectory,
    };

    // For all non-new modes: pass skillPath only, AI will use Read tool
    if (currentSkillPath) {
      skillContext.skillPath = currentSkillPath;
      skillContext.name = currentSkillName;
    }

    // Build prompt with attached file paths (skill-creator will read them using Read tool)
    let fullPrompt: string;
    if (filesToInclude.length > 0) {
      const filesList = filesToInclude.map(f => `- ${f.path}`).join('\n');

      fullPrompt = conversationContext
        ? `[Previous conversation]\n${conversationContext}\n\n[Attached reference files - use Read tool to read these files]\n${filesList}\n\n[Current request]\n${promptWithPrefix}`
        : `[Attached reference files - use Read tool to read these files]\n${filesList}\n\n[Current request]\n${promptWithPrefix}`;
    } else {
      fullPrompt = conversationContext
        ? `[Previous conversation]\n${conversationContext}\n\n[Current request]\n${promptWithPrefix}`
        : promptWithPrefix;
    }

    // Check prompt size and warn if approaching limits
    const promptChars = fullPrompt.length;
    const estimatedTokens = estimateTokens(promptChars);

    if (promptChars > MESSAGE_COMPRESSION.HARD_LIMIT_CHARS) {
      // Hard limit exceeded - show error and don't send
      onShowToast?.(
        t('aiSidebar.promptTooLarge', `The prompt is too large (${estimatedTokens.toLocaleString()} estimated tokens). Please clear some conversation history or reduce attached files.`),
        'error'
      );
      return;
    }

    if (promptChars > MESSAGE_COMPRESSION.MAX_CONTEXT_CHARS) {
      // Warning limit exceeded - ask user to confirm
      const proceed = window.confirm(
        t('aiSidebar.promptLargeWarning', `The prompt is large (${estimatedTokens.toLocaleString()} estimated tokens). This may slow down the response or hit context limits. Continue anyway?`)
      );
      if (!proceed) {
        return;
      }
      console.log('[AISkillSidebar] User proceeding with large prompt:', { promptChars, estimatedTokens });
    }

    console.log('[AISkillSidebar] Sending prompt:', { promptChars, estimatedTokens });

    // Determine mode based on preset prompt category or skill path
    let mode: import('../../shared/types').AIGenerationMode;
    if (selectedPresetCategory) {
      // Map preset category to AI mode
      switch (selectedPresetCategory) {
        case PRESET_CATEGORY_KEYS.CREATE:
          mode = 'new';
          break;
        case PRESET_CATEGORY_KEYS.MODIFY_IMPROVE:
          mode = 'modify';
          break;
        case PRESET_CATEGORY_KEYS.EVALUATE:
          mode = 'evaluate';
          break;
        case PRESET_CATEGORY_KEYS.BENCHMARK:
          mode = 'benchmark';
          break;
        case PRESET_CATEGORY_KEYS.OPTIMIZE_TRIGGERING:
          mode = 'optimize';
          break;
        default:
          // Fallback to path-based logic
          mode = currentSkillPath ? 'modify' : 'new';
      }
    } else {
      // No preset selected: use path-based logic
      mode = currentSkillPath ? 'modify' : 'new';
    }

    // Clear the preset category after use
    setSelectedPresetCategory(null);

    await generate(fullPrompt, mode, skillContext);
  }, [inputValue, isStreaming, messages, generate, config, currentSkillContent, currentSkillName, currentSkillPath, attachedFiles, selectedPresetCategory, t]);

  /**
   * Handle stop generation
   * Saves the conversation with partial content when user stops generation
   */
  const handleStop = useCallback(async () => {
    await stop();
    // Finalize the streaming message with current content and save
    setMessages((prev) => {
      const streamingMsgIndex = prev.findIndex((m) => m.isStreaming);
      if (streamingMsgIndex >= 0) {
        const updated = [...prev];
        updated[streamingMsgIndex] = {
          ...updated[streamingMsgIndex],
          isStreaming: false,
        };

        // Save conversation with the finalized messages (including partial content)
        const finalMessages = updated.filter(m => !m.isStreaming);
        if (finalMessages.length > 0) {
          saveCurrentConversation(finalMessages, currentConversationId, createdSkillNameRef.current);
        }

        return updated;
      }
      return prev;
    });
  }, [stop, saveCurrentConversation, currentConversationId]);

  /**
   * Handle key press in input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't send message if IME is composing (e.g., inputting Chinese characters)
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isComposing]
  );

  /**
   * Clear current conversation
   */
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    createdSkillNameRef.current = null; // Reset created skill name ref
    reset();
  }, [reset]);

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('aiSidebar.yesterday');
    } else if (diffDays < 7) {
      return t('aiSidebar.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="h-full bg-slate-50 flex flex-col">
      {/* Header - Clean blue style matching main app */}
      <div className="bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{t('aiSidebar.title')}</h2>
            <p className="text-[10px] text-slate-500">{t('aiSidebar.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {/* New Conversation Button */}
          <button
            onClick={handleNewConversation}
            className="btn-icon"
            style={{ padding: '6px' }}
            title={t('aiSidebar.newConversation')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {/* History Button */}
          <div className="relative" ref={historyMenuRef}>
            <button
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className={`btn-icon ${showHistoryMenu ? '!text-blue-600 !bg-blue-50' : ''}`}
              style={{ padding: '6px' }}
              title={t('aiSidebar.history')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showHistoryMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">{t('aiSidebar.conversationHistory')}</span>
                </div>

                {isLoadingHistory ? (
                  <div className="p-3 text-center text-slate-400 text-xs">{t('common.loading')}</div>
                ) : conversations.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">{t('aiSidebar.noConversations')}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleLoadConversation(conv)}
                        className={`p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                          currentConversationId === conv.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">{conv.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatDate(conv.updatedAt)}
                              {conv.skillName && ` · ${conv.skillName}`}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="btn-icon hover:!bg-red-50 hover:!text-red-500"
                            style={{ padding: '4px' }}
                            title={t('aiSidebar.deleteConversation')}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              className="btn-icon hover:!bg-red-50 hover:!text-red-500"
              style={{ padding: '6px' }}
              title={t('aiSidebar.clearConversation')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Context indicator */}
      {currentSkillName && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-blue-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7l2-4h10l2 4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
              />
            </svg>
            <span className="font-medium">{t('aiSidebar.editing', { name: currentSkillName })}</span>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-6 px-4 max-w-[90%]">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">{t('aiSidebar.welcomeTitle')}</p>
              <p className="text-xs text-slate-500 mb-3">{t('aiSidebar.welcomePrompt')}</p>
              <div className="space-y-1.5 text-left">
                {[
                  t('aiSidebar.welcomeOption1'),
                  t('aiSidebar.welcomeOption2'),
                  t('aiSidebar.welcomeOption3'),
                  t('aiSidebar.welcomeOption4'),
                ].map((option, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-medium">{i + 1}</span>
                    <span>"{option}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}
            data-testid={`message-${message.role}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              data-testid={message.role === 'assistant' ? 'ai-response-content' : undefined}
              className={`max-w-[92%] rounded-xl px-3 py-2 ${
                message.role === 'user'
                  ? 'text-slate-800'
                  : `bg-slate-50 border text-slate-800 ${
                      message.isStreaming
                        ? 'border-blue-400 shadow-md animate-pulse'
                        : 'border-slate-200'
                    }`
              }`}
            >
              {/* Tool calls - compact inline display */}
              {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {message.toolCalls.map((tool, index) => {
                    const toolKey = `${message.id}-${index}`;
                    const isExpanded = expandedTools.has(toolKey);
                    return (
                      <button
                        key={index}
                        onClick={() => toggleToolExpansion(toolKey)}
                        className="btn-icon border border-slate-300 hover:border-blue-400 inline-flex items-center gap-1.5" style={{ padding: '4px 8px', fontSize: '11px' }}
                        title={isExpanded ? t('aiSidebar.clickToCollapse') : t('aiSidebar.clickToExpand')}
                      >
                        <svg
                          className="w-3.5 h-3.5 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="font-medium text-slate-700">{tool.name}</span>
                        {tool.input?.file_path && (
                          <span className="text-slate-400 truncate max-w-[80px]">
                            {tool.input.file_path.split('/').pop()}
                          </span>
                        )}
                        <svg
                          className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Expanded tool details */}
              {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && expandedTools.size > 0 && (
                <div className="mb-2 space-y-1.5">
                  {message.toolCalls.map((tool, index) => {
                    const toolKey = `${message.id}-${index}`;
                    const isExpanded = expandedTools.has(toolKey);
                    if (!isExpanded || !tool.input) return null;

                    // Format tool input in a user-friendly way
                    const formatToolInput = (toolName: string, input: any): JSX.Element => {
                      if (!input || typeof input !== 'object') {
                        return <span className="text-slate-500">{String(input)}</span>;
                      }

                      switch (toolName) {
                        case 'Write':
                          return (
                            <div className="space-y-1.5">
                              {input.file_path && (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-blue-500">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                                  </span>
                                  <span className="text-blue-600 font-medium break-all text-[11px]">{input.file_path}</span>
                                </div>
                              )}
                              {input.content && (
                                <div className="bg-slate-100 rounded-md p-2 max-h-24 overflow-y-auto">
                                  <pre className="text-slate-600 whitespace-pre-wrap break-words text-[10px] leading-relaxed">
                                    {input.content.length > 500 ? input.content.substring(0, 500) + '...' : input.content}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );

                        case 'Read':
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-[10px]">📖</span>
                              <span className="text-blue-600 font-medium break-all text-[11px]">{input.file_path}</span>
                            </div>
                          );

                        case 'Edit':
                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-[10px]">✏️</span>
                                <span className="text-blue-600 font-medium break-all text-[11px]">{input.file_path}</span>
                              </div>
                              {input.old_string && (
                                <div className="text-[10px] bg-red-50 px-2 py-1 rounded">
                                  <span className="text-red-500">- </span>
                                  <span className="text-slate-500 line-through">{input.old_string.substring(0, 100)}{input.old_string.length > 100 ? '...' : ''}</span>
                                </div>
                              )}
                              {input.new_string && (
                                <div className="text-[10px] bg-green-50 px-2 py-1 rounded">
                                  <span className="text-green-500">+ </span>
                                  <span className="text-slate-600">{input.new_string.substring(0, 100)}{input.new_string.length > 100 ? '...' : ''}</span>
                                </div>
                              )}
                            </div>
                          );

                        case 'Bash':
                          return (
                            <div className="flex items-start gap-1.5">
                              <span className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center text-[10px] text-slate-600">$</span>
                              <code className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] break-all font-mono">
                                {input.command}
                              </code>
                            </div>
                          );

                        case 'Skill':
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-500">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 6a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"/></svg>
                              </span>
                              <span className="text-blue-600 font-medium text-[11px]">{input.skill}</span>
                              {input.args && <span className="text-slate-400 text-[10px]">{input.args}</span>}
                            </div>
                          );

                        case 'AskUserQuestion':
                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-amber-600">
                                <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-[10px]">❓</span>
                                <span className="font-medium text-[11px]">Asking user...</span>
                              </div>
                              {input.questions && Array.isArray(input.questions) && input.questions.length > 0 && (
                                <div className="text-[10px] text-slate-600 pl-6">
                                  {input.questions.map((q: any, i: number) => (
                                    <div key={i}>• {q.question || q.header || 'Question'}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );

                        case 'Grep':
                          return (
                            <div className="space-y-1 text-[10px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-[10px]">🔍</span>
                                <code className="text-blue-600 font-mono">{input.pattern}</code>
                              </div>
                              {input.path && <span className="text-slate-400 pl-6">in: {input.path}</span>}
                            </div>
                          );

                        case 'Glob':
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px]">📄</span>
                              <code className="text-blue-600 font-mono text-[11px]">{input.pattern}</code>
                            </div>
                          );

                        default:
                          // For unknown tools, show a simplified view
                          const keys = Object.keys(input);
                          if (keys.length === 0) return <span className="text-slate-400">No parameters</span>;
                          return (
                            <div className="space-y-1 text-[10px]">
                              {keys.slice(0, 3).map(key => (
                                <div key={key} className="flex gap-1.5">
                                  <span className="text-slate-500">{key}:</span>
                                  <span className="text-slate-700 truncate max-w-[200px]">
                                    {typeof input[key] === 'string' ? input[key] : JSON.stringify(input[key])}
                                  </span>
                                </div>
                              ))}
                              {keys.length > 3 && <span className="text-slate-400">+{keys.length - 3} more</span>}
                            </div>
                          );
                      }
                    };

                    return (
                      <div
                        key={`detail-${index}`}
                        className="bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                      >
                        {formatToolInput(tool.name, tool.input)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Message content */}
              <div className="text-xs leading-relaxed">
                {message.content ? (
                  <StreamingMarkdown content={message.content} isStreaming={!!message.isStreaming} />
                ) : (message.isStreaming && (
                  <span className="inline-flex items-center gap-1.5 text-blue-500">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="animate-pulse">{t('aiSidebar.thinking')}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Error display - hide "cancelled" errors as they're expected when waiting for user input */}
        {error && !error.includes('cancelled') && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700 mx-2">
            <div className="flex items-center gap-2 font-medium mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('aiSidebar.error')}
            </div>
            <div className="pl-6">{error}</div>
          </div>
        )}

        {/* Permission Request Panel - Tool permission requests */}
        {isWaitingPermission && pendingPermissions.length > 0 && (
          <PermissionRequestPanel
            requests={pendingPermissions}
            onResolve={handleResolvePermission}
            onDismiss={handleDismissPermission}
          />
        )}

        {/* Pending Questions UI - AskUserQuestion interaction */}
        {isWaitingForAnswers && pendingQuestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3 mx-2">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('aiSidebar.pleaseAnswer')}</span>
            </div>

            {pendingQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white rounded-lg border border-amber-100 p-2.5 space-y-2">
                {/* Question header */}
                <div className="text-xs">
                  {q.header && (
                    <span className="text-amber-600 font-medium mr-1">[{q.header}]</span>
                  )}
                  <span className="text-slate-700">{q.question}</span>
                  {q.multiSelect && (
                    <span className="text-slate-400 ml-1 text-[10px]">({t('aiSidebar.multiSelect')})</span>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-1.5">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = q.selectedOptions.has(optIndex);
                    const isOther = isOtherOption(opt);
                    const needsInput = isSelected && isOther;

                    return (
                      <div key={optIndex}>
                        <button
                          onClick={() => handleSelectOption(qIndex, optIndex)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-800 border-2'
                              : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {/* Selection indicator */}
                            <span className={`flex-shrink-0 w-4 h-4 rounded ${q.multiSelect ? 'rounded' : 'rounded-full'} border-2 flex items-center justify-center mt-0.5 ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{opt.label}</div>
                              {opt.description && (
                                <div className="text-[10px] text-slate-400 mt-0.5">{opt.description}</div>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Show input field for Other/Custom options when selected */}
                        {needsInput && (
                          <input
                            type="text"
                            className="mt-2 w-full px-2.5 py-2 text-xs border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                            placeholder="请输入自定义值"
                            value={q.customValues.get(optIndex) || ''}
                            onChange={(e) => handleSetCustomValue(qIndex, optIndex, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmitAnswers}
                disabled={pendingQuestions.some(q => q.selectedOptions.size === 0)}
                className="flex-1 btn btn-primary btn-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('aiSidebar.submitAnswers')}
              </button>
              <button
                onClick={handleSkipQuestions}
                className="btn btn-secondary btn-sm"
              >
                {t('aiSidebar.skipQuestions')}
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
        {/* Recommended prompts dropdown */}
        <div className="relative mb-2" ref={promptMenuRef}>
          <button
            onClick={() => !isStreaming && setShowPromptMenu(!showPromptMenu)}
            disabled={isStreaming}
            className="btn-icon inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:!text-blue-600 hover:!bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:bg-transparent" style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{t('aiSidebar.prompts')}</span>
            <svg
              className={`w-3 h-3 transition-transform ${showPromptMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPromptMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
              {getRecommendedPrompts(t).map((category, catIndex) => (
                <div key={catIndex}>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 bg-slate-50 border-b border-slate-100 sticky top-0">
                    {category.category}
                  </div>
                  {category.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => handleSelectPrompt(item.prompt, category.categoryKey)}
                      className="block w-full text-left px-3 py-2 text-[11px] text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap"
                      title={item.prompt}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-slate-400 ml-1">- {item.prompt}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attached files display */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-[10px] text-blue-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="max-w-[100px] truncate font-medium">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="ml-0.5 text-blue-400 hover:text-blue-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={inputRef}
            data-testid="ai-prompt-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            disabled={isStreaming}
            placeholder={t('aiSidebar.inputPlaceholder')}
            className="w-full px-3 py-2 pr-12 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-xs bg-white text-slate-900 placeholder-slate-400"
            rows={3}
            maxLength={2000}
          />
          {/* Attachment button - top right corner */}
          <button
            onClick={handleFileSelect}
            disabled={isStreaming}
            className="btn-icon absolute top-2 right-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('aiSidebar.attachFile')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">{inputValue.length}/2000</div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Enter</kbd> {t('aiSidebar.toSend')}
          </div>
          <div className="flex gap-2">
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="btn btn-danger btn-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
                </svg>
                {t('aiSidebar.stop')}
              </button>
            ) : (
              <button
                onClick={handleSend}
                data-testid="ai-send-button"
                disabled={!inputValue.trim()}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {t('aiSidebar.send')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Delete Conversation Confirmation Dialog */}
    <ConfirmDialog
      isOpen={showDeleteConfirm}
      title={t('aiSidebar.deleteConversation')}
      message={t('aiSidebar.deleteConversationConfirm')}
      type="danger"
      confirmText={t('common.delete')}
      cancelText={t('common.cancel')}
      onClose={() => {
        setShowDeleteConfirm(false);
        setConversationToDelete(null);
      }}
      onConfirm={confirmDeleteConversation}
    />
    </>
  );
};

export default AISkillSidebar;
