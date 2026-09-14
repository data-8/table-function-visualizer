import type { PyodideOutput } from '../lib/pyodide';

interface CellOutputProps {
  output: PyodideOutput;
  execCount?: number;
}

/**
 * A cell's output area, laid out like a notebook: printed text has no prompt,
 * the value of a trailing expression gets an Out[n] prompt, errors are boxed.
 */
export default function CellOutput({ output, execCount }: CellOutputProps) {
  const hasStream = output.stdout || output.stderr;
  const images = output.images ?? [];
  if (!hasStream && !output.result && !output.error && images.length === 0) return null;

  return (
    <div className="cell-output" aria-live="polite">
      {hasStream && (
        <div className="cell-row output-row">
          <div className="cell-prompt" aria-hidden="true" />
          <div className="output-body">
            {output.stdout && <pre className="output-stream">{output.stdout.replace(/\n$/, '')}</pre>}
            {output.stderr && <pre className="output-stream output-stderr">{output.stderr.replace(/\n$/, '')}</pre>}
          </div>
        </div>
      )}

      {images.map((image, i) => (
        <div className="cell-row output-row" key={i}>
          <div className="cell-prompt" aria-hidden="true" />
          <div className="output-body">
            <img className="output-image" src={`data:image/png;base64,${image.png}`} alt="Plot" style={{ width: image.width }} />
          </div>
        </div>
      ))}

      {output.result && (
        <div className="cell-row output-row">
          <div className="cell-prompt">
            <span className="prompt-label prompt-out">Out[{execCount ?? ' '}]:</span>
          </div>
          <div className="output-body">
            <pre className="output-result">{output.result}</pre>
          </div>
        </div>
      )}

      {output.error && (
        <div className="cell-row output-row">
          <div className="cell-prompt" aria-hidden="true" />
          <div className="output-body">
            <div className="output-error">
              <pre className="error-message">{output.error.replace(/\n$/, '')}</pre>
              <div className="error-help">
                <strong>Things to check</strong>
                <ul>
                  <li>Typos in column names or method calls</li>
                  <li>Cells above this one have been run, so the names they define exist</li>
                  <li>Start with <code>from datascience import *</code> so <code>Table</code>, <code>make_array</code> and <code>are</code> are available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
