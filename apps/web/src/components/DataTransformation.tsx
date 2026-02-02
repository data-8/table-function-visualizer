import { useState, useEffect } from 'react';
import type { TableState } from '../lib/pyodide';
import './DataTransformation.css';

interface DataTransformationProps {
  before: TableState;
  after?: TableState;
  operation: string;
  args?: unknown[];
  stepMessage?: string;
  highlightBeforeCols?: number[];
  highlightBeforeRows?: number[];
  highlightBeforeCells?: [number, number][];
  highlightAfterCols?: number[];
  highlightAfterRows?: number[];
  highlightAfterCells?: [number, number][];
  beforeOnly?: boolean;
  /** For join: the right-hand table (enables three-panel layout). */
  otherTable?: TableState;
  highlightOtherCols?: number[];
  highlightOtherRows?: number[];
}

function getUniqueValuesSorted(preview: unknown[][], colIndex: number): unknown[] {
  if (!preview.length || colIndex < 0) return [];
  const values = preview.map((row) => row[colIndex]);
  const uniq = Array.from(new Set(values));
  const first = uniq[0];
  if (typeof first === 'number') {
    return uniq.slice().sort((a, b) => (a as number) - (b as number));
  }
  return uniq.slice().sort((a, b) => String(a).localeCompare(String(b)));
}

function cellInSet(cells: [number, number][] | undefined, row: number, col: number): boolean {
  if (!cells?.length) return false;
  return cells.some(([r, c]) => r === row && c === col);
}

export default function DataTransformation({
  before,
  after,
  operation,
  args,
  stepMessage: _stepMessage,
  highlightBeforeCols = [],
  highlightBeforeRows = [],
  highlightBeforeCells = [],
  highlightAfterCols = [],
  highlightAfterRows = [],
  highlightAfterCells = [],
  beforeOnly = false,
  otherTable,
  highlightOtherCols = [],
  highlightOtherRows = [],
}: DataTransformationProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const hasAfter = after != null && !beforeOnly;
  const isJoinThreePanel = operation === 'join' && otherTable != null;

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const columnsRemoved = hasAfter ? before.columns.filter((col) => !after!.columns.includes(col)) : [];
  const columnsAdded = hasAfter ? after!.columns.filter((col) => !before.columns.includes(col)) : [];
  const rowsChanged = hasAfter && before.num_rows !== after!.num_rows;

  const isInitialization =
    hasAfter &&
    before.num_rows === 0 &&
    after!.num_rows > 0 &&
    (operation === 'with_columns' || operation === 'with_column');

  const useStepHighlights = highlightBeforeCols.length > 0 || highlightBeforeRows.length > 0 || highlightBeforeCells.length > 0;

  const beforeHighlightCols = useStepHighlights ? highlightBeforeCols : [];
  const beforeHighlightRows = highlightBeforeRows;
  const beforeHighlightCells = highlightBeforeCells;

  const groupCol = !useStepHighlights && operation === 'group' && typeof args?.[0] === 'string' ? args[0] : undefined;
  const groupColIndex = groupCol != null && before.columns.includes(groupCol) ? before.columns.indexOf(groupCol) : -1;
  const uniqueValuesGroup = groupColIndex >= 0 ? getUniqueValuesSorted(before.preview, groupColIndex) : [];
  const uniqueValuesText =
    !useStepHighlights &&
    uniqueValuesGroup.length > 0
      ? `Unique values (sorted): [${uniqueValuesGroup.map((v) => (typeof v === 'string' ? `"${v}"` : v)).join(', ')}]`
      : null;

  const joinCol = !useStepHighlights && operation === 'join' && typeof args?.[0] === 'string' ? args[0] : undefined;
  const joinColIndexBefore = joinCol != null && before.columns.includes(joinCol) ? before.columns.indexOf(joinCol) : -1;
  const joinColInAfter = hasAfter && joinCol != null && after!.columns.includes(joinCol);

  return (
    <div className={`data-transformation ${showAnimation ? 'animated' : ''} ${isJoinThreePanel ? 'join-three-panel' : ''}`}>
      {/* Before (Left) State */}
      <div className="transform-section before">
        <div className="section-header">
          <span className="section-title">{isJoinThreePanel ? 'Left table' : 'Before'}</span>
          <span className="section-info">
            {isInitialization ? 'Empty Table' : `${before.num_rows} rows × ${before.num_columns} cols`}
          </span>
        </div>
        
        <div className="data-table-wrapper">
          {isInitialization ? (
            <div className="empty-table-placeholder">
              <div className="empty-icon">📄</div>
              <div className="empty-text">Empty Table</div>
              <div className="empty-subtext">No columns, no rows yet</div>
            </div>
          ) : (
            <>
              <table className="data-table compact">
                <thead>
                  <tr>
                    {before.columns.map((col, i) => {
                      const isHighlightCol = useStepHighlights
                        ? beforeHighlightCols.includes(i)
                        : (operation === 'group' && i === groupColIndex) || (operation === 'join' && i === joinColIndexBefore);
                      return (
                        <th
                          key={i}
                          className={[
                            columnsRemoved.includes(col) ? 'removed-column' : '',
                            isHighlightCol ? 'highlight-col' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {col}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {before.preview.slice(0, 5).map((row, i) => {
                    const isHighlightRow = beforeHighlightRows.includes(i);
                    return (
                      <tr key={i} className={isHighlightRow ? 'highlight-row' : ''}>
                        {row.map((cell, j) => {
                          const isHighlightCol = useStepHighlights
                            ? beforeHighlightCols.includes(j)
                            : (operation === 'group' && j === groupColIndex) || (operation === 'join' && j === joinColIndexBefore);
                          const isHighlightCell = cellInSet(beforeHighlightCells, i, j);
                          return (
                            <td
                              key={j}
                              className={[
                                columnsRemoved.includes(before.columns[j]) ? 'removed-cell' : '',
                                isHighlightCol ? 'highlight-col' : '',
                                isHighlightCell ? 'highlight-cell' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {formatValue(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {uniqueValuesText && (
                <div className="unique-values-callout">{uniqueValuesText}</div>
              )}
              {before.num_rows > 5 && (
                <div className="table-more">... {before.num_rows - 5} more rows</div>
              )}
            </>
          )}
        </div>
      </div>

      {isJoinThreePanel && otherTable && (
        <div className="transform-section other-table">
          <div className="section-header">
            <span className="section-title">Right table</span>
            <span className="section-info">
              {otherTable.num_rows} rows × {otherTable.num_columns} cols
            </span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table compact">
              <thead>
                <tr>
                  {otherTable.columns.map((col, i) => (
                    <th
                      key={i}
                      className={highlightOtherCols.includes(i) ? 'highlight-col' : ''}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherTable.preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className={highlightOtherRows.includes(i) ? 'highlight-row' : ''}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={highlightOtherCols.includes(j) ? 'highlight-col' : ''}
                      >
                        {formatValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {otherTable.num_rows > 5 && (
              <div className="table-more">... {otherTable.num_rows - 5} more rows</div>
            )}
          </div>
        </div>
      )}

      {hasAfter && (
        <>
          <div className="transform-arrow-container">
            <div className="transform-arrow-label">{operation}()</div>
            <div className="transform-arrow">→</div>
            <div className="transform-changes">
              {columnsRemoved.length > 0 && (
                <div className="change-badge removed">-{columnsRemoved.length} cols</div>
              )}
              {columnsAdded.length > 0 && (
                <div className="change-badge added">+{columnsAdded.length} cols</div>
              )}
              {rowsChanged && (
                <div className="change-badge">
                  {after!.num_rows > before.num_rows ? '+' : ''}
                  {after!.num_rows - before.num_rows} rows
                </div>
              )}
            </div>
          </div>

          <div className={`transform-section after${isInitialization ? ' initialization-result' : ''}`}>
            <div className="section-header">
              <span className="section-title">{isJoinThreePanel ? 'Result' : 'After'}</span>
              <span className="section-info">{after!.num_rows} rows × {after!.num_columns} cols</span>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table compact">
                <thead>
                  <tr>
                    {after!.columns.map((col, i) => {
                      const isHighlightCol =
                        useStepHighlights
                          ? highlightAfterCols.includes(i)
                          : (operation === 'group' && i === 0) || (operation === 'join' && joinColInAfter && col === joinCol);
                      return (
                        <th
                          key={i}
                          className={[
                            columnsAdded.includes(col) ? 'added-column' : '',
                            isHighlightCol ? 'highlight-col' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {col}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {after!.preview.slice(0, 5).map((row, i) => {
                    const isHighlightRow = highlightAfterRows.includes(i);
                    return (
                      <tr key={i} className={isHighlightRow ? 'highlight-row' : ''}>
                        {row.map((cell, j) => {
                          const isHighlightCol =
                            useStepHighlights
                              ? highlightAfterCols.includes(j)
                              : (operation === 'group' && j === 0) || (operation === 'join' && joinColInAfter && after!.columns[j] === joinCol);
                          const isHighlightCell = cellInSet(highlightAfterCells, i, j);
                          return (
                            <td
                              key={j}
                              className={[
                                columnsAdded.includes(after!.columns[j]) ? 'added-cell' : '',
                                isHighlightCol ? 'highlight-col' : '',
                                isHighlightCell ? 'highlight-cell' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {formatValue(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {after!.num_rows > 5 && (
                <div className="table-more">... {after!.num_rows - 5} more rows</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return String(value);
}

