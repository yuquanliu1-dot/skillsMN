/**
 * Settings Component
 *
 * Configuration panel for user preferences
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Configuration, PrivateRepo, AIConfiguration, SkillEditorConfig, SkillGroup, ProxyConfig } from '../../shared/types';
import { changeLanguage, availableLanguages, getCurrentLanguage } from '../i18n';
import type { LanguageCode } from '../../shared/types';

// Preset colors for skill groups (software development themed)
const PRESET_COLORS = [
  { value: '#3B82F6', name: '开发', description: 'Development' },
  { value: '#10B981', name: '测试', description: 'Testing' },
  { value: '#8B5CF6', name: '设计', description: 'Design' },
  { value: '#F59E0B', name: '部署', description: 'Deployment' },
  { value: '#EF4444', name: '紧急', description: 'Urgent/Bug' },
  { value: '#06B6D4', name: '文档', description: 'Documentation' },
  { value: '#84CC16', name: '规划', description: 'Planning' },
  { value: '#6B7280', name: '其他', description: 'Other' },
];

// Preset icons for skill groups (tech-styled)
const PRESET_ICONS = [
  { value: '⚡', name: '需求', description: 'Requirements' },
  { value: '🎯', name: '设计', description: 'Design' },
  { value: '⌨️', name: '开发', description: 'Development' },
  { value: '🔬', name: '测试', description: 'Testing' },
  { value: '🚀', name: '部署', description: 'Deployment' },
  { value: '📘', name: '文档', description: 'Documentation' },
  { value: '🐞', name: 'Bug', description: 'Bug Fixing' },
  { value: '⚙️', name: '配置', description: 'Configuration' },
  { value: '🛡️', name: '安全', description: 'Security' },
  { value: '📈', name: '分析', description: 'Analytics' },
  { value: '🔗', name: '集成', description: 'Integration' },
  { value: '☁️', name: '云端', description: 'Cloud' },
  { value: '🧠', name: 'AI', description: 'Artificial Intelligence' },
  { value: '💾', name: '数据', description: 'Database' },
  { value: '🔄', name: 'CI/CD', description: 'DevOps Pipeline' },
  { value: '🌐', name: '网络', description: 'Network/Web' },
];

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: Configuration | null;
  onSave: (config: Partial<Configuration>) => Promise<void>;
  onDirectoryAdded?: (directoryPath: string) => void;
}

export default function Settings({ isOpen, onClose, config, onSave, onDirectoryAdded }: SettingsProps): JSX.Element | null {
  const { t } = useTranslation();
  console.log('[Settings] Component rendering', { isOpen, activeTab: undefined });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Project Directories State
  const [projectDirectories, setProjectDirectories] = useState<string[]>([]);
  const [isAddingDirectory, setIsAddingDirectory] = useState(false);

  // Skill Editor Configuration State
  const [skillEditorConfig, setSkillEditorConfig] = useState<SkillEditorConfig>({
    fontSize: 14,
    theme: 'light',
    autoSaveEnabled: true,
    autoSaveDelay: 2000,
    showMinimap: false,
    lineNumbers: 'on',
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    tabSize: 2,
    wordWrap: true,
  });

  // Private Repository State
  const [privateRepos, setPrivateRepos] = useState<PrivateRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoPAT, setNewRepoPAT] = useState('');
  const [newRepoDisplayName, setNewRepoDisplayName] = useState('');
  const [newRepoProvider, setNewRepoProvider] = useState<'github' | 'gitlab'>('github');
  const [newRepoInstanceUrl, setNewRepoInstanceUrl] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [testingRepoId, setTestingRepoId] = useState<string | null>(null);
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPAT, setEditPAT] = useState('');
  const [isUpdatingRepo, setIsUpdatingRepo] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'skill-view' | 'shortcuts' | 'repositories' | 'skill-groups' | 'ai'>('general');

  console.log('[Settings] Current state', { activeTab, isOpen });

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<AIConfiguration | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAITestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  // Skill Groups State
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [newGroupIcon, setNewGroupIcon] = useState('📁');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupColor, setEditGroupColor] = useState('#3B82F6');
  const [editGroupIcon, setEditGroupIcon] = useState('📁');
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Proxy Configuration State
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig>({
    enabled: false,
    type: 'system',
    customUrl: '',
  });

  /**
   * Track previous isOpen state to detect dialog open
   */
  const prevIsOpenRef = useRef(isOpen);

  /**
   * Load current settings when dialog opens
   * Only reset tab when dialog first opens, not when config changes during editing
   */
  useEffect(() => {
    const isDialogJustOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && config) {
      setAutoRefresh(config.autoRefresh);
      setProjectDirectories(config.projectDirectories || []);

      // Load skill editor config with defaults
      if (config.skillEditor) {
        setSkillEditorConfig(config.skillEditor);
      }

      // Load current language
      setCurrentLanguage(getCurrentLanguage());

      // Load proxy configuration (handle both old and new format)
      if (config.proxy) {
        // Migrate old format to new format if needed
        if (config.proxy.enabled !== undefined) {
          setProxyConfig(config.proxy);
        } else if (config.proxy.useSystemProxy !== undefined || config.proxy.customProxyUrl) {
          // Old format - migrate to new
          setProxyConfig({
            enabled: !!(config.proxy.useSystemProxy || config.proxy.customProxyUrl),
            type: config.proxy.customProxyUrl ? 'custom' : 'system',
            customUrl: config.proxy.customProxyUrl || '',
          });
        }
      }

      setError(null);
      setSuccess(null);
      // Only reset to general tab when dialog first opens, not on config changes
      if (isDialogJustOpened) {
        setActiveTab('general');
      }
    }
  }, [isOpen, config]);

  /**
   * Load private repositories
   */
  useEffect(() => {
    if (isOpen && activeTab === 'repositories') {
      loadPrivateRepos();
    }
  }, [isOpen, activeTab]);

  /**
   * Load AI configuration
   */
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      loadAIConfig();
    }
  }, [isOpen, activeTab]);

  const loadPrivateRepos = async () => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const response = await window.electronAPI.listPrivateRepos();
      if (response.success && response.data) {
        setPrivateRepos(response.data);
      } else {
        setError(response.error?.message || 'Failed to load repositories');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(message);
      console.error('Load repos error:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  /**
   * Handle add project directory - opens directory picker and adds directly
   */
  const handleAddDirectory = async () => {
    setIsAddingDirectory(true);
    setError(null);
    setSuccess(null);

    try {
      // Open directory picker directly
      const response = await window.electronAPI.selectDirectory();
      if (response.success && response.data && !response.data.canceled && response.data.filePaths.length > 0) {
        const selectedPath = response.data.filePaths[0];

        // Check if already exists
        if (projectDirectories.includes(selectedPath)) {
          setError('This directory is already added');
          return;
        }

        // Add the directory
        const updatedDirectories = [...projectDirectories, selectedPath];
        setProjectDirectories(updatedDirectories);

        // Save immediately
        await onSave({ projectDirectories: updatedDirectories });
        setSuccess('Project directory added successfully');

        // Notify parent component about the new directory (for migration check)
        if (onDirectoryAdded) {
          onDirectoryAdded(selectedPath);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add directory';
      setError(message);
      console.error('Add directory error:', err);
    } finally {
      setIsAddingDirectory(false);
    }
  };

  /**
   * Handle remove project directory
   */
  const handleRemoveDirectory = async (directoryPath: string) => {
    setError(null);
    setSuccess(null);

    try {
      const updatedDirectories = projectDirectories.filter(d => d !== directoryPath);
      setProjectDirectories(updatedDirectories);

      // Save immediately
      await onSave({ projectDirectories: updatedDirectories });

      setSuccess('Project directory removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove directory';
      setError(message);
      console.error('Remove directory error:', err);
    }
  };

  /**
   * Handle language change
   */
  const handleLanguageChange = async (languageCode: LanguageCode) => {
    setError(null);
    setSuccess(null);

    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      setSuccess(t('settings.languageChanged'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change language';
      setError(message);
      console.error('Language change error:', err);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave({
        autoRefresh,
        skillEditor: skillEditorConfig,
        proxy: proxyConfig,
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Load AI configuration
   */
  const loadAIConfig = useCallback(async () => {
    setIsLoadingAI(true);
    setError(null);
    try {
      const response = await window.electronAPI.getAIConfiguration();
      if (response.success && response.data) {
        setAiConfig(response.data);
        setAITestResult(null);
      } else {
        setError(response.error?.message || 'Failed to load AI configuration');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load AI configuration';
      setError(message);
      console.error('Load AI config error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  /**
   * Load AI configuration when AI tab is opened
   */
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      loadAIConfig();
    }
  }, [isOpen, activeTab, loadAIConfig]);

  /**
   * Load skill groups
   */
  const loadSkillGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    setError(null);
    try {
      const response = await window.electronAPI.listSkillGroups();
      if (response.success && response.data) {
        setSkillGroups(response.data);
      } else {
        setError(response.error?.message || 'Failed to load skill groups');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load skill groups';
      setError(message);
      console.error('Load skill groups error:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  /**
   * Load skill groups when Skill Groups tab is opened
   */
  useEffect(() => {
    if (isOpen && activeTab === 'skill-groups') {
      loadSkillGroups();

      // Subscribe to skills:refresh event to reload groups
      const unsubscribe = window.electronAPI.onSkillsRefresh(() => {
        loadSkillGroups();
      });

      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [isOpen, activeTab, loadSkillGroups]);

  /**
   * Handle add skill group
   */
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingGroup(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.createSkillGroup({
        name: newGroupName,
        description: newGroupDescription,
        color: newGroupColor,
        icon: newGroupIcon,
      });

      if (response.success && response.data) {
        setSuccess(t('settings.groupCreated'));
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupColor('#3B82F6');
        setNewGroupIcon('⌨️');
        setShowAddGroupForm(false);
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to create group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      setError(message);
      console.error('Add group error:', err);
    } finally {
      setIsAddingGroup(false);
    }
  };

  /**
   * Handle edit skill group - start editing
   */
  const handleStartEditGroup = (group: SkillGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setEditGroupColor(group.color || '#3B82F6');
    setEditGroupIcon(group.icon || '📁');
    setError(null);
    setSuccess(null);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditGroupName('');
    setEditGroupDescription('');
    setEditGroupColor('#3B82F6');
    setEditGroupIcon('📁');
  };

  /**
   * Handle save edit group
   */
  const handleSaveEditGroup = async (groupId: string) => {
    setIsUpdatingGroup(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.updateSkillGroup(groupId, {
        name: editGroupName,
        description: editGroupDescription,
        color: editGroupColor,
        icon: editGroupIcon,
      });

      if (response.success) {
        setSuccess(t('settings.groupUpdated'));
        setEditingGroupId(null);
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to update group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update group';
      setError(message);
      console.error('Update group error:', err);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  /**
   * Handle delete skill group
   */
  const handleDeleteGroup = async (groupId: string) => {
    const group = skillGroups.find(g => g.id === groupId);
    const groupName = group?.name || 'this group';

    if (!window.confirm(
      t('settings.deleteGroupConfirm', { name: groupName })
    )) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.deleteSkillGroup(groupId);
      if (response.success) {
        setSuccess(t('settings.groupDeleted'));
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to delete group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      setError(message);
      console.error('Delete group error:', err);
    }
  };

  /**
   * Handle toggle group enabled status
   */
  const handleToggleGroupEnabled = async (groupId: string, enabled: boolean) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.updateSkillGroup(groupId, { enabled });
      if (response.success) {
        setSuccess(enabled ? t('settings.groupEnabled') : t('settings.groupDisabled'));
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to update group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update group';
      setError(message);
      console.error('Toggle group enabled error:', err);
    }
  };

  /**
   * Handle add tag to group
   */
  const handleAddTagToGroup = async (groupId: string, tag: string) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.addTagToGroup(groupId, tag);
      if (response.success) {
        setSuccess(t('settings.groupUpdated'));
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to add tag to group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add tag to group';
      setError(message);
      console.error('Add tag to group error:', err);
    }
  };

  /**
   * Handle remove tag from group
   */
  const handleRemoveTagFromGroup = async (groupId: string, tag: string) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.removeTagFromGroup(groupId, tag);
      if (response.success) {
        setSuccess(t('settings.groupUpdated'));
        await loadSkillGroups();
      } else {
        setError(response.error?.message || 'Failed to remove tag from group');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove tag from group';
      setError(message);
      console.error('Remove tag from group error:', err);
    }
  };

  /**
   * Handle test AI connection
   */
  const handleTestAIConnection = useCallback(async () => {
    if (!aiConfig) return;

    setIsTestingAI(true);
    setAITestResult(null);
    setError(null);

    try {
      const startTime = Date.now();
      // Pass current config to test (allows testing before saving)
      const response = await window.electronAPI.testAIConnection(aiConfig);
      const latency = Date.now() - startTime;

      if (response.success) {
        setAITestResult({ success: true, latency });
        setSuccess('AI connection test successful');
      } else {
        setAITestResult({
          success: false,
          error: response.error?.message || 'Connection test failed'
        });
        setError(response.error?.message || 'Connection test failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setAITestResult({ success: false, error: message });
      setError(message);
      console.error('Test AI connection error:', err);
    } finally {
      setIsTestingAI(false);
    }
  }, [aiConfig]);

  /**
   * Handle save AI configuration
   */
  const handleSaveAIConfig = useCallback(async () => {
    if (!aiConfig) return;

    setIsSavingAI(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.saveAIConfiguration(aiConfig);
      if (response.success) {
        setSuccess('AI configuration saved successfully');
        setAITestResult(null);
      } else {
        setError(response.error?.message || 'Failed to save AI configuration');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save AI configuration';
      setError(message);
      console.error('Save AI config error:', err);
    } finally {
      setIsSavingAI(false);
    }
  }, [aiConfig]);

  /**
   * Handle add repository
   */
  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRepo(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.addPrivateRepo({
        url: newRepoUrl,
        pat: newRepoPAT,
        displayName: newRepoDisplayName || undefined,
        provider: newRepoProvider,
        instanceUrl: newRepoInstanceUrl || undefined,
      });

      if (response.success && response.data) {
        setSuccess('Repository added successfully');
        setNewRepoUrl('');
        setNewRepoPAT('');
        setNewRepoDisplayName('');
        setNewRepoProvider('github');
        setNewRepoInstanceUrl('');
        setShowAddRepoForm(false);
        await loadPrivateRepos();

        // Dispatch custom event to notify PrivateRepoList to refresh
        window.dispatchEvent(new CustomEvent('private-repo-updated', {
          detail: { repoId: response.data.id, patUpdated: false, isNew: true }
        }));
      } else {
        setError(response.error?.message || 'Failed to add repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add repository';
      setError(message);
      console.error('Add repo error:', err);
    } finally {
      setIsAddingRepo(false);
    }
  };

  /**
   * Handle test repository connection
   */
  const handleTestRepo = async (repoId: string) => {
    setTestingRepoId(repoId);
    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.testPrivateRepoConnection(repoId);
      if (response.success && response.data) {
        if (response.data.valid) {
          setSuccess(`Connection successful: ${response.data.repository?.name}`);
        } else {
          setError(`Connection failed: ${response.data.error || 'Unknown error'}`);
        }
      } else {
        setError(response.error?.message || 'Failed to test connection');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test connection';
      setError(message);
      console.error('Test repo error:', err);
    } finally {
      setTestingRepoId(null);
    }
  };

  /**
   * Handle remove repository
   */
  const handleRemoveRepo = async (repoId: string) => {
    const repo = privateRepos.find(r => r.id === repoId);
    const repoName = repo?.displayName || `${repo?.owner}/${repo?.repo}` || 'this repository';

    if (!window.confirm(
      `Remove "${repoName}"?\n\n` +
      `Note: Locally installed skills from this repository will be preserved and can still be used.\n\n` +
      `You can re-add this repository later if needed.`
    )) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await window.electronAPI.removePrivateRepo(repoId);
      if (response.success) {
        setSuccess('Repository removed successfully. Installed skills have been preserved.');
        await loadPrivateRepos();
      } else {
        setError(response.error?.message || 'Failed to remove repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove repository';
      setError(message);
      console.error('Remove repo error:', err);
    }
  };

  /**
   * Handle edit repository - start editing
   */
  const handleStartEditRepo = (repo: PrivateRepo) => {
    setEditingRepoId(repo.id);
    setEditDisplayName(repo.displayName || '');
    setEditPAT('');
    setError(null);
    setSuccess(null);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setEditingRepoId(null);
    setEditDisplayName('');
    setEditPAT('');
  };

  /**
   * Handle save edit repository
   */
  const handleSaveEditRepo = async (repoId: string) => {
    setIsUpdatingRepo(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: Partial<PrivateRepo> = {};

      if (editDisplayName.trim()) {
        updates.displayName = editDisplayName.trim();
      }

      if (editPAT.trim()) {
        // PAT will be encrypted by the backend service
        updates.patEncrypted = editPAT.trim();
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setIsUpdatingRepo(false);
        return;
      }

      const response = await window.electronAPI.updatePrivateRepo(repoId, updates);
      if (response.success) {
        setSuccess('Repository updated successfully');
        setEditingRepoId(null);
        setEditDisplayName('');
        setEditPAT('');
        await loadPrivateRepos();

        // Dispatch custom event to notify PrivateRepoList to refresh
        if (editPAT.trim()) {
          window.dispatchEvent(new CustomEvent('private-repo-updated', {
            detail: { repoId, patUpdated: true }
          }));
        }
      } else {
        setError(response.error?.message || 'Failed to update repository');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update repository';
      setError(message);
      console.error('Update repo error:', err);
    } finally {
      setIsUpdatingRepo(false);
    }
  };

  /**
   * Handle escape key to close
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 h-[85vh] max-h-[700px] flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-56 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.title')}</h2>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {t('settings.general')}
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'storage'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t('settings.storage')}
            </button>
            <button
              onClick={() => setActiveTab('skill-view')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'skill-view'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t('settings.skillEditor')}
            </button>
            <button
              onClick={() => setActiveTab('skill-groups')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'skill-groups'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t('settings.skillGroups')}
            </button>
            <button
              onClick={() => setActiveTab('repositories')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'repositories'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t('settings.privateRepositories')}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('settings.aiConfiguration')}
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {t('settings.keyboardShortcuts')}
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {activeTab === 'general' && t('settings.general')}
              {activeTab === 'storage' && t('settings.storage')}
              {activeTab === 'skill-view' && t('settings.skillEditor')}
              {activeTab === 'shortcuts' && t('settings.keyboardShortcuts')}
              {activeTab === 'skill-groups' && t('settings.skillGroups')}
              {activeTab === 'repositories' && t('settings.privateRepositories')}
              {activeTab === 'ai' && t('settings.aiConfiguration')}
            </h3>
            <button
              data-testid="close-settings-button"
              onClick={onClose}
              disabled={isSaving}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content Area with Scroll */}
          <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
          {/* Auto Refresh */}
          <div className="mb-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                data-testid="auto-refresh-toggle"
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                disabled={isSaving}
              />
              <span className="text-sm text-slate-700">{t('settings.autoRefresh')}</span>
            </label>
          </div>

          {/* Language Selection */}
          <div className="mb-4">
            <label
              htmlFor="language-select"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t('settings.language')}
            </label>
            <p className="text-xs text-slate-500 mb-2">
              {t('settings.languageDescription')}
            </p>
            <select
              id="language-select"
              data-testid="language-select"
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
              className="select w-full"
              disabled={isSaving}
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Proxy Configuration */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-slate-700">{t('settings.proxy.title')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('settings.proxy.description')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={proxyConfig.enabled}
                  onChange={(e) => setProxyConfig({ ...proxyConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                  disabled={isSaving}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Proxy Scope Info */}
            <div className="mb-3 flex items-start gap-2 text-xs text-blue-600 bg-blue-50 px-2.5 py-2 rounded-md">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {t('settings.proxy.scopeDescription')}
              </span>
            </div>

            {proxyConfig.enabled && (
              <div className="space-y-3 pl-1">
                {/* Proxy Type Selection */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="proxyType"
                      value="system"
                      checked={proxyConfig.type === 'system'}
                      onChange={() => setProxyConfig({ ...proxyConfig, type: 'system' })}
                      className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">{t('settings.proxy.systemProxy')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="proxyType"
                      value="custom"
                      checked={proxyConfig.type === 'custom'}
                      onChange={() => setProxyConfig({ ...proxyConfig, type: 'custom' })}
                      className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">{t('settings.proxy.customProxy')}</span>
                  </label>
                </div>

                {/* System Proxy Hint */}
                {proxyConfig.type === 'system' && (
                  <p className="text-xs text-slate-400">
                    {t('settings.proxy.systemProxyHint')}
                  </p>
                )}

                {/* Custom Proxy URL */}
                {proxyConfig.type === 'custom' && (
                  <div>
                    <input
                      type="text"
                      value={proxyConfig.customUrl || ''}
                      onChange={(e) => setProxyConfig({ ...proxyConfig, customUrl: e.target.value || undefined })}
                      placeholder="http://127.0.0.1:7890"
                      className="input w-full"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {t('settings.proxy.customProxyHint')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            {/* Project Directories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t('settings.directories')}
                </label>
                <button
                  type="button"
                  onClick={handleAddDirectory}
                  className="btn btn-secondary btn-sm"
                  disabled={isAddingDirectory}
                >
                  {isAddingDirectory ? (
                    <>
                      <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('settings.adding')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('settings.addDirectory')}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {t('settings.directoriesDescription')}
              </p>

              {/* Tip for project skills directory */}
              <div className="mb-3 flex items-start gap-2 text-xs text-blue-600 bg-blue-50 px-2.5 py-2 rounded-md">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>{t('settings.quickTip')}</strong> {t('settings.tipProjectSkills')} <code className="bg-blue-100 px-1 rounded font-mono">skills</code> (e.g., <code className="bg-blue-100 px-1 rounded font-mono">/path/to/project/skills</code>)
                </span>
              </div>

              {/* Directory List */}
              {projectDirectories.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  {t('settings.noDirectories')}
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDirectories.map((dir) => (
                    <div
                      key={dir}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <span className="text-sm text-slate-700 font-mono truncate flex-1" title={dir}>
                        {dir}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDirectory(dir)}
                        className="btn btn-danger btn-sm ml-2"
                        title={t('settings.removeDirectory')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success message */}
            {success && activeTab === 'storage' && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'storage' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Skill View Tab */}
        {activeTab === 'skill-view' && (
          <div className="space-y-6">
            {/* Skill Editor Configuration */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3 border-b border-slate-200 pb-2">
                {t('settings.skillEditor')}
              </h3>
              <div className="space-y-3">
                {/* Font Size and Theme - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('settings.fontSize')}
                    </label>
                    <select
                      data-testid="editor-font-size"
                      value={skillEditorConfig.fontSize}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, fontSize: parseInt(e.target.value) })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="10">10px - Very Small</option>
                      <option value="11">11px - Small</option>
                      <option value="12">12px - Compact</option>
                      <option value="13">13px - Medium Small</option>
                      <option value="14">14px - Default</option>
                      <option value="15">15px - Medium</option>
                      <option value="16">16px - Large</option>
                      <option value="18">18px - Extra Large</option>
                      <option value="20">20px - Big</option>
                      <option value="22">22px - Very Big</option>
                      <option value="24">24px - Huge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('settings.theme')}
                    </label>
                    <select
                      value={skillEditorConfig.theme}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, theme: e.target.value as 'light' | 'dark' })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="light">{t('settings.light')}</option>
                      <option value="dark">{t('settings.dark')}</option>
                    </select>
                  </div>
                </div>

                {/* Tab Size and Line Numbers - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('settings.tabSize')}
                    </label>
                    <input
                      data-testid="tab-size"
                      type="number"
                      value={skillEditorConfig.tabSize}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, tabSize: parseInt(e.target.value) })}
                      min={2}
                      max={8}
                      step={2}
                      className="input w-full"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-slate-500 mt-1">2 - 8</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('settings.lineNumbers')}
                    </label>
                    <select
                      value={skillEditorConfig.lineNumbers}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, lineNumbers: e.target.value as 'on' | 'off' | 'relative' })}
                      className="select w-full"
                      disabled={isSaving}
                    >
                      <option value="on">{t('settings.on')}</option>
                      <option value="off">{t('settings.off')}</option>
                      <option value="relative">{t('settings.relative')}</option>
                    </select>
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('settings.fontFamily')}
                  </label>
                  <select
                    value={skillEditorConfig.fontFamily}
                    onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, fontFamily: e.target.value })}
                    className="select w-full"
                    disabled={isSaving}
                  >
                    <option value="'Fira Code', 'Cascadia Code', 'Consolas', monospace">Fira Code (Recommended)</option>
                    <option value="'Cascadia Code', 'Consolas', monospace">Cascadia Code</option>
                    <option value="'JetBrains Mono', 'Consolas', monospace">JetBrains Mono</option>
                    <option value="'Source Code Pro', 'Consolas', monospace">Source Code Pro</option>
                    <option value="Consolas, 'Courier New', monospace">Consolas (Windows)</option>
                    <option value="'Monaco', 'Menlo', monospace">Monaco (macOS)</option>
                    <option value="'Menlo', 'Monaco', monospace">Menlo (macOS)</option>
                    <option value="'Courier New', monospace">Courier New (Universal)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('settings.selectMonospaceFont')}
                  </p>
                </div>

                {/* Auto-save Options */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skillEditorConfig.autoSaveEnabled}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, autoSaveEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">{t('settings.enableAutoSave')}</span>
                  </label>

                  {skillEditorConfig.autoSaveEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.autoSaveDelay')}
                      </label>
                      <input
                        type="number"
                        value={skillEditorConfig.autoSaveDelay}
                        onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, autoSaveDelay: parseInt(e.target.value) })}
                        min={500}
                        max={10000}
                        step={500}
                        className="input w-full"
                        disabled={isSaving}
                      />
                      <p className="text-xs text-slate-500 mt-1">500 - 10,000 (default: 2000)</p>
                    </div>
                  )}
                </div>

                {/* Editor Display Options */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      data-testid="show-minimap-toggle"
                      type="checkbox"
                      checked={skillEditorConfig.showMinimap}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, showMinimap: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">{t('settings.showMinimap')}</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      data-testid="word-wrap-toggle"
                      type="checkbox"
                      checked={skillEditorConfig.wordWrap}
                      onChange={(e) => setSkillEditorConfig({ ...skillEditorConfig, wordWrap: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-slate-700">{t('settings.enableWordWrap')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Success message */}
            {success && activeTab === 'skill-view' && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'skill-view' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSaving(true);
                  setError(null);
                  setSuccess(null);
                  try {
                    await onSave({
                      skillEditor: skillEditorConfig,
                    });
                    setSuccess(t('settings.skillEditorSettingsSaved'));
                    setTimeout(() => {
                      onClose();
                    }, 1000);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to save settings';
                    setError(message);
                    console.error('Save skill editor settings error:', err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? t('common.saving') : t('settings.settingsSaved')}
              </button>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            {/* General Shortcuts */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">{t('settings.generalShortcuts')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.createNewSkill')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Ctrl+N</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.refreshSkillList')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Ctrl+R</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.saveSkill')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Ctrl+S</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.closeEditor')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Ctrl+W</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.deleteSkill')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Delete</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{t('settings.closeDialog')}</span>
                  <kbd className="px-2.5 py-1 bg-slate-200 rounded text-xs text-slate-700 font-mono">Esc</kbd>
                </div>
              </div>
            </div>

            {/* AI Shortcuts */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">{t('settings.aiShortcuts')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-slate-600 dark:text-slate-300">{t('settings.aiRewrite')}</span>
                  <kbd className="px-2.5 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">Ctrl+Alt+R</kbd>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-slate-600 dark:text-slate-300">{t('settings.aiInsert')}</span>
                  <kbd className="px-2.5 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">Ctrl+Alt+I</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repositories' && (
          <div>
            {/* Add Repository Button */}
            <div className="mb-3">
              <button
                onClick={() => setShowAddRepoForm(!showAddRepoForm)}
                className="btn btn-primary btn-sm"
                disabled={isAddingRepo}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('settings.addRepository')}
              </button>
            </div>

            {/* Add Repository Form */}
            {showAddRepoForm && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-3">{t('settings.addPrivateRepository')}</h3>
                <form onSubmit={handleAddRepo}>
                  <div className="space-y-3">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.provider')}
                      </label>
                      <select
                        value={newRepoProvider}
                        onChange={(e) => setNewRepoProvider(e.target.value as 'github' | 'gitlab')}
                        className="input w-full"
                        disabled={isAddingRepo}
                      >
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                      </select>
                    </div>

                    {/* Instance URL (only for GitLab) */}
                    {newRepoProvider === 'gitlab' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {t('settings.gitlabInstanceUrl')}
                        </label>
                        <input
                          type="text"
                          value={newRepoInstanceUrl}
                          onChange={(e) => setNewRepoInstanceUrl(e.target.value)}
                          placeholder={t('settings.gitlabInstanceUrlPlaceholder')}
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {t('settings.gitlabInstanceUrlHint')}
                        </p>
                      </div>
                    )}

                    {/* Repository URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.repositoryUrl')}
                      </label>
                      <input
                        type="text"
                        value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        placeholder={
                          newRepoProvider === 'github'
                            ? 'https://github.com/owner/repo'
                            : newRepoInstanceUrl
                            ? `${newRepoInstanceUrl}/owner/repo`
                            : 'https://gitlab.com/owner/repo'
                        }
                        className="input w-full"
                        disabled={isAddingRepo}
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {newRepoProvider === 'github'
                          ? 'Enter your GitHub repository URL'
                          : 'Enter your GitLab repository URL'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Personal Access Token */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {t('settings.personalAccessToken')}
                        </label>
                        <input
                          type="password"
                          value={newRepoPAT}
                          onChange={(e) => setNewRepoPAT(e.target.value)}
                          placeholder={newRepoProvider === 'github' ? 'ghp_xxxx...' : 'glpat-xxxx...'}
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                          required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {newRepoProvider === 'github'
                            ? t('settings.githubPatScope')
                            : t('settings.gitlabPatScope')}
                        </p>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {t('settings.displayNameOptional')}
                        </label>
                        <input
                          type="text"
                          value={newRepoDisplayName}
                          onChange={(e) => setNewRepoDisplayName(e.target.value)}
                          placeholder={t('settings.displayNamePlaceholder')}
                          className="input w-full text-sm"
                          disabled={isAddingRepo}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRepoForm(false);
                        setNewRepoProvider('github');
                        setNewRepoInstanceUrl('');
                      }}
                      className="btn btn-secondary btn-sm"
                      disabled={isAddingRepo}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isAddingRepo || !newRepoUrl || !newRepoPAT}
                    >
                      {isAddingRepo ? t('common.adding') : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Success message */}
            {success && activeTab === 'repositories' && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'repositories' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Repository List */}
            {isLoadingRepos ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : privateRepos.length === 0 ? (
              <div className="text-center py-6">
                <svg
                  className="mx-auto h-10 w-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-600">{t('settings.noRepositories')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {privateRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {editingRepoId === repo.id ? (
                      // Edit Form
                      <div className="space-y-2.5">
                        <h4 className="text-sm font-medium text-slate-900">{t('settings.editRepository')}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              {t('settings.displayName')}
                            </label>
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder={`${repo.owner}/${repo.repo}`}
                              className="input w-full text-sm"
                              disabled={isUpdatingRepo}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              {t('settings.newPat')}
                            </label>
                            <input
                              type="password"
                              value={editPAT}
                              onChange={(e) => setEditPAT(e.target.value)}
                              placeholder={t('settings.leaveEmptyToKeep')}
                              className="input w-full text-sm"
                              disabled={isUpdatingRepo}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEditRepo(repo.id)}
                            disabled={isUpdatingRepo}
                            className="btn btn-primary btn-sm"
                          >
                            {isUpdatingRepo ? t('common.saving') : t('common.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdatingRepo}
                            className="btn btn-secondary btn-sm"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal Display
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <svg
                              className="w-4 h-4 text-slate-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <h4 className="text-sm font-medium text-slate-900 truncate">
                              {repo.displayName || `${repo.owner}/${repo.repo}`}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                (repo.provider || 'github') === 'github'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-orange-100 text-orange-600'
                              }`}
                            >
                              {(repo.provider || 'github') === 'github' ? 'GitHub' : 'GitLab'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate mb-1">{repo.url}</p>
                          {repo.instanceUrl && (
                            <p className="text-xs text-slate-500 truncate mb-1">
                              Instance: {repo.instanceUrl}
                            </p>
                          )}
                          {repo.description && (
                            <p className="text-xs text-slate-500 truncate mb-1">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{repo.defaultBranch || 'main'}</span>
                            {repo.skillCount !== undefined && (
                              <span>{repo.skillCount} skills</span>
                            )}
                            {repo.lastSyncTime && (
                              <span>{new Date(repo.lastSyncTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleTestRepo(repo.id)}
                            disabled={testingRepoId === repo.id}
                            className="btn btn-secondary btn-sm"
                            title={t('settings.testConnection')}
                          >
                            {testingRepoId === repo.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600"></div>
                            ) : (
                              t('settings.testConnection')
                            )}
                          </button>
                          <button
                            onClick={() => handleStartEditRepo(repo)}
                            className="btn btn-secondary btn-sm"
                            title={t('settings.editRepository')}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleRemoveRepo(repo.id)}
                            className="btn btn-secondary btn-sm text-red-600 hover:text-red-700"
                            title={t('settings.removeRepository')}
                          >
                            {t('settings.removeRepository')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skill Groups Tab */}
        {activeTab === 'skill-groups' && (
          <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('settings.skillGroupsDescription')}
                </p>
              </div>
              <button
                onClick={() => setShowAddGroupForm(!showAddGroupForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                disabled={isAddingGroup}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('settings.addGroup')}
              </button>
            </div>

            {/* Add Group Form */}
            {showAddGroupForm && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('settings.addGroup')}</h3>
                </div>
                <form onSubmit={handleAddGroup} className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Group Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('settings.groupName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t('settings.groupNamePlaceholder')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isAddingGroup}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('settings.groupDescription')}
                      </label>
                      <input
                        type="text"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder={t('settings.groupDescriptionPlaceholder')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isAddingGroup}
                      />
                    </div>
                  </div>

                  {/* Color and Icon Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Color Presets */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('settings.groupColor')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setNewGroupColor(color.value)}
                            disabled={isAddingGroup}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${
                              newGroupColor === color.value
                                ? 'border-slate-900 dark:border-white scale-110 shadow-sm'
                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-400'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={`${color.name} - ${color.description}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Icon Presets */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('settings.groupIcon')}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_ICONS.map((icon) => (
                          <button
                            key={icon.value}
                            type="button"
                            onClick={() => setNewGroupIcon(icon.value)}
                            disabled={isAddingGroup}
                            className={`w-8 h-8 text-base rounded-lg border-2 transition-all ${
                              newGroupIcon === icon.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                            title={`${icon.name} - ${icon.description}`}
                          >
                            {icon.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddGroupForm(false);
                        setNewGroupName('');
                        setNewGroupDescription('');
                        setNewGroupColor('#3B82F6');
                        setNewGroupIcon('⌨️');
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                      disabled={isAddingGroup}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      disabled={isAddingGroup || !newGroupName.trim()}
                    >
                      {isAddingGroup ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {t('common.creating')}
                        </span>
                      ) : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Success message */}
            {success && activeTab === 'skill-groups' && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && activeTab === 'skill-groups' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Groups List */}
            {isLoadingGroups ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : skillGroups.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t('settings.noGroups')}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('settings.noGroupsDescription')}</p>
                <button
                  onClick={() => setShowAddGroupForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('settings.addGroup')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {skillGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden ${
                      group.enabled === false ? 'opacity-60' : ''
                    }`}
                  >
                    {editingGroupId === group.id ? (
                      // Edit Form
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${editGroupColor}20` }}
                          >
                            <span className="text-lg">{editGroupIcon}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('settings.editGroup')}</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('settings.groupName')}
                              </label>
                              <input
                                type="text"
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isUpdatingGroup}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('settings.groupDescription')}
                              </label>
                              <input
                                type="text"
                                value={editGroupDescription}
                                onChange={(e) => setEditGroupDescription(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isUpdatingGroup}
                              />
                            </div>
                          </div>
                          {/* Color Presets */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              {t('settings.groupColor')}
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {PRESET_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  onClick={() => setEditGroupColor(color.value)}
                                  disabled={isUpdatingGroup}
                                  className={`w-6 h-6 rounded-md border-2 transition-all ${
                                    editGroupColor === color.value
                                      ? 'border-slate-900 dark:border-white scale-110'
                                      : 'border-transparent hover:border-slate-300'
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Icon Presets */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              {t('settings.groupIcon')}
                            </label>
                            <div className="flex flex-wrap gap-0.5">
                              {PRESET_ICONS.map((icon) => (
                                <button
                                  key={icon.value}
                                  type="button"
                                  onClick={() => setEditGroupIcon(icon.value)}
                                  disabled={isUpdatingGroup}
                                  className={`w-7 h-7 text-sm rounded-md border transition-all ${
                                    editGroupIcon === icon.value
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                      : 'border-transparent hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {icon.value}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleSaveEditGroup(group.id)}
                              disabled={isUpdatingGroup}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isUpdatingGroup ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={handleCancelEditGroup}
                              disabled={isUpdatingGroup}
                              className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Normal Display
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Icon */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${group.color}15` }}
                            >
                              <span className="text-xl" style={{ color: group.color }}>
                                {group.icon || '📁'}
                              </span>
                            </div>
                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {group.name}
                                </h4>
                                {group.enabled === false && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                    {t('settings.disabled')}
                                  </span>
                                )}
                              </div>
                              {group.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{group.description}</p>
                              )}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Enable/Disable Toggle */}
                            <button
                              onClick={() => handleToggleGroupEnabled(group.id, group.enabled === false)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                group.enabled !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                              title={group.enabled !== false ? t('settings.groupDisable') : t('settings.groupEnable')}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  group.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEditGroup(group)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={t('settings.editGroup')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('settings.deleteGroup')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span>{t('settings.tagsInGroup', { count: group.tags.length })}</span>
                          </div>
                          {group.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {group.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                                  style={{
                                    backgroundColor: `${group.color}15`,
                                    color: group.color,
                                    border: `1px solid ${group.color}30`
                                  }}
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTagFromGroup(group.id, tag)}
                                    className="ml-0.5 hover:opacity-70 transition-opacity"
                                    title={t('settings.removeFromGroup')}
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Configuration Tab */}
        {activeTab === 'ai' && (() => {
          console.log('[Settings] Rendering AI Configuration tab', { isLoadingAI, hasAiConfig: !!aiConfig });
          return (
          <div>
            {isLoadingAI ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : aiConfig ? (
              <div className="space-y-4">
                {/* API Configuration Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">{t('settings.apiConfiguration')}</h3>

                  {/* API Key - Full width */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('settings.apiKey')}
                    </label>
                    <input
                      data-testid="ai-api-key"
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="input w-full"
                      disabled={isSavingAI}
                    />
                  </div>

                  {/* Base URL and Model - Side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.baseUrl')}
                      </label>
                      <input
                        type="text"
                        value={aiConfig.baseUrl || ''}
                        onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value || undefined })}
                        placeholder="https://api.anthropic.com"
                        className="input w-full text-sm"
                        disabled={isSavingAI}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.model')}
                      </label>
                      <input
                        type="text"
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                        className="input w-full text-sm"
                        disabled={isSavingAI}
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>

                {/* Request Settings Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">{t('settings.requestSettings')}</h3>

                  {/* Timeout and Retries - Side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.timeout')}
                      </label>
                      <input
                        type="number"
                        value={aiConfig.timeout}
                        onChange={(e) => setAiConfig({ ...aiConfig, timeout: parseInt(e.target.value) })}
                        min={5000}
                        max={60000}
                        step={1000}
                        className="input w-full"
                        disabled={isSavingAI}
                      />
                      <p className="text-xs text-slate-500 mt-1">5,000 - 60,000</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('settings.maxRetries')}
                      </label>
                      <input
                        type="number"
                        value={aiConfig.maxRetries}
                        onChange={(e) => setAiConfig({ ...aiConfig, maxRetries: parseInt(e.target.value) })}
                        min={0}
                        max={5}
                        className="input w-full"
                        disabled={isSavingAI}
                      />
                      <p className="text-xs text-slate-500 mt-1">0 - 5 attempts</p>
                    </div>
                  </div>

                  {/* Streaming Toggle */}
                  <div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiConfig.streamingEnabled}
                        onChange={(e) => setAiConfig({ ...aiConfig, streamingEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white"
                        disabled={isSavingAI}
                      />
                      <span className="text-sm text-slate-700">{t('settings.enableStreamingResponses')}</span>
                    </label>
                  </div>
                </div>

                {/* Test Result */}
                {aiTestResult && (
                  <div className={`p-3 rounded-md ${
                    aiTestResult.success
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          aiTestResult.success ? 'text-green-400' : 'text-red-400'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {aiTestResult.success ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                      </svg>
                      <div className="text-sm">
                        {aiTestResult.success ? (
                          <p className="text-green-400">
                            {t('settings.connectionTestSuccessful', { latency: aiTestResult.latency })}
                          </p>
                        ) : (
                          <p className="text-red-400">{aiTestResult.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Success/Error messages */}
                {success && activeTab === 'ai' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-sm text-green-400">{success}</p>
                    </div>
                  </div>
                )}

                {error && activeTab === 'ai' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    data-testid="test-connection-button"
                    type="button"
                    onClick={handleTestAIConnection}
                    disabled={isTestingAI || !aiConfig.apiKey}
                    className="btn btn-secondary"
                  >
                    {isTestingAI ? t('settings.testingConnection') : t('settings.testConnectionButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAIConfig}
                    disabled={isSavingAI || !aiConfig.apiKey}
                    className="btn btn-primary"
                  >
                    {isSavingAI ? t('common.saving') : t('settings.saveConfiguration')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.aiNotConfigured')}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('settings.aiConfigureDescription')}
                </p>
              </div>
            )}
          </div>
          );
        })()}
          </div>
        </div>
      </div>
    </div>
  );
}
