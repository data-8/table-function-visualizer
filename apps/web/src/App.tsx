import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './App.css';
import TracePanel from './components/TracePanel';
import NotebookCells from './components/NotebookCells';
import { StepCard } from './components/StepSlideshow';
import ExamplesGallery from './components/ExamplesGallery';
import { initPyodide, runPythonCode, stopExecutionHard, type PyodideOutput } from './lib/pyodide';
import { flattenTrace } from './lib/frames';
import { type Example } from './lib/examples';
import type { editor as MonacoEditor } from 'monaco-editor';

const DEFAULT_MARKDOWN = `## How to use this notebook

- **Markdown cell (this cell):** Double-tap or double-click to edit. Use **Shift+Enter** or the **Render** button to see the rendered version and (with Shift+Enter) move to the code cell.
- **Code cell:** Write Python using \`Table\` and \`make_array\` from the \`datascience\` library. Press **Run** or **Ctrl+Enter** (**Cmd+Enter** on Mac) to execute. The right panel shows step-by-step table operations.
- **Visualization:** After running, use the arrows to step through operations and **Export** to save as PDF or **Share** to copy a link.`;

const DEFAULT_CODE = `from datascience import *
# See markdown above for instructions
students = Table().with_columns('Name', make_array('Alice', 'Bob'))
`;

const THEME_STORAGE_KEY = 'theme';

type PyodideStatus = 'loading' | 'ready' | 'error';
type AppTheme = 'berkeley' | 'jupyter';

const THEMES: AppTheme[] = ['berkeley', 'jupyter'];
const THEME_LABELS: Record<AppTheme, string> = { berkeley: 'Berkeley', jupyter: 'Jupyter' };

function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'berkeley' ? 'berkeley' : 'jupyter';
  } catch {
    return 'jupyter';
  }
}

/** Which panel is shown on narrow (phone) screens; ignored on desktop where both are visible */
type MobileView = 'notebook' | 'visualization';

const NOTEBOOK_WIDTH_STORAGE_KEY = 'notebookWidthPercent';
const NOTEBOOK_STORAGE_KEY = 'notebook';

function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<PyodideOutput>({ stdout: '', stderr: '' });
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('Initializing Pyodide...');
  const [showGallery, setShowGallery] = useState(false);
  const [currentExample, setCurrentExample] = useState<string>('');
  const [mobileView, setMobileView] = useState<MobileView>('notebook');
  const [theme, setTheme] = useState<AppTheme>(readStoredTheme);
  const [notebookWidthPercent, setNotebookWidthPercent] = useState(() => {
    if (typeof localStorage === 'undefined') return 45;
    const stored = localStorage.getItem(NOTEBOOK_WIDTH_STORAGE_KEY);
    if (stored == null) return 45;
    const n = Number(stored);
    return Number.isFinite(n) && n >= 20 && n <= 80 ? n : 45;
  });
  const mainContentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const runTokenRef = useRef(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sync theme to DOM and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (e: MouseEvent) => {
      const el = mainContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
      setNotebookWidthPercent(next);
      try {
        localStorage.setItem(NOTEBOOK_WIDTH_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const handleResizerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' ? -2 : 2;
    setNotebookWidthPercent(prev => {
      const next = Math.max(20, Math.min(80, prev + delta));
      try {
        localStorage.setItem(NOTEBOOK_WIDTH_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const switchMobileView = useCallback((view: MobileView) => {
    setMobileView(view);
    window.scrollTo({ top: 0 });
  }, []);

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
    monaco.editor.defineTheme('data8-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '87867f', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: '87867f', fontStyle: 'italic' },
        { token: 'string', foreground: '3f7a67' },
        { token: 'keyword', foreground: 'c2561a' },
        { token: 'number', foreground: '4a7fb0' },
        { token: 'type', foreground: '141413' },
        { token: 'identifier', foreground: '141413' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editorGutter.background': '#ffffff',
        'editor.foreground': '#141413',
        'editor.lineHighlightBackground': '#f5f4ed',
        'editor.lineHighlightBorder': '#f5f4ed',
        'editorLineNumber.foreground': '#b0aea5',
        'editorLineNumber.activeForeground': '#141413',
        'editorCursor.foreground': '#141413',
        'editor.selectionBackground': '#fbd9c2',
        'editor.inactiveSelectionBackground': '#f0eee6',
        'editorBracketMatch.background': '#f0eee6',
        'editorBracketMatch.border': '#d1cfc5',
        'editorIndentGuide.background': '#e8e6dc',
        'editorWidget.background': '#faf9f5',
        'editorWidget.border': '#d1cfc5'
      }
    });
  };

  // Share links carry the code, markdown and example as query params. The address bar
  // itself stays clean; the link is only built when the user clicks Share.
  const buildShareUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('code', encodeURIComponent(code));
    if (markdown.trim() && markdown !== DEFAULT_MARKDOWN) {
      params.set('md', encodeURIComponent(markdown));
    }
    if (currentExample) {
      params.set('example', currentExample);
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [code, markdown, currentExample]);

  // On mount: a shared link wins; otherwise restore the last session from localStorage.
  // Query params are consumed and removed so the URL stays clean while editing.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) {
        setCode(decodeURIComponent(codeParam));
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
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      const saved = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { code?: string; markdown?: string; example?: string };
        if (typeof parsed.code === 'string') setCode(parsed.code);
        if (typeof parsed.markdown === 'string') setMarkdown(parsed.markdown);
        if (typeof parsed.example === 'string') setCurrentExample(parsed.example);
      }
    } catch (e) {
      console.error('Failed to restore notebook:', e);
    }
  }, []);

  // Keep the current notebook in localStorage (debounced) so a reload doesn't lose work
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(
          NOTEBOOK_STORAGE_KEY,
          JSON.stringify({ code, markdown, example: currentExample })
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [code, markdown, currentExample]);

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
      await navigator.clipboard.writeText(buildShareUrl());
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
      if (result.error) {
        switchMobileView('notebook');
        setStatusMessage('Execution error, see output under the code cell');
      } else if (result.trace && result.trace.length > 0) {
        switchMobileView('visualization');
        setStatusMessage(`Executed successfully (${result.trace.length} operation${result.trace.length !== 1 ? 's' : ''} traced)`);
      } else {
        setStatusMessage('Code executed (no Table operations detected)');
      }
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } catch (error) {
      if (token !== runTokenRef.current) return;
      const errorMessage = error instanceof Error ? error.message : String(error);
      setOutput({ stdout: '', stderr: '', error: errorMessage });
      switchMobileView('notebook');
      setStatusMessage('Execution failed, see output under the code cell');
      setTimeout(() => setStatusMessage('Ready to run Python code!'), 3000);
    } finally {
      if (token === runTokenRef.current) setIsRunning(false);
    }
  }, [code, pyodideStatus, switchMobileView]);

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
    switchMobileView('notebook');
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
            <span className="current-example" title={currentExample}>{currentExample}</span>
          )}
        </div>
        <div className="header-controls">
          <div className="theme-switcher" role="group" aria-label="Theme">
            {THEMES.map(t => (
              <button
                key={t}
                type="button"
                className={`theme-option ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                title={`${THEME_LABELS[t]} theme`}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
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

      {/* Phone-only: toggle between the two panels (hidden on desktop via CSS) */}
      <div className="mobile-view-switcher" role="tablist" aria-label="Panel">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'notebook'}
          className={`mobile-view-tab ${mobileView === 'notebook' ? 'active' : ''}`}
          onClick={() => switchMobileView('notebook')}
        >
          Notebook
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'visualization'}
          className={`mobile-view-tab ${mobileView === 'visualization' ? 'active' : ''}`}
          onClick={() => switchMobileView('visualization')}
        >
          Visualization
          {output.trace && output.trace.length > 0 && (
            <span className="mobile-view-badge">{output.trace.length}</span>
          )}
        </button>
      </div>

      <div
        ref={mainContentRef}
        className={`main-content jupyter-style mobile-view-${mobileView}`}
        style={{ ['--notebook-width' as string]: `${notebookWidthPercent}%` }}
      >
        {/* Left: Notebook (markdown + code cells) */}
        <div className="notebook-panel">
          <div className="notebook-header">
            <div className="notebook-info">
              <span className="notebook-name">Notebook</span>
            </div>
            <span className={`status ${pyodideStatus}`} role="status">
              {statusMessage}
            </span>
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
              editorTheme={theme === 'jupyter' ? 'data8-light' : 'data8-dark'}
              readOnlyCode={isRunning}
              onFocusCodeCell={() => editorRef.current?.focus()}
              output={output}
            />
          </div>
        </div>

        {/* ARIA "window splitter" pattern: a focusable separator is valid, but
            jsx-a11y doesn't model it */}
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize panels"
          aria-orientation="vertical"
          aria-valuenow={Math.round(notebookWidthPercent)}
          aria-valuemin={20}
          aria-valuemax={80}
          tabIndex={0}
          onMouseDown={handleResizerMouseDown}
          onKeyDown={handleResizerKeyDown}
        />
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}

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
            width: 900,
            zIndex: -1,
          }}
        >
          {flattenTrace(output.trace).map((frame, i) => (
            <StepCard key={i} frame={frame} />
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

