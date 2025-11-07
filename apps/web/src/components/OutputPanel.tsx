interface OutputPanelProps {
  stdout: string;
  stderr: string;
  error?: string;
}

export default function OutputPanel({ stdout, stderr, error }: OutputPanelProps) {
  const hasOutput = stdout || stderr || error;

  return (
    <div className="output-panel">
      <div className="output-header">Output</div>
      <div className="output-content">
        {!hasOutput && (
          <div className="output-empty">Run your code to see output here...</div>
        )}
        
        {stdout && (
          <div className="output-stdout">
            {stdout.split('\n').map((line, i) => (
              <div key={i} className="output-line">{line}</div>
            ))}
          </div>
        )}
        
        {stderr && (
          <div className="output-stderr">
            {stderr.split('\n').map((line, i) => (
              <div key={i} className="output-line" style={{ color: '#fbbf24' }}>{line}</div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="output-error">
            <strong>Error:</strong>
            <div>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

