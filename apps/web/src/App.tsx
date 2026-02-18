import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './App.css';
import TracePanel from './components/TracePanel';
import NotebookCells from './components/NotebookCells';
import { StepCard } from './components/StepSlideshow';
import ExamplesGallery from './components/ExamplesGallery';
import { initPyodide, runPythonCode, stopExecutionHard, type PyodideOutput } from './lib/pyodide';
import { type Example } from './lib/examples';
import type { editor as MonacoEditor } from 'monaco-editor';

const DEFAULT_MARKDOWN = `## How to use this notebook

- **Markdown cell (this cell):** Double-tap or double-click to edit. Use **Shift+Enter** or the **Render** button to see the rendered version and (with Shift+Enter) move to the code cell.
- **Code cell:** Write Python using \`datascience.Table\`. Press **Run** or **Cmd+Enter** to execute. The right panel shows step-by-step table operations.
- **Visualization:** After running, use the arrows to step through operations and **Export** to save as PDF or **Share** to copy a link.`;

const DEFAULT_CODE = `from datascience import Table

# See the markdown cell above for instructions.
# Example: create a table and run an operation to see the visualization.
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie'],
    'Age', [20, 21, 22]
)
students.select('Name', 'Age')
`;

type PyodideStatus = 'loading' | 'ready' | 'error';

function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
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
  const runTokenRef = useRef(0);
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
      if (markdown.trim() && markdown !== DEFAULT_MARKDOWN) {
        params.set('md', encodeURIComponent(markdown));
      }
      if (currentExample) {
        params.set('example', currentExample);
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      console.error('Failed to update permalink:', e);
    }
  }, [code, markdown, currentExample]);

  // Load code (and optional markdown) from URL query params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        const decodedCode = decodeURIComponent(codeParam);
        setCode(decodedCode);
      }
      const mdParam = params.get('md');
      if (mdParam) {
        try {
          setMarkdown(decodeURIComponent(mdParam));
        } catch {
          /* ignore */
        }
      }
      const exampleId = params.get('example');
      if (exampleId) {
        setCurrentExample(exampleId);
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

    const token = ++runTokenRef.current;
    setIsRunning(true);
    setStatusMessage('Running code...');

    try {
      const result = await runPythonCode(code);
      if (token !== runTokenRef.current) return;
      setOutput(result);
      if (result.trace && result.trace.length > 0) {
        setStatusMessage(`✓ Executed successfully (${result.trace.length} operation${result.trace.length !== 1 ? 's' : ''} traced)`);
      } else if (result.error) {
        setStatusMessage('✗ Execution error - see output below');
      } else {
        setStatusMessage('✓ Code executed (no Table operations detected)');
      }
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } catch (error) {
      if (token !== runTokenRef.current) return;
      const errorMessage = error instanceof Error ? error.message : String(error);
      setOutput({ stdout: '', stderr: '', error: errorMessage });
      setStatusMessage('✗ Execution failed - check output below');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } finally {
      if (token === runTokenRef.current) setIsRunning(false);
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

  const handleStop = useCallback(() => {
    if (!isRunning) return;
    runTokenRef.current = 0;
    setStatusMessage('Stopping...');
    stopExecutionHard();
    setIsRunning(false);
    setOutput({ stdout: '', stderr: '' });
    setStatusMessage('Stopped. Reinitializing...');
    (async () => {
      try {
        await initPyodide();
        setPyodideStatus('ready');
        setStatusMessage('Ready to run Python code!');
      } catch (e) {
        setPyodideStatus('error');
        setStatusMessage('Failed to reinitialize after stop');
      }
    })();
  }, [isRunning]);

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
            title="Run code cell"
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            className="stop-button"
            onClick={handleStop}
            disabled={!isRunning}
            title="Stop execution"
          >
            Stop
          </button>
        </div>
      </header>

      <div className="main-content jupyter-style">
        {/* Left: Notebook (markdown + code cells) */}
        <div className="notebook-panel">
          <div className="notebook-header">
            <div className="notebook-info">
              <span className="notebook-name">Notebook</span>
            </div>
            <div className="notebook-hint">
              Cmd+Enter to run code cell
            </div>
          </div>

          <div className="notebook-cells-wrapper">
            <NotebookCells
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              code={code}
              onCodeChange={setCode}
              isRunning={isRunning}
              pyodideReady={pyodideStatus === 'ready'}
              onRun={handleRun}
              onStop={handleStop}
              onEditorMount={(editor) => {
                editorRef.current = editor;
              }}
              onEditorWillMount={handleEditorWillMount}
              readOnlyCode={isRunning}
              onFocusCodeCell={() => editorRef.current?.focus()}
            />
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

