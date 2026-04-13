/**
 * SpreadsheetBlock - Interactive spreadsheet viewer for xlsx/csv/tsv data
 *
 * Features:
 * - Parse xlsx binary or CSV/TSV text via SheetJS
 * - Multiple sheet tabs
 * - Cell selection with highlight
 * - Formula bar showing cell content
 * - Column/row headers
 * - Column auto-width
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import CopyButton from './CopyButton';

interface SpreadsheetBlockProps {
  code: string;
  /** If true, code is base64-encoded xlsx binary. If false, it's CSV/TSV text. */
  isBinary?: boolean;
  /** Pre-decoded ArrayBuffer (skips base64 round-trip) */
  arrayBuffer?: ArrayBuffer;
}

interface SheetData {
  name: string;
  rows: string[][];
  colCount: number;
}

function parseSpreadsheet(code: string, isBinary: boolean, arrayBuffer?: ArrayBuffer | ArrayBufferLike): SheetData[] {
  try {
    let wb: XLSX.WorkBook;

    if (arrayBuffer) {
      wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    } else if (isBinary) {
      const binary = atob(code);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      wb = XLSX.read(bytes, { type: 'array' });
    } else {
      // Try parsing as CSV
      wb = XLSX.read(code, { type: 'string' });
    }

    return wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
      return { name, rows, colCount };
    });
  } catch {
    // Fallback: treat as CSV
    const lines = code.trim().split('\n').filter((l) => l.trim());
    const rows = lines.map((line) => line.split(/[\t,]/).map((c) => c.trim()));
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return [{ name: 'Sheet1', rows, colCount }];
  }
}

/** Column letter from index (0 → A, 1 → B, ...) */
function colLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export default function SpreadsheetBlock({ code, isBinary = false, arrayBuffer }: SpreadsheetBlockProps): JSX.Element {
  const [urlData, setUrlData] = useState<ArrayBuffer | undefined>(undefined);
  const src = code.trim();
  const isUrl = src.startsWith('skillfile://') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://');

  useEffect(() => {
    if (isUrl && !arrayBuffer) {
      let cancelled = false;
      (async () => {
        try {
          const resp = await fetch(src);
          const buf = await resp.arrayBuffer();
          if (!cancelled) setUrlData(buf);
        } catch { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }
  }, [src, isUrl, arrayBuffer]);

  const effectiveBuffer = arrayBuffer ?? urlData;
  const sheets = useMemo(() => parseSpreadsheet(code, isBinary, effectiveBuffer), [code, isBinary, effectiveBuffer]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [filter, setFilter] = useState('');

  const sheet = sheets[activeSheet];
  const { rows, colCount } = sheet;

  // Filter rows
  const displayRows = useMemo(() => {
    if (!filter) return rows;
    const lower = filter.toLowerCase();
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(lower)));
  }, [rows, filter]);

  const cellValue = selectedCell
    ? rows[selectedCell.row]?.[selectedCell.col] ?? ''
    : '';

  const cellRef = selectedCell
    ? `${colLetter(selectedCell.col)}${selectedCell.row + 1}`
    : '';

  // Export as CSV
  const csvContent = useMemo(() => rows.map((r) => r.join(',')).join('\n'), [rows]);

  return (
    <div className="my-4 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="font-medium uppercase">Spreadsheet</span>
          <span className="text-gray-500">{rows.length} rows × {colCount} cols</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 text-white text-xs border border-gray-600 rounded px-2 py-1 w-32 focus:outline-none focus:border-blue-400"
          />
          <CopyButton code={csvContent} />
        </div>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex bg-gray-50 border-b border-gray-200 px-2">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { setActiveSheet(i); setSelectedCell(null); setFilter(''); }}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 ${
                i === activeSheet
                  ? 'border-blue-500 text-blue-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center border-b border-gray-200 bg-white px-3 py-1">
        <span className="text-xs font-mono text-gray-400 w-12 shrink-0">{cellRef || 'A1'}</span>
        <div className="w-px h-4 bg-gray-300 mx-2" />
        <span className="text-xs font-mono text-gray-700 flex-1 truncate">
          {cellValue || '—'}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 sticky top-0 z-10">
              <th className="w-10 px-1 py-1 text-gray-400 font-normal border-r border-b border-gray-200">#</th>
              {Array.from({ length: colCount }, (_, i) => (
                <th
                  key={i}
                  className="px-2 py-1 text-gray-500 font-medium border-r border-b border-gray-200 min-w-[80px] text-left"
                >
                  {colLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-blue-50/50">
                <td className="px-1 py-0.5 text-gray-400 text-center border-r border-b border-gray-100 bg-gray-50/50 select-none">
                  {ri + 1}
                </td>
                {Array.from({ length: colCount }, (_, ci) => {
                  const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                  return (
                    <td
                      key={ci}
                      onClick={() => setSelectedCell({ row: ri, col: ci })}
                      className={`px-2 py-0.5 border-r border-b border-gray-100 truncate max-w-[200px] cursor-cell ${
                        isSelected ? 'bg-blue-100 ring-1 ring-blue-400' : 'text-gray-700'
                      }`}
                      title={row[ci] || ''}
                    >
                      {row[ci] || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        <span>{displayRows.length} rows</span>
        <span>{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
