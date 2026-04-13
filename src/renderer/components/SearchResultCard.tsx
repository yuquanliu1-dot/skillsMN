/**
 * SearchResultCard Component
 *
 * Displays a GitHub repository with skill files - Modern minimalist design
 */

import type { SearchResult } from '../../shared/types';

interface SearchResultCardProps {
  result: SearchResult;
  onPreview: (downloadUrl: string) => void;
  onInstall: (repositoryName: string, skillFilePath: string, downloadUrl: string) => void;
  onConflict: (repositoryName: string, skillFilePath: string, downloadUrl: string) => void;
}

export default function SearchResultCard({
  result,
  onPreview,
  onInstall,
}: SearchResultCardProps): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      {/* Repository Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={result.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium text-lg truncate transition-colors"
            >
              {result.repositoryName}
            </a>
            <a
              href={result.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Open repository in GitHub"
              title="Open in GitHub"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{result.description}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400 ml-4 flex-shrink-0">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{result.stars}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>{result.forks}</span>
          </div>
        </div>
      </div>

      {/* Language Badge */}
      {result.language && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            {result.language}
          </span>
          {result.archived && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Archived
            </span>
          )}
        </div>
      )}

      {/* Skill Files */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Skills ({result.skillFiles.length})
          </span>
        </div>

        {result.skillFiles.length > 0 ? (
          <div className="space-y-2">
            {result.skillFiles.slice(0, 3).map((skill: { path: string; downloadUrl: string }, index: number) => (
              <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 truncate">{skill.path}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(skill.downloadUrl)}
                    className="btn btn-secondary btn-sm border border-gray-200 text-xs cursor-pointer flex items-center gap-1"
                    aria-label="Preview skill"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                  <button
                    onClick={() => onInstall(result.repositoryName, skill.path, skill.downloadUrl)}
                    className="btn btn-primary btn-sm flex items-center gap-1 shadow-sm cursor-pointer"
                    aria-label="Install skill"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install
                  </button>
                </div>
              </div>
            ))}
            {result.skillFiles.length > 3 && (
              <div className="text-xs text-gray-400 text-center py-2">
                +{result.skillFiles.length - 3} more skills
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-3">No skill files found</div>
        )}
      </div>
    </div>
  );
}
