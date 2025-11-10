import { useState, useEffect } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import DataTransformation from './DataTransformation';

interface TraceStepProps {
  record: TraceRecord;
  index: number;
}

// Determine if we should show arguments for this operation
function shouldShowArgs(operation: string): boolean {
  // Hide arguments for operations where they're too verbose or obvious from visualization
  const hideArgsFor = ['with_columns', 'with_column'];
  return !hideArgsFor.includes(operation);
}

// Format arguments in a readable way
function formatArgs(operation: string, args: unknown[]): string {
  // For operations like select, drop - just show column names
  if (['select', 'drop'].includes(operation)) {
    return args.filter(a => typeof a === 'string').join(', ');
  }
  
  // For where - show just the column and value (not data arrays)
  if (operation === 'where' && args.length >= 2) {
    return `column: "${args[0]}", value: ${JSON.stringify(args[1])}`;
  }
  
  // For sort
  if (operation === 'sort' && args.length >= 1) {
    return `column: "${args[0]}"`;
  }
  
  // For group, join
  if (['group', 'join'].includes(operation) && args.length >= 1) {
    return `column: "${args[0]}"`;
  }
  
  // For pivot - show pivot column and values column
  if (operation === 'pivot' && args.length >= 3) {
    return `pivot: "${args[0]}", rows: "${args[1]}", values: "${args[2]}"`;
  }
  
  // For take - show number
  if (operation === 'take' && args.length >= 1) {
    return `rows: ${args[0]}`;
  }
  
  // Default: show simple args only (strings, numbers)
  const simpleArgs = args.filter(a => 
    typeof a === 'string' || 
    typeof a === 'number' || 
    typeof a === 'boolean'
  );
  
  if (simpleArgs.length > 0) {
    return simpleArgs.map(a => JSON.stringify(a)).join(', ');
  }
  
  return 'See table data below';
}

export default function TraceStep({ record, index }: TraceStepProps) {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Staggered animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 150); // Delay each step by 150ms

    return () => clearTimeout(timer);
  }, [index]);

  const hasValidData = record.input && record.output && 
                       record.input.num_rows > 0 && record.output.num_rows >= 0;
  const detailsId = `trace-step-${record.step_id}-details`;

  return (
    <div className={`trace-step ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <button
        type="button"
        className="step-header"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        <div className="step-number">
          <span className="step-badge">Step {record.step_id}</span>
        </div>
        <div className="step-operation">
          <code>{record.operation}()</code>
        </div>
        <div className="step-toggle">{expanded ? '▼' : '▶'}</div>
      </button>
      
      <div className="step-explanation">
        <span className="explanation-icon">💡</span>
        {record.explanation}
      </div>
      
      {expanded && hasValidData && (
        <div className="step-details" id={detailsId}>
          {record.args && record.args.length > 0 && shouldShowArgs(record.operation) && (
            <div className="step-args">
              <strong>Arguments:</strong> <code>{formatArgs(record.operation, record.args)}</code>
            </div>
          )}
          
          <DataTransformation
            before={record.input}
            after={record.output}
            operation={record.operation}
          />
        </div>
      )}
    </div>
  );
}

