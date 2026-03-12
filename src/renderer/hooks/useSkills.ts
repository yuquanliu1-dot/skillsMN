/**
 * Custom React Hooks for Skill Operations
 *
 * Provides type-safe hooks for interacting with skills via IPC
 */

import { useState, useEffect, useCallback } from 'react';
import type { Skill } from '../../shared/types';

/**
 * Hook for loading and managing the skill list
 */
export function useSkills(projectDirectory: string | null) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    if (!projectDirectory) {
      setSkills([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.listSkills(
        { projectDirectory } as any
      );

      if (response.success && response.data) {
        setSkills(response.data);
      } else {
        setError(response.error?.message || 'Failed to load skills');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectDirectory]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Listen for file system changes
  useEffect(() => {
    const handleFSChange = () => {
      loadSkills();
    };

    window.electronAPI.onFSChange(handleFSChange);

    return () => {
      window.electronAPI.removeFSChangeListener();
    };
  }, [loadSkills]);

  return { skills, loading, error, reload: loadSkills };
}

/**
 * Hook for loading a single skill's content
 */
export function useSkill(skillPath: string | null) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillPath) {
      setSkill(null);
      setContent('');
      return;
    }

    const loadSkill = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await window.electronAPI.getSkill(skillPath);

        if (response.success && response.data) {
          setSkill(response.data.metadata);
          setContent(response.data.content);
        } else {
          setError(response.error?.message || 'Failed to load skill');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadSkill();
  }, [skillPath]);

  return { skill, content, loading, error };
}

/**
 * Hook for creating a new skill
 */
export function useCreateSkill() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSkill = useCallback(async (name: string, directory: 'project' | 'global'): Promise<Skill | null> => {
    setCreating(true);
    setError(null);

    try {
      const response = await window.electronAPI.createSkill(
        name,
        directory
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to create skill');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createSkill, creating, error };
}

/**
 * Hook for saving skill content
 */
export function useSaveSkill() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSkill = useCallback(async (
    skillPath: string,
    content: string,
    expectedLastModified?: number
  ): Promise<Skill | null> => {
    setSaving(true);
    setError(null);

    try {
      const response = await window.electronAPI.updateSkill(
        skillPath,
        content,
        expectedLastModified
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to save skill');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saveSkill, saving, error };
}

/**
 * Hook for deleting a skill
 */
export function useDeleteSkill() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSkill = useCallback(async (skillPath: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);

    try {
      const response = await window.electronAPI.deleteSkill(skillPath);

      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to delete skill');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  return { deleteSkill, deleting, error };
}
