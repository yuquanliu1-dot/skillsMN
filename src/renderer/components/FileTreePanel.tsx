/**
 * File Tree Panel Component
 *
 * Displays a hierarchical file tree for a skill directory
 * Allows navigation between SKILL.md and other resource files
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcClient } from '../services/ipcClient';
import type { SkillFileTreeNode } from '../../shared/types';

interface FileTreePanelProps {
  /** Skill directory path */
  skillPath: string;
  /** Currently selected file path */
  selectedFile: string;
  /** Callback when a file is selected */
  onFileSelect: (file: SkillFileTreeNode) => void;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Callback to toggle panel visibility */
  onToggle: () => void;
  /** Refresh key - changes to this will trigger a file tree reload */
  refreshKey?: number;
}

/**
 * Get file icon based on extension
 */
const getFileIcon = (extension?: string, isMainFile?: boolean): JSX.Element => {
  if (isMainFile) {
    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }

  switch (extension?.toLowerCase()) {
    case '.md':
    case '.mdx':
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case '.json':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      return (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case '.css':
    case '.scss':
      return (
        <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case '.py':
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
};

/**
 * Tree Node Component
 */
interface TreeNodeProps {
  node: SkillFileTreeNode;
  level: number;
  selectedFile: string;
  expandedFolders: Set<string>;
  onFileSelect: (file: SkillFileTreeNode) => void;
  onToggleFolder: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedFile,
  expandedFolders,
  onFileSelect,
  onToggleFolder,
}) => {
  const isExpanded = expandedFolders.has(node.absolutePath);
  const isSelected = selectedFile === node.absolutePath;
  const isDirectory = node.type === 'directory';

  const handleClick = useCallback(() => {
    if (isDirectory) {
      onToggleFolder(node.absolutePath);
    } else {
      onFileSelect(node);
    }
  }, [isDirectory, node, onToggleFolder, onFileSelect]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Chevron for directories */}
        {isDirectory ? (
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-3 h-3 flex-shrink-0" />
        )}

        {/* Icon */}
        {isDirectory ? (
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          getFileIcon(node.extension, node.isMainFile)
        )}

        {/* Name */}
        <span className="text-sm truncate">
          {node.name}
          {node.isMainFile && (
            <span className="ml-1 text-xs text-blue-500 dark:text-blue-400 font-medium">(main)</span>
          )}
        </span>
      </div>

      {/* Children for expanded directories */}
      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.absolutePath}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onFileSelect={onFileSelect}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * File Tree Panel Component
 */
export const FileTreePanel: React.FC<FileTreePanelProps> = ({
  skillPath,
  selectedFile,
  onFileSelect,
  isVisible,
  onToggle,
  refreshKey,
}) => {
  const { t } = useTranslation();
  const [fileTree, setFileTree] = useState<SkillFileTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  /**
   * Load file tree when skill path changes
   */
  useEffect(() => {
    if (!skillPath || !isVisible) return;

    const loadFileTree = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tree = await ipcClient.getSkillFileTree(skillPath);
        setFileTree(tree);

        // Auto-expand root directory
        setExpandedFolders(new Set([tree.absolutePath]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileTree();
  }, [skillPath, isVisible, refreshKey]);

  /**
   * Handle folder toggle
   */
  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (!isVisible) {
    // Show collapsed sidebar strip with expand button
    return (
      <div className="w-10 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col items-center py-4 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group">
        <button
          onClick={onToggle}
          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
          title={t('fileTree.show')}
        >
          <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('fileTree.title')}</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
          title={t('fileTree.hide')}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-sm text-red-500 text-center">
            {error}
          </div>
        ) : fileTree && fileTree.children ? (
          <div>
            {fileTree.children.map((node) => (
              <TreeNode
                key={node.absolutePath}
                node={node}
                level={0}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                onFileSelect={onFileSelect}
                onToggleFolder={handleToggleFolder}
              />
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            {t('fileTree.noFiles')}
          </div>
        )}
      </div>
    </div>
  );
};
