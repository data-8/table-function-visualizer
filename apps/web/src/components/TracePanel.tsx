import type { PyodideOutput } from '../lib/pyodide';
import StepSlideshow from './StepSlideshow';

interface TracePanelProps {
  output: PyodideOutput;
}

export default function TracePanel({ output }: TracePanelProps) {
  const hasTrace = output.trace && output.trace.length > 0;
  const hasOutput = output.stdout || output.stderr || output.error;

  return (
    <div className="trace-panel">
      <div className="panel-tabs">
        <div className="tab active">Visualization</div>
      </div>

      <div className="panel-content">
        {/* Trace View FIRST */}
        <div className="trace-view">
          {hasTrace ? (
            <StepSlideshow trace={output.trace!} />
          ) : hasOutput ? (
            <div className="empty-state">
              <h3>Code Executed</h3>
              <div className="trace-note">
                <strong>Tracing Not Working</strong>
                The tracer didn't capture any operations. Check the console output below for details.
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Welcome to Table Tutor!</h3>
              <p>Click "Examples" button above to see pre-built visualizations, or write your own Table operations.</p>
              <div className="example-hint">
                <strong>Quick Example:</strong>
                <pre>{`from datascience import Table

# Create a table
table = Table().with_columns(
    'name', ['Alice', 'Bob', 'Charlie'],
    'age', [25, 30, 35]
)

# Try some operations
result = table.select('name')`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Console Output - Show BELOW steps */}
        {hasOutput && (
          <div className="output-section-bottom">
            <h4>Console Output</h4>
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
                    <div key={i} className="output-line" style={{ color: '#fcd34d' }}>{line || ' '}</div>
                  ))}
                </div>
              )}
              
              {output.error && (
                <div className="output-error">
                  <strong>Error:</strong>
                  <div className="error-message">{output.error}</div>
                  <div className="error-help">
                    <strong>Common Issues:</strong>
                    <ul>
                      <li>Check for typos in column names or method calls</li>
                      <li>Ensure you're importing Table: <code>from datascience import Table</code></li>
                      <li>Verify column names match those in your table</li>
                      <li>Check the console output above for more details</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

