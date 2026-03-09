/**
 * SkillCard Component
 *
 * Displays individual skill metadata in a card format
 */

import React from 'react';
import type { Skill } from '../../shared/types';

interface SkillCardProps {
  skill: Skill;
  onClick?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onOpenFolder?: (skill: Skill) => void;
  onSelect?: (skill: Skill) => void;
  isSelected?: boolean;
}

export default function SkillCard({ skill, onClick, onDelete, onOpenFolder, onSelect, isSelected }: SkillCardProps): JSX.Element {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect?.(skill);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(skill);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(skill);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete?.(skill);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();
    onDelete?.(skill);
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();
    onOpenFolder?.(skill);
  };

  return (
    <div
      className={`card card-interactive group ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`Skill: ${skill.name}. ${isSelected ? 'Selected. ' : ''}Double-click to edit.`}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header: Title + Badge */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-text-primary truncate">
              {skill.name}
            </h3>
            <span
              className={`badge ${
                skill.source === 'project' ? 'badge-project' : 'badge-global'
              } flex-shrink-0`}
            >
              {skill.source === 'project' ? 'Project' : 'Global'}
            </span>
          </div>

          {/* Description */}
          {skill.description && (
            <p className="text-sm text-text-secondary mt-2 truncate-2">
              {skill.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(skill.lastModified).toLocaleDateString()}
            </span>
            {skill.resourceCount > 0 && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {skill.resourceCount} {skill.resourceCount === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Open Folder button */}
          {onOpenFolder && (
            <button
              onClick={handleOpenFolder}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/20 rounded-lg cursor-pointer transition-all duration-fast"
              aria-label={`Open folder for ${skill.name}`}
            >
              <svg className="w-5 h-5 text-text-muted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-error/20 rounded-lg cursor-pointer transition-all duration-fast"
              aria-label={`Delete ${skill.name}`}
            >
              <svg className="w-5 h-5 text-error hover:text-error-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Arrow icon */}
          <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors duration-fast" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
