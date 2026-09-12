import type { PyodideOutput } from '../lib/pyodide';

interface CellOutputProps {
  output: PyodideOutput;
}

/** Console output rendered beneath the code cell, like a notebook's Out[] area */
export default function CellOutput({ output }: CellOutputProps) {
  const hasOutput = output.stdout || output.stderr || output.error;
  if (!hasOutput) return null;

  return (
    <div className="notebook-cell notebook-cell-output" aria-live="polite">
      <div className="cell-label">Output</div>
      <div className="output-content">
        {output.stdout && (
          <div className="output-stdout">
            {output.stdout.split('\n').map((line, i) => (
              <div key={i} className="output-line">{line || ' '}</div>
            ))}
          </div>
        )}

        {output.stderr && (
          <div className="output-stderr">
            {output.stderr.split('\n').map((line, i) => (
              <div key={i} className="output-line">{line || ' '}</div>
            ))}
          </div>
        )}

        {output.error && (
          <div className="output-error">
            <strong>Error</strong>
            <div className="error-message">{output.error}</div>
            <div className="error-help">
              <strong>Things to check</strong>
              <ul>
                <li>Typos in column names or method calls</li>
                <li>Start with <code>from datascience import *</code> so <code>Table</code>, <code>make_array</code> and <code>are</code> are available</li>
                <li>Column names match the ones in your table</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
