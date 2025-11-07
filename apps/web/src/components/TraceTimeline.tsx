import type { TraceRecord } from '../lib/pyodide';
import TraceStep from './TraceStep';

interface TraceTimelineProps {
  trace: TraceRecord[];
}

export default function TraceTimeline({ trace }: TraceTimelineProps) {
  if (!trace || trace.length === 0) {
    return (
      <div className="trace-timeline empty">
        <div className="empty-state">
          <h3>No operations traced</h3>
          <p>Run code that uses <code>datascience.Table</code> operations to see a step-by-step trace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trace-timeline">
      <div className="timeline-header">
        <h3>Operation Timeline</h3>
        <div className="timeline-count">{trace.length} operations</div>
      </div>
      
      <div className="timeline-steps">
        {trace.map((record, index) => (
          <TraceStep 
            key={record.step_id} 
            record={record} 
            isFirst={index === 0}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

