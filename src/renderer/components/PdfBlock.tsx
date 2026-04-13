/**
 * PdfBlock - Inline PDF renderer
 *
 * Renders PDF files inline using pdfjs-dist.
 * The code fence contains a file path or URL to the PDF.
 * Features: page navigation, zoom, page counter.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfBlockProps {
  /** URL or file path to the PDF */
  code: string;
}

export default function PdfBlock({ code }: PdfBlockProps): JSX.Element {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const src = code.trim();

  const loadPdf = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadingTask = pdfjsLib.getDocument(src);
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, [src]);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderParams = { canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport };
      await page.render(renderParams as any).promise;
    } catch (err) {
      console.error('Failed to render page:', err);
    }
  }, [scale]);

  // Load PDF on mount
  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // Render page when page number or scale changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          PDF load error
        </div>
        <p className="text-xs text-red-400">{error}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{src}</p>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-medium uppercase">PDF</span>
          {numPages > 0 && (
            <span className="text-gray-500">{numPages} pages</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Page navigation */}
          {numPages > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="text-gray-400">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600"
            >
              −
            </button>
            <span className="text-gray-400 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
              className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="bg-gray-100 flex items-center justify-center overflow-auto max-h-[600px] p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading PDF...</span>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-lg bg-white" />
        )}
      </div>
    </div>
  );
}
