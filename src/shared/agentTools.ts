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
 */
export const AGENT_TOOLS: AgentTool[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    configDir: '~/.claude',
    skillsDir: '~/.claude/skills',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configDir: '~/.cursor',
    skillsDir: '~/.cursor/skills',
  },
  {
    id: 'cline',
    name: 'Cline',
    configDir: '~/.cline',
    skillsDir: '~/.cline/skills',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configDir: '~/.codeium',
    skillsDir: '~/.codeium/skills',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    configDir: '~/.gemini',
    skillsDir: '~/.gemini/skills',
  },
  {
    id: 'aider',
    name: 'Aider',
    configDir: '~/.aider',
    skillsDir: '~/.aider/skills',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configDir: '~/.copilot',
    skillsDir: '~/.copilot/skills',
  },
  {
    id: 'continue',
    name: 'Continue',
    configDir: '~/.continue',
    skillsDir: '~/.continue/skills',
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q',
    configDir: '~/.aws/amazonq',
    skillsDir: '~/.aws/amazonq/skills',
  },
  {
    id: 'codium',
    name: 'Codium',
    configDir: '~/.codium',
    skillsDir: '~/.codium/skills',
  },
  {
    id: 'tabnine',
    name: 'Tabnine',
    configDir: '~/.tabnine',
    skillsDir: '~/.tabnine/skills',
  },
  {
    id: 'codeium',
    name: 'Codeium',
    configDir: '~/.codeium',
    skillsDir: '~/.codeium/skills',
  },
  {
    id: 'sourcegraph-cody',
    name: 'Sourcegraph Cody',
    configDir: '~/.sourcegraph-cody',
    skillsDir: '~/.sourcegraph-cody/skills',
  },
  {
    id: 'replit-ai',
    name: 'Replit AI',
    configDir: '~/.replit-ai',
    skillsDir: '~/.replit-ai/skills',
  },
  {
    id: 'code-whisperer',
    name: 'CodeWhisperer',
    configDir: '~/.codewhisperer',
    skillsDir: '~/.codewhisperer/skills',
  },
  {
    id: 'blackbox-ai',
    name: 'Blackbox AI',
    configDir: '~/.blackbox-ai',
    skillsDir: '~/.blackbox-ai/skills',
  },
  {
    id: 'pearai',
    name: 'PearAI',
    configDir: '~/.pearai',
    skillsDir: '~/.pearai/skills',
  },
  {
    id: 'aicode',
    name: 'AI Code',
    configDir: '~/.aicode',
    skillsDir: '~/.aicode/skills',
  },
  {
    id: 'twinny',
    name: 'Twinny',
    configDir: '~/.twinny',
    skillsDir: '~/.twinny/skills',
  },
  {
    id: 'bito',
    name: 'Bito',
    configDir: '~/.bito',
    skillsDir: '~/.bito/skills',
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
