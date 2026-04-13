/**
 * HtmlPreviewBlock - Sandboxed HTML preview in an iframe
 *
 * Renders HTML content inside a sandboxed iframe with srcdoc.
 */

import React, { useState } from 'react';

interface HtmlPreviewBlockProps {
  code: string;
}

function HtmlPreviewBlock({ code }: HtmlPreviewBlockProps): JSX.Element {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-medium uppercase">HTML Preview</span>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'preview' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-0.5 text-xs ${viewMode === 'code' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Code
            </button>
          </div>
        </div>
      </div>
      {viewMode === 'preview' ? (
        <iframe
          srcDoc={code}
          sandbox="allow-scripts"
          className="w-full bg-white border-0"
          style={{ minHeight: '200px', maxHeight: '500px' }}
          title="HTML Preview"
        />
      ) : (
        <div className="bg-white p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-gray-800">{code}</pre>
        </div>
      )}
    </div>
  );
}

export default React.memo(HtmlPreviewBlock);
