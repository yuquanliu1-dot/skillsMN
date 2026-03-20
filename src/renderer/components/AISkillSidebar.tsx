/**
 * AI Skill Sidebar Component
 *
 * A conversational sidebar for AI-powered skill creation with chat history
 * This is a sidebar version of AISkillCreationDialog with multi-turn conversation support
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAIGeneration } from '../hooks/useAIGeneration';
import type { Configuration } from '../../shared/types';

/**
 * Chat message type
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; input?: any }>;
}

interface AISkillSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated: () => void;
  config: Configuration | null;
  currentSkillContent?: string;
  currentSkillName?: string;
}

/**
 * Generate unique ID for messages
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Recommended prompts for skill development lifecycle
 */
const RECOMMENDED_PROMPTS = [
  {
    category: 'Create',
    items: [
      { label: 'New skill', prompt: 'Create a new skill for ' },
      { label: 'From template', prompt: 'Create a skill based on this template: ' },
      { label: 'From example', prompt: 'Create a new skill referencing this functionality: ' },
    ],
  },
  {
    category: 'Enhance',
    items: [
      { label: 'Add triggers', prompt: 'Add more trigger conditions to this skill' },
      { label: 'Add commands', prompt: 'Add execution commands to implement ' },
      { label: 'Add error handling', prompt: 'Add error handling logic to this skill' },
      { label: 'Format output', prompt: 'Improve the output format for better readability' },
    ],
  },
  {
    category: 'Test & Optimize',
    items: [
      { label: 'Test triggers', prompt: 'Help me test if the trigger conditions are complete' },
      { label: 'Optimize', prompt: 'Optimize the execution performance of this skill' },
      { label: 'Improve errors', prompt: 'Improve error handling with more edge cases' },
    ],
  },
  {
    category: 'Document',
    items: [
      { label: 'Add examples', prompt: 'Add usage examples to this skill' },
      { label: 'Improve description', prompt: 'Improve the skill description and functionality explanation' },
      { label: 'Add tags', prompt: 'Add appropriate tags to this skill' },
    ],
  },
  {
    category: 'Quick Actions',
    items: [
      { label: 'Explain', prompt: 'Explain how this skill works' },
      { label: 'Fix issue', prompt: 'Fix the issue in this skill: ' },
      { label: 'Add feature', prompt: 'Add a new feature to this skill: ' },
    ],
  },
];

export const AISkillSidebar: React.FC<AISkillSidebarProps> = ({
  isOpen,
  onClose,
  onSkillCreated,
  config,
  currentSkillContent,
  currentSkillName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptMenuRef = useRef<HTMLDivElement>(null);

  /**
   * Handle clicking outside prompt menu to close it
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (promptMenuRef.current && !promptMenuRef.current.contains(event.target as Node)) {
        setShowPromptMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const {
    status,
    content,
    error,
    toolCalls,
    isStreaming,
    isComplete,
    isIdle,
    generate,
    stop,
    reset,
  } = useAIGeneration({
    onComplete: () => {
      console.log('AI skill generation complete - file created by Agent SDK');
      onSkillCreated();
    },
    onError: (errorMessage) => {
      console.error('AI skill generation error:', errorMessage);
      // Add error as assistant message
      const errorMessageId = generateMessageId();
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStreaming),
        {
          id: errorMessageId,
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

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
   * Reset state when sidebar closes
   */
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue('');
      reset();
    }
  }, [isOpen, reset]);

  /**
   * Update streaming message with content
   */
  useEffect(() => {
    if (isStreaming && content) {
      setMessages((prev) => {
        const streamingMsgIndex = prev.findIndex((m) => m.isStreaming);
        if (streamingMsgIndex >= 0) {
          const updated = [...prev];
          updated[streamingMsgIndex] = {
            ...updated[streamingMsgIndex],
            content,
            toolCalls,
          };
          return updated;
        }
        return prev;
      });
    }
  }, [content, isStreaming, toolCalls]);

  /**
   * Finalize streaming message when complete
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
          return updated;
        }
        return prev;
      });
      reset();
    }
  }, [isComplete, content, reset]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Add placeholder for streaming assistant message
    const assistantMessageId = generateMessageId();
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
    }

    // Include conversation context in prompt
    const fullPrompt = conversationContext
      ? `[Previous conversation]\n${conversationContext}\n\n[Current request]\n${userMessage.content}`
      : userMessage.content;

    await generate(fullPrompt, currentSkillContent ? 'modify' : 'new', skillContext);
  }, [inputValue, isStreaming, messages, generate, config, currentSkillContent, currentSkillName]);

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
   * Clear conversation
   */
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    reset();
  }, [reset]);

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
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
            <p className="text-xs text-white/80">Conversational skill creation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              title="Clear conversation"
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
            title="Close sidebar"
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
            <span className="font-medium">Editing: {currentSkillName}</span>
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
            <p className="text-xs">Start a conversation to create or modify skills</p>
            <p className="text-[10px] mt-1 text-slate-300">AI will help you write skill.md files</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
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
                        title={isExpanded ? 'Click to collapse' : 'Click to expand'}
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
                    return (
                      <div
                        key={`detail-${index}`}
                        className="bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      >
                        <pre className="text-slate-600 whitespace-pre-wrap break-words font-mono text-[10px]">
                          {typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Message content */}
              <div className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                {message.content || (message.isStreaming && <span className="animate-pulse">Thinking...</span>)}
                {message.isStreaming && message.content && (
                  <span className="inline-block w-1.5 h-3 bg-purple-600 animate-pulse ml-0.5">|</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <div className="font-medium mb-0.5">Error</div>
            <div>{error}</div>
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
            <span>Prompts</span>
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
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Describe what you want to create or modify..."
            className="w-full px-3 py-2 pr-12 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-xs bg-white text-slate-900 placeholder-slate-400"
            rows={3}
            maxLength={2000}
          />
          <div className="absolute bottom-1.5 right-2 text-[10px] text-slate-400">{inputValue.length}/2000</div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-slate-400">
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Enter</kbd> to send
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
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
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
