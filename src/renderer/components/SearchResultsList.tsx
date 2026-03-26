/**
 * Search Results List Component
 *
 * Displays search results in a grid layout with skill grouping
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchSkillResult, SkillGroup } from '../../shared/types';
import { SkillResultCard } from './SkillResultCard';

interface GroupedResults {
  group: SkillGroup | null;
  skills: SearchSkillResult[];
}

interface SearchResultsListProps {
  results: SearchSkillResult[];
  targetDirectory: string;
  onInstallComplete?: (skill: SearchSkillResult) => void;
  onSkillClick?: (skill: SearchSkillResult) => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  targetDirectory,
  onInstallComplete,
  onSkillClick
}) => {
  const { t } = useTranslation();
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);

  // Load skill groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await window.electronAPI.listSkillGroups();
        if (response.success && response.data) {
          setSkillGroups(response.data);
        }
      } catch (error) {
        console.error('Failed to load skill groups:', error);
      }
    };
    loadGroups();
  }, []);

  // Group skills by configured groups (intelligent matching by name)
  const groupedResults = useMemo((): GroupedResults[] => {
    const result: GroupedResults[] = [];
    const assignedSkills = new Set<string>();

    // Create a map of skill name to group
    const skillToGroup = new Map<string, SkillGroup>();
    for (const group of skillGroups) {
      for (const skillName of group.skills) {
        skillToGroup.set(skillName.toLowerCase(), group);
      }
    }

    // Group skills by their assigned group
    for (const group of skillGroups) {
      const groupSkills: SearchSkillResult[] = [];
      for (const skill of results) {
        const assignedGroup = skillToGroup.get(skill.name.toLowerCase());
        if (assignedGroup?.id === group.id && !assignedSkills.has(skill.skillId)) {
          groupSkills.push(skill);
          assignedSkills.add(skill.skillId);
        }
      }
      if (groupSkills.length > 0) {
        result.push({ group, skills: groupSkills });
      }
    }

    // Ungrouped skills
    const ungroupedSkills = results.filter(
      (skill) => !assignedSkills.has(skill.skillId)
    );
    if (ungroupedSkills.length > 0) {
      result.push({ group: null, skills: ungroupedSkills });
    }

    return result;
  }, [results, skillGroups]);

  return (
    <div className="space-y-6">
      {groupedResults.map(({ group, skills: groupSkills }) => (
        <div key={group?.id || 'ungrouped'}>
          {/* Group header */}
          {group && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xl"
                style={{ color: group.color }}
              >
                {group.icon || '📁'}
              </span>
              <h3
                className="text-sm font-semibold"
                style={{ color: group.color }}
              >
                {group.name}
              </h3>
              {group.description && (
                <span className="text-xs text-gray-500">
                  · {group.description}
                </span>
              )}
              <span className="text-xs text-gray-400">
                ({groupSkills.length})
              </span>
            </div>
          )}
          {!group && groupSkills.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl text-gray-400">📦</span>
              <h3 className="text-sm font-semibold text-gray-500">
                {t('skills.ungrouped')}
              </h3>
              <span className="text-xs text-gray-400">
                ({groupSkills.length})
              </span>
            </div>
          )}

          {/* Skill cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groupSkills.map((skill) => (
              <SkillResultCard
                key={skill.skillId}
                skill={skill}
                targetDirectory={targetDirectory}
                onInstallComplete={onInstallComplete}
                onSkillClick={onSkillClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
