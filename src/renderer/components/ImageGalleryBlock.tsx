/**
 * ImageGalleryBlock - Image gallery renderer
 *
 * Renders image references (URLs or paths) as a responsive grid gallery.
 */

import React, { useState } from 'react';

interface ImageGalleryBlockProps {
  code: string;
}

interface ImageItem {
  url: string;
  alt: string;
}

function parseImageList(code: string): ImageItem[] {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Markdown image: ![alt](url)
      const mdMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (mdMatch) return { url: mdMatch[2], alt: mdMatch[1] };
      // Plain URL
      return { url: line, alt: line.split('/').pop() || 'image' };
    });
}

function ImageGalleryBlock({ code }: ImageGalleryBlockProps): JSX.Element {
  const images = parseImageList(code);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <div className="text-sm text-gray-400 my-4">No images found.</div>;
  }

  return (
    <div className="my-4">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {images.length} image{images.length !== 1 ? 's' : ''}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative group rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedIndex(i)}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
          onClick={() => setSelectedIndex(null)}
        >
          <img
            src={images[selectedIndex].url}
            alt={images[selectedIndex].alt}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

export default React.memo(ImageGalleryBlock);
