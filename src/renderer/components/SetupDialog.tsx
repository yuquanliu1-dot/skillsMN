/**
 * Setup Dialog Component
 * First-time setup wizard for configuring project directory
 */

import React, { useState, useEffect } from 'react';
import * as path from 'path';

interface SetupDialogProps {
  onComplete: (projectDir: string) => void;
}

export const SetupDialog: React.FC<SetupDialogProps> = ({ onComplete }) => {
  const [projectPath, setProjectPath] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    hasClaudeFolder: boolean;
    skillsDir: string | null;
    errors: string[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate path when it changes
  useEffect(() => {
    const validatePath = async () => {
      if (!projectPath) {
        setValidationResult(null);
        return;
      }

      setIsValidating(true);
      try {
        const response = await window.electronAPI.configValidateProjectDir(projectPath);
        setValidationResult(response.data);
      } catch (error) {
        console.error('Validation failed:', error);
        setValidationResult({
          isValid: false,
          hasClaudeFolder: false,
          skillsDir: null,
          errors: ['Failed to validate directory. Please try again.'],
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validatePath, 300);
    return () => clearTimeout(timeoutId);
  }, [projectPath]);

  const handleBrowse = async () => {
    // In a real implementation, this would open a file dialog
    // For now, we'll use a mock path input
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Get the directory path from the first file
        const filePath = files[0].path;
        const dirPath = path.dirname(filePath);
        setProjectPath(dirPath);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!validationResult?.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Save configuration
      await window.electronAPI.configSet({
        projectSkillDir: projectPath,
      });

      // Notify parent
      onComplete(projectPath);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Allow user to skip setup (will use global directory only)
    onComplete('');
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Welcome to SkillsMM</h2>
          <p className="text-gray-400">
            Let's set up your skill management center. Select your Claude project directory to get started.
          </p>
        </div>

        {/* Directory Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/your/claude/project"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleBrowse}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium transition-colors"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Validation Status */}
        {isValidating && (
          <div className="mb-4 flex items-center text-gray-400">
            <svg
              className="animate-spin h-5 w-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Validating directory...
          </div>
        )}

        {validationResult && !isValidating && (
          <div className="mb-4">
            {validationResult.isValid ? (
              <div className="flex items-start gap-2 text-green-400 bg-green-900 bg-opacity-20 rounded-md p-3">
                <svg className="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16 8 8 0 100 0zm3.707-9.293a1 1 0 00-1.414 1.414l2.293 2.293a1 1 0 001.414 0l3.414-3.414a1 1 0 00-1.414-1.414l-2.293-2.293a1 1 0 00-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium">Valid Claude project directory!</p>
                  {validationResult.skillsDir && (
                    <p className="text-sm text-green-300">
                      Skills directory: {validationResult.skillsDir}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-md p-3">
                <div className="flex items-start gap-2 text-red-400 mb-2">
                  <svg className="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16 8 8 0 100 1zm3.707-9.293a1 1 0 00-1.414 1.414l2.293 2.293a1 1 0 001.414 0l3.414-3.414a1 1 0 00-1.414-1.414l-2.293-2.293a1 1 0 00-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="font-medium">Invalid directory</p>
                </div>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validationResult?.isValid || isSubmitting}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            {isSubmitting ? 'Setting up...' : 'Get Started'}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Select a directory that contains a{' '}
            <code className="bg-gray-700 px-1 rounded">.claude</code> folder. This is typically your Claude Code project root.
          </p>
        </div>
      </div>
    </div>
  );
};
