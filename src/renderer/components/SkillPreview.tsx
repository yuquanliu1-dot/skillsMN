/**
 * SkillPreview Component
 *
 * Right-side drawer for previewing skill content from GitHub with Markdown rendering
 * Uses SkillPreviewDrawer internally for the drawer UI
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SkillPreviewDrawer from './SkillPreviewDrawer';

interface SkillPreviewProps {
  downloadUrl: string;
  onClose: () => void;
  onInstall: (repositoryName: string, skillFilePath: string, downloadUrl: string) => void;
}

export default function SkillPreview({ downloadUrl, onClose, onInstall }: SkillPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract repository name and path from URL
  const extractInfo = (url: string) => {
    const match = url.match(/githubusercontent\.com\/(.+?)\/(.+?)\/(.+?)\/(.+)/);
    if (match) {
      const [, owner, repo, , path] = match;
      return {
        repositoryName: `${owner}/${repo}`,
        skillFilePath: path,
      };
    }
    return { repositoryName: 'unknown', skillFilePath: 'skill.md' };
  };

  const { repositoryName, skillFilePath } = extractInfo(downloadUrl);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await window.electronAPI.previewGitHubSkill(downloadUrl);
        if (response.success && response.data) {
          setContent(response.data.content);
        } else {
          setError(response.error?.message || 'Failed to load skill content');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skill content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [downloadUrl]);

  // Show error state as content (SkillPreviewDrawer handles rendering)
  const displayContent = error
    ? `## Error\n\n${error}`
    : content;

  return (
    <SkillPreviewDrawer
      isOpen={true}
      skillName={t('discover.previewSkill', 'Preview Skill')}
      skillSource={`${repositoryName} · ${skillFilePath}`}
      content={displayContent}
      onClose={onClose}
      onInstall={() => onInstall(repositoryName, skillFilePath || 'skill.md', downloadUrl)}
      isInstalling={isLoading || !!error}
    />
  );
}
