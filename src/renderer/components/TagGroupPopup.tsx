/**
 * TagGroupPopup Component
 *
 * Popup for assigning a tag to a skill group
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { SkillGroup } from '../../shared/types';

interface TagGroupPopupProps {
  isOpen: boolean;
  tag: string;
  onClose: () => void;
  onAssign: (tag: string, groupId: string | null) => Promise<void>;
  onNavigateToSettings?: () => void;
}

/**
 * Helper function to translate group field if it's an i18n key
 */
function tGroupField(value: string | undefined, t: (key: string) => string): string {
  if (!value) return '';
  if (value.startsWith('skillGroups.') || value.includes('.')) {
    const translated = t(value);
    if (translated && translated !== value) {
      return translated;
    }
  }
  return value;
}

export default function TagGroupPopup({
  isOpen,
  tag,
  onClose,
  onAssign,
  onNavigateToSettings,
}: TagGroupPopupProps): JSX.Element | null {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await window.electronAPI.listSkillGroups();
      if (response.success && response.data) {
        setGroups(response.data);
        // Find current group for this tag
        const currentGroup = response.data.find(g => g.tags.includes(tag));
        setCurrentGroupId(currentGroup?.id || null);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (groupId: string | null) => {
    setIsAssigning(true);
    try {
      await onAssign(tag, groupId);
      onClose();
    } catch (error) {
      console.error('Failed to assign tag:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleGoToSettings = () => {
    onClose();
    onNavigateToSettings?.();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[9999]"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-72 max-h-96 overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('tagGroup.assignTag', 'Assign Tag to Group')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
              {tag}
            </span>
          </p>
        </div>

        {/* Content */}
        <div className="p-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* No Group Option */}
              <button
                onClick={() => handleAssign(null)}
                disabled={isAssigning}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  currentGroupId === null
                    ? 'bg-gray-100 text-gray-900'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📦</span>
                  <span>{t('tagGroup.noGroup', 'No Group')}</span>
                  {currentGroupId === null && (
                    <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Group Options */}
              {groups.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  {t('tagGroup.noGroups', 'No groups created yet')}
                </p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleAssign(group.id)}
                    disabled={isAssigning}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                      currentGroupId === group.id
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: group.color || '#3B82F6' }}>
                        {group.icon || '📁'}
                      </span>
                      <span className="truncate">{tGroupField(group.name, t)}</span>
                      {currentGroupId === group.id && (
                        <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer - Settings Link */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleGoToSettings}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('tagGroup.configureGroups', 'Configure Groups')}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
