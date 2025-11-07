import type { TableState } from '../lib/pyodide';

interface TablePreviewProps {
  state: TableState;
  title?: string;
}

export default function TablePreview({ state, title }: TablePreviewProps) {
  if (state.error) {
    return (
      <div className="table-preview error">
        <div className="preview-title">{title || 'Table'}</div>
        <div className="error-message">Error: {state.error}</div>
      </div>
    );
  }

  if (state.num_rows === 0) {
    return (
      <div className="table-preview empty">
        <div className="preview-title">{title || 'Table'}</div>
        <div className="empty-message">Empty table (0 rows)</div>
      </div>
    );
  }

  return (
    <div className="table-preview">
      {title && <div className="preview-title">{title}</div>}
      <div className="table-info">
        {state.num_rows} rows × {state.num_columns} columns
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {state.columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.preview.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{formatCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.preview.length < state.num_rows && (
        <div className="table-truncated">
          ... and {state.num_rows - state.preview.length} more rows
        </div>
      )}
    </div>
  );
}

function formatCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    // Format numbers with reasonable precision
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return String(value);
}

