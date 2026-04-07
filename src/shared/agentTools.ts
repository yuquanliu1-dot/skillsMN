/**
 * Agent Tools Configuration
 *
 * Defines the list of AI agent tools that can receive skill symlinks.
 * Each tool has a unique ID, display name, and directory paths.
 */

import { AgentTool } from './types';

/**
 * List of supported AI agent tools.
 * The skillsDir is where symlinks will be created.
 * All tools have type: 'tool' by default.
 */
export const AGENT_TOOLS: AgentTool[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    configDir: '~/.claude',
    skillsDir: '~/.claude/skills',
    type: 'tool',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configDir: '~/.cursor',
    skillsDir: '~/.cursor/skills',
    type: 'tool',
  },
  {
    id: 'cline',
    name: 'Cline',
    configDir: '~/.cline',
    skillsDir: '~/.cline/skills',
    type: 'tool',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configDir: '~/.codeium',
    skillsDir: '~/.codeium/skills',
    type: 'tool',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    configDir: '~/.gemini',
    skillsDir: '~/.gemini/skills',
    type: 'tool',
  },
  {
    id: 'aider',
    name: 'Aider',
    configDir: '~/.aider',
    skillsDir: '~/.aider/skills',
    type: 'tool',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configDir: '~/.copilot',
    skillsDir: '~/.copilot/skills',
    type: 'tool',
  },
  {
    id: 'continue',
    name: 'Continue',
    configDir: '~/.continue',
    skillsDir: '~/.continue/skills',
    type: 'tool',
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q',
    configDir: '~/.aws/amazonq',
    skillsDir: '~/.aws/amazonq/skills',
    type: 'tool',
  },
  {
    id: 'codium',
    name: 'Codium',
    configDir: '~/.codium',
    skillsDir: '~/.codium/skills',
    type: 'tool',
  },
  {
    id: 'tabnine',
    name: 'Tabnine',
    configDir: '~/.tabnine',
    skillsDir: '~/.tabnine/skills',
    type: 'tool',
  },
  {
    id: 'codeium',
    name: 'Codeium',
    configDir: '~/.codeium',
    skillsDir: '~/.codeium/skills',
    type: 'tool',
  },
  {
    id: 'sourcegraph-cody',
    name: 'Sourcegraph Cody',
    configDir: '~/.sourcegraph-cody',
    skillsDir: '~/.sourcegraph-cody/skills',
    type: 'tool',
  },
  {
    id: 'replit-ai',
    name: 'Replit AI',
    configDir: '~/.replit-ai',
    skillsDir: '~/.replit-ai/skills',
    type: 'tool',
  },
  {
    id: 'code-whisperer',
    name: 'CodeWhisperer',
    configDir: '~/.codewhisperer',
    skillsDir: '~/.codewhisperer/skills',
    type: 'tool',
  },
  {
    id: 'blackbox-ai',
    name: 'Blackbox AI',
    configDir: '~/.blackbox-ai',
    skillsDir: '~/.blackbox-ai/skills',
    type: 'tool',
  },
  {
    id: 'pearai',
    name: 'PearAI',
    configDir: '~/.pearai',
    skillsDir: '~/.pearai/skills',
    type: 'tool',
  },
  {
    id: 'aicode',
    name: 'AI Code',
    configDir: '~/.aicode',
    skillsDir: '~/.aicode/skills',
    type: 'tool',
  },
  {
    id: 'twinny',
    name: 'Twinny',
    configDir: '~/.twinny',
    skillsDir: '~/.twinny/skills',
    type: 'tool',
  },
  {
    id: 'bito',
    name: 'Bito',
    configDir: '~/.bito',
    skillsDir: '~/.bito/skills',
    type: 'tool',
  },
];

/**
 * Get a tool by its ID
 */
export function getToolById(toolId: string): AgentTool | undefined {
  return AGENT_TOOLS.find((tool) => tool.id === toolId);
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return AGENT_TOOLS.map((tool) => tool.id);
}
