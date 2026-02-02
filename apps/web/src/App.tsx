import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './App.css';
import { Editor } from '@monaco-editor/react';
import TracePanel from './components/TracePanel';
import { StepCard } from './components/StepSlideshow';
import ExamplesGallery from './components/ExamplesGallery';
import { initPyodide, runPythonCode, type PyodideOutput } from './lib/pyodide';
import { type Example } from './lib/examples';
import type { editor as MonacoEditor } from 'monaco-editor';

const DEFAULT_CODE = `# Welcome to datascience Table Tutor!
# Click "Examples" to see pre-built visualizations

from datascience import Table

# Create a simple table
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana'],
    'Age', [20, 21, 20, 22],
    'Major', ['CS', 'Math', 'CS', 'Physics']
)

print("Original table:")
students.show()

# Try some operations
cs_students = students.where('Major', 'CS')
print("\\nCS students:")
cs_students.show()

# Select specific columns
names_ages = students.select('Name', 'Age')
print("\\nNames and ages:")
names_ages.show()
`;

type PyodideStatus = 'loading' | 'ready' | 'error';

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<PyodideOutput>({ stdout: '', stderr: '' });
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('Initializing Pyodide...');
  const [showGallery, setShowGallery] = useState(false);
  const [currentExample, setCurrentExample] = useState<string>('');
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleEditorWillMount = (monaco: typeof import('monaco-editor')) => {
    monaco.editor.defineTheme('data8-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9fb3ff' },
        { token: 'comment.doc', foreground: '9fb3ff' },
        { token: 'string', foreground: 'f6d98a' },
        { token: 'keyword', foreground: '82aaff' },
        { token: 'number', foreground: 'f6b178' }
      ],
      colors: {
        'editor.background': '#04070f',
        'editorGutter.background': '#04070f',
        'editor.lineHighlightBackground': '#0b1933',
        'editorLineNumber.foreground': '#a8b9ff',
        'editorLineNumber.activeForeground': '#d6e2ff',
        'editorCursor.foreground': '#f7f9fd',
        'editor.selectionBackground': '#213c63',
        'editorBracketMatch.background': '#1c2c4a',
        'editorBracketMatch.border': '#3f6fb3'
      }
    });
  };

  // Function to update permalink in URL (using query params for better sharing)
  const updatePermalink = useCallback(() => {
    try {
      const params = new URLSearchParams();
      params.set('code', encodeURIComponent(code));
      if (currentExample) {
        params.set('example', currentExample);
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      // Update URL without reloading
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      console.error('Failed to update permalink:', e);
    }
  }, [code, currentExample]);

  // Load code from URL query params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        const decodedCode = decodeURIComponent(codeParam);
        setCode(decodedCode);
        // Check if this is an example
        const exampleId = params.get('example');
        if (exampleId) {
          setCurrentExample(exampleId);
        }
      }
    } catch (e) {
      console.error('Failed to decode URL params:', e);
    }
  }, []);

  // Update URL when code changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePermalink();
    }, 500); // Debounce URL updates

    return () => clearTimeout(timeoutId);
  }, [updatePermalink]);

  // Initialize Pyodide on mount
  useEffect(() => {
    const init = async () => {
      try {
        setStatusMessage('Loading Pyodide...');
        await initPyodide();
        setStatusMessage('Installing datascience library...');
        // Give it a moment to finish installation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPyodideStatus('ready');
        setStatusMessage('Ready to run Python code!');
      } catch (error) {
        setPyodideStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Failed to load Pyodide');
        console.error('Pyodide initialization error:', error);
      }
    };

    init();
  }, []);

  const handleShare = async () => {
    try {
      updatePermalink();
      // Get the full URL with query params
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      // Show temporary feedback
      const originalText = statusMessage;
      setStatusMessage('Link copied to clipboard!');
      setTimeout(() => setStatusMessage(originalText), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
      setStatusMessage('Failed to copy link');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 2000);
    }
  };

  const handleExport = () => {
    if (!output.trace?.length) {
      setStatusMessage('Nothing to export');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 2000);
      return;
    }
    setStatusMessage('Generating PDF...');
    setIsExportingPdf(true);
    setTimeout(async () => {
      try {
        const container = exportContainerRef.current;
        if (!container) {
          setStatusMessage('Failed to export');
          return;
        }
        const cards = container.querySelectorAll('.step-card');
        if (cards.length === 0) {
          setStatusMessage('Failed to export');
          return;
        }
        let pdf: jsPDF | null = null;
        for (let i = 0; i < cards.length; i++) {
          const canvas = await html2canvas(cards[i] as HTMLElement, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');
          const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
          if (i === 0) {
            pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
          } else {
            pdf!.addPage(undefined, orientation);
          }
          const pageW = pdf!.internal.pageSize.getWidth();
          const pageH = pdf!.internal.pageSize.getHeight();
          const scale = Math.min(pageW / canvas.width, pageH / canvas.height) * 0.95;
          const w = canvas.width * scale;
          const h = canvas.height * scale;
          const x = (pageW - w) / 2;
          const y = (pageH - h) / 2;
          pdf!.addImage(imgData, 'PNG', x, y, w, h);
        }
        if (pdf) {
          pdf.save(`table-tutor-export-${Date.now()}.pdf`);
          setStatusMessage('Export downloaded!');
        }
      } catch (e) {
        console.error('Failed to export:', e);
        setStatusMessage('Failed to export');
      } finally {
        setIsExportingPdf(false);
        setTimeout(() => setStatusMessage('Ready to run Python code!'), 2000);
      }
    }, 200);
  };

  const handleRun = useCallback(async () => {
    if (pyodideStatus !== 'ready') {
      setStatusMessage('Pyodide not ready yet. Please wait...');
      return;
    }

    if (!code.trim()) {
      setStatusMessage('Please enter some code to run');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 2000);
      return;
    }

    setIsRunning(true);
    setOutput({ stdout: '', stderr: '' });
    setStatusMessage('Running code...');
    console.log('Running code:', code);

    try {
      const result = await runPythonCode(code);
      console.log('Execution result:', result);
      console.log('Trace captured:', result.trace);
      setOutput(result);
      
      // Show helpful status message
      if (result.trace && result.trace.length > 0) {
        setStatusMessage(`✓ Executed successfully (${result.trace.length} operation${result.trace.length !== 1 ? 's' : ''} traced)`);
      } else if (result.error) {
        setStatusMessage('✗ Execution error - see output below');
      } else {
        setStatusMessage('✓ Code executed (no Table operations detected)');
      }
      
      // Reset status after a delay
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setOutput({
        stdout: '',
        stderr: '',
        error: errorMessage,
      });
      setStatusMessage('✗ Execution failed - check output below');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } finally {
      setIsRunning(false);
    }
  }, [code, pyodideStatus]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRun();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleRun]);

  const handleSelectExample = (example: Example) => {
    console.log('Loading example:', example.title);
    console.log('Example code:', example.code);
    setCode(example.code);
    setCurrentExample(example.title);
    setOutput({ stdout: '', stderr: '' }); // Clear previous output
    // Update permalink immediately when example is selected
    setTimeout(() => updatePermalink(), 100);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <div className="brand-title">
              <code className="brand-code">datascience</code>
              <span className="brand-name">Table Tutor</span>
            </div>
          </div>
          {currentExample && (
            <span className="current-example">Currently exploring: {currentExample}</span>
          )}
        </div>
        <div className="header-controls">
          <span className={`status ${pyodideStatus}`}>
            {statusMessage}
          </span>
          {output.trace && output.trace.length > 0 && (
            <button
              className="export-button"
              onClick={handleExport}
              disabled={pyodideStatus === 'loading'}
              title="Export visualization as PDF"
            >
              Export
            </button>
          )}
          <button
            className="share-button"
            onClick={handleShare}
            disabled={pyodideStatus === 'loading'}
            title="Copy shareable link"
          >
            Share
          </button>
          <button
            className="examples-button"
            onClick={() => setShowGallery(true)}
            disabled={pyodideStatus === 'loading'}
          >
            Examples
          </button>
          <button
            className="run-button"
            onClick={handleRun}
            disabled={pyodideStatus !== 'ready' || isRunning}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </header>

      <div className="main-content jupyter-style">
        {/* Left: Code Notebook */}
        <div className="notebook-panel">
          <div className="notebook-header">
            <div className="notebook-info">
              <span className="notebook-name">Code Notebook</span>
            </div>
            <div className="notebook-hint">
              Press Run or Cmd+Enter to execute
            </div>
          </div>

          <div className="notebook-cells">
            <div className="notebook-cell-simple">
              <div className="cell-editor-simple">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={code}
                  beforeMount={handleEditorWillMount}
                  onChange={(value) => setCode(value || '')}
                  onMount={(editor) => {
                    editorRef.current = editor;
                    editor.focus();
                  }}
                  theme="data8-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly: isRunning,
                    tabSize: 4,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visualization */}
        <TracePanel output={output} slideshowRef={slideshowRef} />
      </div>

      {/* Hidden container for multi-step PDF export (off-screen, same layout as panel) */}
      {isExportingPdf && output.trace && output.trace.length > 0 && (
        <div
          ref={exportContainerRef}
          className="export-pdf-container"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: 640,
            zIndex: -1,
          }}
        >
          {output.trace.map((record, i) => (
            <StepCard
              key={i}
              record={record}
              stepIndex={i}
              totalSteps={output.trace!.length}
            />
          ))}
        </div>
      )}

      {/* Examples Gallery Modal */}
      {showGallery && (
        <ExamplesGallery
          onSelectExample={handleSelectExample}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}

export default App;

