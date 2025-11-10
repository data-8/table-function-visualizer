import { useState, useEffect } from 'react';
import type { TableState } from '../lib/pyodide';
import './DataTransformation.css';

interface DataTransformationProps {
  before: TableState;
  after: TableState;
  operation: string;
}

export default function DataTransformation({ before, after, operation }: DataTransformationProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setShowAnimation(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Determine what changed
  const columnsRemoved = before.columns.filter(col => !after.columns.includes(col));
  const columnsAdded = after.columns.filter(col => !before.columns.includes(col));
  const rowsChanged = before.num_rows !== after.num_rows;
  
  // Check if this is table initialization (empty table → table with data)
  const isInitialization = before.num_rows === 0 && after.num_rows > 0 && 
                           (operation === 'with_columns' || operation === 'with_column');

  return (
    <div className={`data-transformation ${showAnimation ? 'animated' : ''}`}>
      {/* Before State */}
      <div className="transform-section before">
        <div className="section-header">
          <span className="section-title">Before</span>
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
                    {before.columns.map((col, i) => (
                      <th 
                        key={i}
                        className={columnsRemoved.includes(col) ? 'removed-column' : ''}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {before.preview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td 
                          key={j}
                          className={columnsRemoved.includes(before.columns[j]) ? 'removed-cell' : ''}
                        >
                          {formatValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {before.num_rows > 5 && (
                <div className="table-more">... {before.num_rows - 5} more rows</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transformation Arrow */}
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
              {after.num_rows > before.num_rows ? '+' : ''}
              {after.num_rows - before.num_rows} rows
            </div>
          )}
        </div>
      </div>

      {/* After State */}
      <div className="transform-section after">
        <div className="section-header">
          <span className="section-title">After</span>
          <span className="section-info">{after.num_rows} rows × {after.num_columns} cols</span>
        </div>
        
        <div className="data-table-wrapper">
          <table className="data-table compact">
            <thead>
              <tr>
                {after.columns.map((col, i) => (
                  <th 
                    key={i}
                    className={columnsAdded.includes(col) ? 'added-column' : ''}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {after.preview.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td 
                      key={j}
                      className={columnsAdded.includes(after.columns[j]) ? 'added-cell' : ''}
                    >
                      {formatValue(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {after.num_rows > 5 && (
            <div className="table-more">... {after.num_rows - 5} more rows</div>
          )}
        </div>
      </div>
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

