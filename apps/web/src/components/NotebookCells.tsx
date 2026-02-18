import { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import * as monaco from 'monaco-editor';
import type { editor as MonacoEditor } from 'monaco-editor';
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
  /** Monaco theme name (e.g. data8-dark, data8-light) */
  editorTheme?: 'data8-dark' | 'data8-light';
  readOnlyCode?: boolean;
  /** Called when user presses Shift+Enter in markdown cell to focus the code editor */
  onFocusCodeCell?: () => void;
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
  editorTheme = 'data8-dark',
  readOnlyCode = false,
  onFocusCodeCell,
}: NotebookCellsProps) {
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const codeCellEditorRef = useRef<HTMLDivElement>(null);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);
  const [codeEditorHeight, setCodeEditorHeight] = useState(280);

  const enterEditMode = useCallback(() => {
    setIsMarkdownEditing(true);
    setTimeout(() => markdownTextareaRef.current?.focus(), 0);
  }, []);

  const exitEditMode = useCallback(() => {
    setIsMarkdownEditing(false);
  }, []);

  const handleMarkdownKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        exitEditMode();
        onFocusCodeCell?.();
      }
    },
    [exitEditMode, onFocusCodeCell]
  );

  useEffect(() => {
    const ta = markdownTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
  }, [markdown]);

  useEffect(() => {
    const el = codeCellEditorRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const h = entry.contentRect.height;
        setCodeEditorHeight(Math.max(180, Math.round(h)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="notebook-cells-container">
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
              onChange={(e) => onMarkdownChange(e.target.value)}
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
          <span className="cell-label">Code</span>
          <div className="cell-actions">
            <button
              type="button"
              className="cell-btn cell-btn-run"
              onClick={onRun}
              disabled={!pyodideReady || isRunning}
              title="Run cell (Ctrl+Enter)"
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
        <div className="code-cell-editor" ref={codeCellEditorRef}>
          <Editor
            height={codeEditorHeight}
            defaultLanguage="python"
            value={code}
            beforeMount={onEditorWillMount}
            onChange={(value) => onCodeChange(value || '')}
            onMount={(editor) => {
              onEditorMount?.(editor);
              editor.addAction({
                id: 'run-cell',
                label: 'Run cell',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                run: () => onRun(),
              });
              editor.focus();
            }}
            theme={editorTheme}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
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
    </div>
  );
}
