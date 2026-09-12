import { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import * as monaco from 'monaco-editor';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { PyodideOutput } from '../lib/pyodide';
import CellOutput from './CellOutput';
import './NotebookCells.css';

interface NotebookCellsProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  isRunning: boolean;
  pyodideReady: boolean;
  onRun: () => void;
  onStop: () => void;
  onEditorMount?: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
  onEditorWillMount?: (monaco: typeof import('monaco-editor')) => void;
  /** Monaco theme name, defined in App's beforeMount handler */
  editorTheme?: 'data8-dark' | 'data8-light';
  readOnlyCode?: boolean;
  /** Called when user presses Shift+Enter in markdown cell to focus the code editor */
  onFocusCodeCell?: () => void;
  /** Last run's console output, shown beneath the code cell */
  output?: PyodideOutput;
}

/** Modifier key for the run shortcut: ⌘ on Apple platforms, Ctrl elsewhere (matches Monaco's CtrlCmd) */
const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const MOD_KEY = IS_APPLE ? '⌘' : 'Ctrl';
export const RUN_SHORTCUT = `${IS_APPLE ? 'Cmd' : 'Ctrl'}+Enter`;

/** iOS Safari zooms the page when focusing text below 16px, so use a larger editor font on phones */
function useIsNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

export default function NotebookCells({
  markdown,
  onMarkdownChange,
  code,
  onCodeChange,
  isRunning,
  pyodideReady,
  onRun,
  onStop,
  onEditorMount,
  onEditorWillMount,
  editorTheme = 'data8-light',
  readOnlyCode = false,
  onFocusCodeCell,
  output,
}: NotebookCellsProps) {
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const codeCellEditorRef = useRef<HTMLDivElement>(null);
  const notebookContainerRef = useRef<HTMLDivElement>(null);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);
  const [codeEditorHeight, setCodeEditorHeight] = useState(120);
  const hasUserInteractedRef = useRef(false);
  const isNarrowScreen = useIsNarrowScreen();

  const resizeMarkdownTextarea = useCallback(() => {
    const ta = markdownTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    
    // Auto-scroll to keep cursor in view when content expands (only after user has interacted)
    if (hasUserInteractedRef.current && document.activeElement === ta) {
      requestAnimationFrame(() => {
        ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, []);

  // The code cell always fits its content (like a notebook cell); the panel scrolls, not the editor
  const updateCodeEditorHeight = useCallback((editor: MonacoEditor.IStandaloneCodeEditor) => {
    const padding = 24;
    setCodeEditorHeight(Math.round(Math.max(120, editor.getContentHeight() + padding)));

    // While typing, keep the growing cell in view without yanking the panel around
    if (editor.hasTextFocus()) {
      requestAnimationFrame(() => {
        codeCellEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, []);

  const enterEditMode = useCallback(() => {
    hasUserInteractedRef.current = true;
    setIsMarkdownEditing(true);
  }, []);

  useEffect(() => {
    if (!isMarkdownEditing) return;
    const ta = markdownTextareaRef.current;
    if (!ta) return;
    ta.focus();
    const id = requestAnimationFrame(() => {
      resizeMarkdownTextarea();
      // Ensure the textarea is visible when entering edit mode (user just double-clicked)
      if (hasUserInteractedRef.current) {
        ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isMarkdownEditing, resizeMarkdownTextarea]);

  useEffect(() => {
    const ta = markdownTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [markdown]);

  const exitEditMode = useCallback(() => {
    setIsMarkdownEditing(false);
  }, []);

  const handleCodeCellWheel = useCallback((e: React.WheelEvent) => {
    const container = notebookContainerRef.current;
    if (!container) return;
    container.scrollTop += e.deltaY;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMarkdownKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        hasUserInteractedRef.current = true; // so code cell scroll runs when we focus it
        exitEditMode();
        onFocusCodeCell?.();
      }
    },
    [exitEditMode, onFocusCodeCell]
  );

  return (
    <div className="notebook-cells-container" ref={notebookContainerRef}>
      {/* Markdown cell */}
      <div className="notebook-cell notebook-cell-markdown">
        <div className="cell-label">Markdown</div>
        {!isMarkdownEditing ? (
          <div
            className="markdown-preview-only"
            role="button"
            tabIndex={0}
            onDoubleClick={enterEditMode}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                enterEditMode();
              }
            }}
            aria-label="Double-tap or press Enter to edit markdown"
          >
            {markdown.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {markdown}
              </ReactMarkdown>
            ) : (
              <span className="markdown-preview-placeholder">Double-tap to add markdown</span>
            )}
          </div>
        ) : (
          <div className="markdown-cell-inner markdown-edit-mode">
            <textarea
              ref={markdownTextareaRef}
              className="markdown-input"
              value={markdown}
              onChange={(e) => {
                hasUserInteractedRef.current = true;
                onMarkdownChange(e.target.value);
                resizeMarkdownTextarea();
              }}
              onKeyDown={handleMarkdownKeyDown}
              placeholder="Write supporting text in **Markdown**..."
              rows={4}
              spellCheck="false"
            />
            <div className="markdown-edit-actions">
              <button
                type="button"
                className="cell-btn cell-btn-run"
                onClick={exitEditMode}
                title="Render markdown (Shift+Enter)"
              >
                <PlayIcon />
                <span>Render</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code cell */}
      <div className="notebook-cell notebook-cell-code">
        <div className="cell-toolbar">
          <div className="cell-toolbar-left">
            <span className="cell-label">Code</span>
            <span className="cell-hint"><kbd>{MOD_KEY}</kbd><kbd>Enter</kbd> to run</span>
          </div>
          <div className="cell-actions">
            <button
              type="button"
              className="cell-btn cell-btn-run"
              onClick={onRun}
              disabled={!pyodideReady || isRunning}
              title={`Run cell (${RUN_SHORTCUT})`}
            >
              <PlayIcon />
              <span>Run</span>
            </button>
            <button
              type="button"
              className="cell-btn cell-btn-stop"
              onClick={onStop}
              disabled={!isRunning}
              title="Stop execution"
            >
              <StopIcon />
              <span>Stop</span>
            </button>
          </div>
        </div>
        <div className="code-cell-editor" ref={codeCellEditorRef} onWheel={handleCodeCellWheel}>
          <Editor
            height={codeEditorHeight}
            defaultLanguage="python"
            value={code}
            beforeMount={onEditorWillMount}
            onChange={(value) => onCodeChange(value || '')}
            onMount={(editor) => {
              onEditorMount?.(editor);
              updateCodeEditorHeight(editor);
              // Fires for edits, new values (examples, shared links) and word-wrap changes on resize
              editor.onDidContentSizeChange(() => updateCodeEditorHeight(editor));
              editor.onDidFocusEditorText(() => {
                hasUserInteractedRef.current = true;
              });
              editor.addAction({
                id: 'run-cell',
                label: 'Run cell',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                run: () => onRun(),
              });
            }}
            theme={editorTheme}
            options={{
              minimap: { enabled: false },
              fontSize: isNarrowScreen ? 16 : 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: readOnlyCode,
              tabSize: 4,
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      {/* Output: its own block so it never changes the code cell's height */}
      {output && <CellOutput output={output} />}
    </div>
  );
}
