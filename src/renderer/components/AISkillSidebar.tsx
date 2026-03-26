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
import type { Configuration, AIConversation, AIConversationMessage, PermissionDecision } from '../../shared/types';

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
 * Generate a title from the first user message
 */
function generateTitle(content: string): string {
  const maxLen = 40;
  const title = content.trim().split('\n')[0];
  return title.length > maxLen ? title.substring(0, maxLen) + '...' : title;
}

/**
 * Recommended prompts aligned with skill-creator capabilities:
 * - Create new skills from scratch
 * - Modify and improve existing skills
 * - Run evals to test a skill
 * - Benchmark skill performance with variance analysis
 * - Optimize skill description for better triggering accuracy
 */
const RECOMMENDED_PROMPTS = [
  {
    category: 'Create',
    items: [
      { label: 'New skill', prompt: 'Create a new skill for ' },
      { label: 'From description', prompt: 'Create a skill that ' },
    ],
  },
  {
    category: 'Modify & Improve',
    items: [
      { label: 'Enhance skill', prompt: 'Improve this skill by ' },
      { label: 'Add feature', prompt: 'Add a new feature to this skill: ' },
      { label: 'Fix issue', prompt: 'Fix the following issue in this skill: ' },
      { label: 'Refactor', prompt: 'Refactor this skill to ' },
    ],
  },
  {
    category: 'Evaluate',
    items: [
      { label: 'Run evals', prompt: 'Run evaluations to test this skill' },
      { label: 'Test triggers', prompt: 'Test if the trigger conditions work correctly for ' },
      { label: 'Edge cases', prompt: 'Test this skill against edge cases: ' },
    ],
  },
  {
    category: 'Benchmark',
    items: [
      { label: 'Performance', prompt: 'Benchmark this skill\'s performance' },
      { label: 'Variance analysis', prompt: 'Analyze performance variance across different scenarios: ' },
      { label: 'Compare', prompt: 'Compare this skill\'s performance with ' },
    ],
  },
  {
    category: 'Optimize Triggering',
    items: [
      { label: 'Improve description', prompt: 'Optimize the skill description for better triggering accuracy' },
      { label: 'Better triggers', prompt: 'Improve the trigger conditions to match more user intents' },
      { label: 'Reduce false positives', prompt: 'Optimize triggers to reduce false positive matches' },
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
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);

  // Pending questions from AskUserQuestion tool
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [isWaitingForAnswers, setIsWaitingForAnswers] = useState(false);

  // Conversation history state
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

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
    onComplete: async () => {
      console.log('AI skill generation complete - file created by Agent SDK');

      // Extract created skill path from tool calls
      const writeToolCall = toolCalls.find(t => t.name === 'Write');
      if (writeToolCall?.input?.file_path) {
        const filePath = writeToolCall.input.file_path as string;
        // Extract skill name from path (e.g., /path/to/skills/skill-name/SKILL.md -> skill-name)
        const pathParts = filePath.replace(/\\/g, '/').split('/');
        const skillsIndex = pathParts.findIndex(p => p === 'skills');
        if (skillsIndex !== -1 && pathParts.length > skillsIndex + 1) {
          const skillName = pathParts[skillsIndex + 1];
          onSkillCreated({ name: skillName, path: filePath });
          return;
        }
      }

      onSkillCreated();
    },
    onError: (errorMessage) => {
      console.error('AI skill generation error:', errorMessage);
    },
  });

  /**
   * Load conversation history on mount or when skill changes
   */
  useEffect(() => {
    if (isOpen) {
      // Reset current conversation when skill changes
      setMessages([]);
      setCurrentConversationId(null);
      reset();
      loadConversations();
    }
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
   */
  const loadConversations = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await window.electronAPI.loadAIConversations();
      if (response.success && response.data) {
        // Filter conversations by current skill
        const filtered = currentSkillName
          ? response.data.filter(c => c.skillName === currentSkillName)
          : response.data.filter(c => !c.skillName); // Show unassociated conversations when no skill is open
        setConversations(filtered);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentSkillName]);

  /**
   * Save current conversation to storage
   */
  const saveCurrentConversation = useCallback(async (
    msgs: InternalMessage[],
    conversationId: string | null
  ): Promise<string | null> => {
    if (msgs.length === 0) return null;

    const now = new Date().toISOString();
    const firstUserMessage = msgs.find(m => m.role === 'user');
    const title = firstUserMessage ? generateTitle(firstUserMessage.content) : 'New Conversation';

    const conversation: AIConversation = {
      id: conversationId || generateId(),
      title,
      messages: msgs.map(toStoredMessage),
      createdAt: conversationId
        ? (conversations.find(c => c.id === conversationId)?.createdAt || now)
        : now,
      updatedAt: now,
      skillName: currentSkillName,
      skillPath: currentSkillPath,
    };

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
   * Delete a conversation
   */
  const handleDeleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.deleteAIConversation(conversationId);
      await loadConversations();
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [currentConversationId, loadConversations]);

  /**
   * Start a new conversation
   */
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    reset();
    setShowHistoryMenu(false);
  }, [reset]);

  /**
   * Handle selecting a prompt from the menu
   */
  const handleSelectPrompt = useCallback((prompt: string) => {
    setInputValue(prompt);
    setShowPromptMenu(false);
    inputRef.current?.focus();
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
   * Detect Write tool calls and notify parent to refresh editor
   * This allows the editor to refresh when the AI modifies the current skill file
   */
  useEffect(() => {
    if (toolCalls && toolCalls.length > 0 && onSkillModified) {
      const writeTool = toolCalls.find(t => t.name === 'Write');
      if (writeTool?.input?.file_path) {
        const filePath = writeTool.input.file_path as string;
        console.log('[AISkillSidebar] Write tool detected, notifying parent to refresh:', filePath);
        onSkillModified(filePath);
      }
    }
  }, [toolCalls, onSkillModified]);

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
   * Submit answers and continue conversation
   */
  const handleSubmitAnswers = useCallback(async () => {
    if (pendingQuestions.length === 0) return;

    // Build answer text
    const answerParts: string[] = [];
    pendingQuestions.forEach((q, qIndex) => {
      const selectedLabels = Array.from(q.selectedOptions)
        .map(optIndex => q.options[optIndex]?.label)
        .filter(Boolean);

      if (selectedLabels.length > 0) {
        answerParts.push(`**${q.header || `Question ${qIndex + 1}`}:** ${selectedLabels.join(', ')}`);
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

    const skillContext: any = {
      targetPath: config?.applicationSkillsDirectory,
    };

    if (currentSkillContent) {
      skillContext.content = currentSkillContent;
      skillContext.name = currentSkillName;
      skillContext.skillPath = currentSkillPath;
    }

    const fullPrompt = `[Previous conversation]\n${conversationContext}\n\n[User's answers]\n${answerText}\n\nNow proceed to create the skill based on these answers.`;

    await generate(fullPrompt, currentSkillContent ? 'modify' : 'new', skillContext);
  }, [pendingQuestions, messages, generate, config, currentSkillContent, currentSkillName, currentSkillPath]);

  /**
   * Skip answering questions (provide text input instead)
   */
  const handleSkipQuestions = useCallback(() => {
    setPendingQuestions([]);
    setIsWaitingForAnswers(false);
  }, []);

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
    if (isComplete && content) {
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
          const finalMessages = updated.filter(m => !m.isStreaming);
          if (finalMessages.length > 0) {
            saveCurrentConversation(finalMessages, currentConversationId).then(newId => {
              if (newId && !currentConversationId) {
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
  }, [isComplete, content, toolCalls, reset, saveCurrentConversation, currentConversationId]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: InternalMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

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

    // Build context with conversation history and current skill
    const conversationContext = messages
      .filter((m) => !m.isStreaming)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const skillContext: any = {
      targetPath: config?.applicationSkillsDirectory,
    };

    // Include current skill content if available
    if (currentSkillContent) {
      skillContext.content = currentSkillContent;
      skillContext.name = currentSkillName;
      skillContext.skillPath = currentSkillPath;
    }

    // Include conversation context in prompt
    const fullPrompt = conversationContext
      ? `[Previous conversation]\n${conversationContext}\n\n[Current request]\n${userMessage.content}`
      : userMessage.content;

    await generate(fullPrompt, currentSkillContent ? 'modify' : 'new', skillContext);
  }, [inputValue, isStreaming, messages, generate, config, currentSkillContent, currentSkillName, currentSkillPath]);

  /**
   * Handle stop generation
   */
  const handleStop = useCallback(async () => {
    await stop();
    // Finalize the streaming message with current content
    setMessages((prev) => {
      const streamingMsgIndex = prev.findIndex((m) => m.isStreaming);
      if (streamingMsgIndex >= 0) {
        const updated = [...prev];
        updated[streamingMsgIndex] = {
          ...updated[streamingMsgIndex],
          isStreaming: false,
        };
        return updated;
      }
      return prev;
    });
  }, [stop]);

  /**
   * Handle key press in input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /**
   * Clear current conversation
   */
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
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
    <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-3 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('aiSidebar.title')}</h2>
            <p className="text-xs text-white/80">{t('aiSidebar.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* New Conversation Button */}
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title={t('aiSidebar.newConversation')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {/* History Button */}
          <div className="relative" ref={historyMenuRef}>
            <button
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className={`p-1.5 rounded-lg transition-colors ${
                showHistoryMenu ? 'text-white bg-white/30' : 'text-white/70 hover:text-white hover:bg-white/20'
              }`}
              title={t('aiSidebar.history')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showHistoryMenu && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">{t('aiSidebar.conversationHistory')}</span>
                </div>

                {isLoadingHistory ? (
                  <div className="p-4 text-center text-slate-400 text-xs">{t('common.loading')}</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">{t('aiSidebar.noConversations')}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleLoadConversation(conv)}
                        className={`p-2 cursor-pointer hover:bg-purple-50 transition-colors ${
                          currentConversationId === conv.id ? 'bg-purple-50' : ''
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
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title={t('aiSidebar.deleteConversation')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              title={t('aiSidebar.clearConversation')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title={t('aiSidebar.closeSidebar')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {currentSkillName && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-xs">{t('aiSidebar.startConversation')}</p>
            <p className="text-[10px] mt-1 text-slate-300">{t('aiSidebar.aiHelp')}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}
            data-testid={`message-${message.role}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              data-testid={message.role === 'assistant' ? 'ai-response-content' : undefined}
              className={`max-w-[95%] rounded-lg px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              {/* Tool calls - compact inline display */}
              {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {message.toolCalls.map((tool, index) => {
                    const toolKey = `${message.id}-${index}`;
                    const isExpanded = expandedTools.has(toolKey);
                    return (
                      <button
                        key={index}
                        onClick={() => toggleToolExpansion(toolKey)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs transition-colors"
                        title={isExpanded ? t('aiSidebar.clickToCollapse') : t('aiSidebar.clickToExpand')}
                      >
                        <svg
                          className="w-3 h-3 text-blue-600"
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
                          <span className="text-slate-500 truncate max-w-[80px]">
                            {tool.input.file_path.split('/').pop()}
                          </span>
                        )}
                        <svg
                          className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                <div className="mb-2 space-y-1">
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
                            <div className="space-y-1">
                              {input.file_path && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">📁</span>
                                  <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
                                </div>
                              )}
                              {input.content && (
                                <div className="bg-slate-100 rounded p-1.5 max-h-24 overflow-y-auto">
                                  <pre className="text-slate-600 whitespace-pre-wrap break-words text-[10px]">
                                    {input.content.length > 500 ? input.content.substring(0, 500) + '...' : input.content}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );

                        case 'Read':
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">📖</span>
                              <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
                            </div>
                          );

                        case 'Edit':
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">✏️</span>
                                <span className="text-blue-600 font-medium break-all">{input.file_path}</span>
                              </div>
                              {input.old_string && (
                                <div className="text-[10px]">
                                  <span className="text-red-500">- </span>
                                  <span className="text-slate-500 line-through">{input.old_string.substring(0, 100)}{input.old_string.length > 100 ? '...' : ''}</span>
                                </div>
                              )}
                              {input.new_string && (
                                <div className="text-[10px]">
                                  <span className="text-green-500">+ </span>
                                  <span className="text-slate-600">{input.new_string.substring(0, 100)}{input.new_string.length > 100 ? '...' : ''}</span>
                                </div>
                              )}
                            </div>
                          );

                        case 'Bash':
                          return (
                            <div className="flex items-start gap-1">
                              <span className="text-slate-400">$</span>
                              <code className="text-green-600 bg-green-50 px-1 rounded text-[10px] break-all">
                                {input.command}
                              </code>
                            </div>
                          );

                        case 'Skill':
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">🎯</span>
                              <span className="text-purple-600 font-medium">{input.skill}</span>
                              {input.args && <span className="text-slate-400 text-[10px]">{input.args}</span>}
                            </div>
                          );

                        case 'AskUserQuestion':
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-amber-600">
                                <span>❓</span>
                                <span className="font-medium">Asking user...</span>
                              </div>
                              {input.questions && Array.isArray(input.questions) && input.questions.length > 0 && (
                                <div className="text-[10px] text-slate-600 pl-4">
                                  {input.questions.map((q: any, i: number) => (
                                    <div key={i}>• {q.question || q.header || 'Question'}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );

                        case 'Grep':
                          return (
                            <div className="space-y-0.5 text-[10px]">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">🔍</span>
                                <code className="text-blue-600">{input.pattern}</code>
                              </div>
                              {input.path && <span className="text-slate-400 pl-4">in: {input.path}</span>}
                            </div>
                          );

                        case 'Glob':
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">📄</span>
                              <code className="text-blue-600">{input.pattern}</code>
                            </div>
                          );

                        default:
                          // For unknown tools, show a simplified view
                          const keys = Object.keys(input);
                          if (keys.length === 0) return <span className="text-slate-400">No parameters</span>;
                          return (
                            <div className="space-y-0.5 text-[10px]">
                              {keys.slice(0, 3).map(key => (
                                <div key={key} className="flex gap-1">
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
                        className="bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      >
                        {formatToolInput(tool.name, tool.input)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Message content */}
              <div className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                {message.content || (message.isStreaming && <span className="animate-pulse">{t('aiSidebar.thinking')}</span>)}
                {message.isStreaming && message.content && (
                  <span className="inline-block w-1.5 h-3 bg-purple-600 animate-pulse ml-0.5">|</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Error display - hide "cancelled" errors as they're expected when waiting for user input */}
        {error && !error.includes('cancelled') && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <div className="font-medium mb-0.5">{t('aiSidebar.error')}</div>
            <div>{error}</div>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('aiSidebar.pleaseAnswer')}</span>
            </div>

            {pendingQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white rounded-lg border border-amber-100 p-2 space-y-2">
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
                <div className="space-y-1">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = q.selectedOptions.has(optIndex);
                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleSelectOption(qIndex, optIndex)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                          isSelected
                            ? 'bg-amber-100 border-amber-300 text-amber-800 border'
                            : 'bg-slate-50 border-slate-200 text-slate-600 border hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {/* Selection indicator */}
                          <span className={`flex-shrink-0 w-3.5 h-3.5 rounded ${q.multiSelect ? 'rounded' : 'rounded-full'} border flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500'
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
                className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('aiSidebar.submitAnswers')}
              </button>
              <button
                onClick={handleSkipQuestions}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
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
            onClick={() => setShowPromptMenu(!showPromptMenu)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
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
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {RECOMMENDED_PROMPTS.map((category, catIndex) => (
                <div key={catIndex}>
                  <div className="px-2 py-1 text-[10px] font-medium text-slate-400 bg-slate-50 border-b border-slate-100 sticky top-0">
                    {category.category}
                  </div>
                  {category.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => handleSelectPrompt(item.prompt)}
                      className="block w-full text-left px-2 py-1.5 text-xs text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors whitespace-nowrap"
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

        <div className="relative">
          <textarea
            ref={inputRef}
            data-testid="ai-prompt-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={t('aiSidebar.inputPlaceholder')}
            className="w-full px-3 py-2 pr-12 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-xs bg-white text-slate-900 placeholder-slate-400"
            rows={3}
            maxLength={2000}
          />
          <div className="absolute bottom-1.5 right-2 text-[10px] text-slate-400">{inputValue.length}/2000</div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-slate-400">
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Enter</kbd> {t('aiSidebar.toSend')}
          </div>
          <div className="flex gap-2">
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
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
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AISkillSidebar;
