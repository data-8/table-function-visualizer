import type { RefObject } from 'react';
import type { PyodideOutput } from '../lib/pyodide';
import StepSlideshow from './StepSlideshow';

interface TracePanelProps {
  output: PyodideOutput;
  slideshowRef?: RefObject<HTMLDivElement>;
}

export default function TracePanel({ output, slideshowRef }: TracePanelProps) {
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
            <StepSlideshow ref={slideshowRef} trace={output.trace!} />
          ) : hasOutput ? (
            <div className="empty-state">
              <h3>No table operations to show.</h3>
              <div className="trace-note">
                <strong>The code ran, but nothing was traced</strong>
                Only <code>datascience.Table</code> methods are visualized. Any printed output or errors appear under the code cell.
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>See what each Table operation does, one step at a time.</h3>
              <p>Run the code cell and this panel walks through every operation, showing the table before and after. Pick something from Examples to start, or write your own.</p>
              <div className="example-hint">
                <strong>Try this</strong>
                <pre>{`from datascience import *

# Create a table
table = Table().with_columns(
    'name', make_array('Alice', 'Bob', 'Charlie'),
    'age', make_array(25, 30, 35)
)

# Try some operations
result = table.select('name')`}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

