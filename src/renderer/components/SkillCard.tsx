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
}

export default function SkillCard({ skill, onClick }: SkillCardProps): JSX.Element {
  const handleClick = () => {
    onClick?.(skill);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(skill);
    }
  };

  return (
    <div
      className="card hover:bg-slate-700 cursor-pointer transition-colors"
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`Skill: ${skill.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{skill.name}</h3>
            <span
              className={`badge ${
                skill.source === 'project' ? 'badge-project' : 'badge-global'
              }`}
            >
              {skill.source === 'project' ? 'Project' : 'Global'}
            </span>
          </div>

          {skill.description && (
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              {skill.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>
              Modified: {new Date(skill.lastModified).toLocaleDateString()}
            </span>
            {skill.resourceCount > 0 && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {skill.resourceCount} {skill.resourceCount === 1 ? 'resource' : 'resources'}
              </span>
            )}
          </div>
        </div>

        <div className="ml-4 flex-shrink-0">
          <svg
            className="w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
