/**
 * useColumnCount Hook
 *
 * Detects the current grid column count based on container width
 * Matching Tailwind breakpoints: 1/2/3/4 columns
 */

import { useState, useEffect, useCallback } from 'react';

const BREAKPOINTS = [
  { minWidth: 1280, columns: 4 },
  { minWidth: 1024, columns: 3 },
  { minWidth: 768, columns: 2 },
  { minWidth: 0, columns: 1 },
];

function getColumns(width: number): number {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.columns;
  }
  return 1;
}

export function useColumnCount(containerRef: React.RefObject<HTMLElement | null>): number {
  const [columns, setColumns] = useState(4);

  const updateColumns = useCallback(() => {
    if (containerRef.current) {
      setColumns(getColumns(containerRef.current.offsetWidth));
    }
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateColumns();

    const observer = new ResizeObserver(() => updateColumns());
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, updateColumns]);

  return columns;
}
