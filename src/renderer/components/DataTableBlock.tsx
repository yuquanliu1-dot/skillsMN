/**
 * DataTableBlock - Sortable data table for CSV/TSV data
 *
 * Parses delimited data and renders as a sortable, filterable table.
 */

import React, { useState, useMemo } from 'react';

interface DataTableBlockProps {
  code: string;
  delimiter?: ',' | '\t' | '|';
}

function DataTableBlock({ code, delimiter = ',' }: DataTableBlockProps): JSX.Element {
  const [sortCol, setSortCol] = useState<number>(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');

  const { headers, rows } = useMemo(() => {
    const lines = code.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };

    const parseLine = (line: string) => {
      if (delimiter === '|') {
        return line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      }
      return line.split(delimiter).map(c => c.trim());
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  }, [code, delimiter]);

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    const lower = filter.toLowerCase();
    return rows.filter(row => row.some(cell => cell.toLowerCase().includes(lower)));
  }, [rows, filter]);

  const sortedRows = useMemo(() => {
    if (sortCol < 0) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortAsc ? na - nb : nb - na;
      }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filteredRows, sortCol, sortAsc]);

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="my-4 rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-gray-500 font-medium">Data Table</span>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 border-b"
                >
                  <span className="flex items-center gap-1">
                    {h}
                    {sortCol === i && (
                      <span className="text-blue-500">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 border-b border-gray-100">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50">
        {sortedRows.length} row{sortedRows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default React.memo(DataTableBlock);
