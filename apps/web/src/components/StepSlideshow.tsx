import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, type ReactNode } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import { framesFor, firstFrameOfOperation, lastFrameOfOperation, type Frame, type DetailLevel } from '../lib/frames';
import DataTransformation from './DataTransformation';
import './StepSlideshow.css';

export interface StepCardProps {
  frame: Frame;
  /** Predict mode: shown in place of the result until the student reveals it */
  outputPlaceholder?: ReactNode;
  /** Predict mode: replaces the explanation, which would otherwise state the answer */
  explanationOverride?: string;
  /** Predict mode: feedback shown under the explanation after revealing */
  feedback?: ReactNode;
}

/** Single-frame content (header, explanation, DataTransformation). Used for display and PDF export. */
export function StepCard({ frame, outputPlaceholder, feedback, explanationOverride }: StepCardProps) {
  const { record, subStep, opIndex, opTotal, subIndex, subTotal } = frame;
  const hasValidData = record.input && record.output;
  const baseExplanation =
    record.input?.num_rows === 0 &&
    record.output?.num_rows > 0 &&
    (record.operation === 'with_columns' || record.operation === 'with_column')
      ? `Created table with ${record.output.num_columns} columns and ${record.output.num_rows} rows`
      : record.explanation;
  const explanation = explanationOverride ?? subStep?.message ?? baseExplanation;
  const showSubProgress = subTotal !== undefined && subTotal > 1;

  return (
    <div className="step-slideshow step-card">
      <div className="slideshow-header">
        <div className="step-indicator">
          <span className="step-badge">
            Step {opIndex + 1} of {opTotal}
            {showSubProgress && (
              <span className="sub-progress"> · part {(subIndex ?? 0) + 1} of {subTotal}</span>
            )}
          </span>
        </div>
        <div className="step-operation-title">
          <code>
            {record.assigns && <span className="step-assigns">{record.assigns} = </span>}
            {record.operation}()
          </code>
        </div>
      </div>
      <div className="slideshow-explanation">
        <div className="explanation-body">
          <span className="explanation-text">{explanation}</span>
          {subStep?.detail && !explanationOverride && <code className="explanation-detail">{subStep.detail}</code>}
          {feedback}
        </div>
      </div>
      {hasValidData && (
        <div className="slideshow-visualization">
          <DataTransformation
            before={record.input}
            after={record.output}
            operation={record.operation}
            inputHighlights={subStep?.input_highlights}
            outputHighlights={subStep?.output_highlights}
            outputOverride={subStep?.output_state}
            auxTable={subStep?.aux_table}
            auxOutput={subStep?.aux_output}
            outputLabel={subStep?.output_label}
            isSubStep={Boolean(subStep)}
            outputPlaceholder={outputPlaceholder}
          />
        </div>
      )}
    </div>
  );
}

interface StepSlideshowProps {
  trace: TraceRecord[];
  /** Called whenever the shown frame changes (used to highlight the source line in the notebook) */
  onFrameChange?: (frame: Frame) => void;
  /** Predict mode: hide each operation's result until the student commits to a guess */
  predict?: boolean;
  /** Every walkthrough frame, or one result frame per operation */
  detail?: DetailLevel;
  /** Presentation: offer autoplay (Space) with a speed control */
  autoplay?: boolean;
}

interface Prediction {
  rows: string;
  cols: string;
}

/** Predict-the-output card, shown where the result would be */
function PredictCard({ isArray, before, guess, onChange, onCheck, onReveal }: {
  isArray: boolean;
  before: { num_rows: number; num_columns: number };
  guess: Prediction;
  onChange: (g: Prediction) => void;
  onCheck: () => void;
  onReveal: () => void;
}) {
  return (
    <form
      className="predict-card"
      onSubmit={(e) => { e.preventDefault(); onCheck(); }}
    >
      <div className="predict-title">What will the result look like?</div>
      <div className="predict-hint">The table going in has {before.num_rows} row{before.num_rows !== 1 ? 's' : ''} and {before.num_columns} column{before.num_columns !== 1 ? 's' : ''}.</div>
      <label className="predict-field">
        <span>{isArray ? 'How many values?' : 'How many rows?'}</span>
        <input type="number" min={0} inputMode="numeric" value={guess.rows} onChange={(e) => onChange({ ...guess, rows: e.target.value })} />
      </label>
      {!isArray && (
        <label className="predict-field">
          <span>How many columns?</span>
          <input type="number" min={0} inputMode="numeric" value={guess.cols} onChange={(e) => onChange({ ...guess, cols: e.target.value })} />
        </label>
      )}
      <div className="predict-actions">
        <button type="submit" className="predict-check" disabled={guess.rows === '' || (!isArray && guess.cols === '')}>Check</button>
        <button type="button" className="predict-skip" onClick={onReveal}>Just show me</button>
      </div>
    </form>
  );
}

const AUTOPLAY_SPEEDS = [1, 2, 3, 5] as const;

const StepSlideshow = forwardRef<HTMLDivElement, StepSlideshowProps>(function StepSlideshow({ trace, onFrameChange, predict = false, detail = 'all', autoplay = false }, ref) {
  const frames = useMemo(() => framesFor(trace, detail), [trace, detail]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [secondsPerFrame, setSecondsPerFrame] = useState<number>(2);
  /** Predict mode bookkeeping, per operation index */
  const [guesses, setGuesses] = useState<Record<number, Prediction>>({});
  const [revealed, setRevealed] = useState<Record<number, 'checked' | 'shown'>>({});

  const goToPrevious = useCallback(() => {
    setCurrentFrame(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentFrame(prev => Math.min(frames.length - 1, prev + 1));
  }, [frames.length]);

  /** Skip to the result of the current operation, or of the next one if already there */
  const goToResult = useCallback(() => {
    setCurrentFrame(prev => {
      const op = frames[Math.min(prev, frames.length - 1)]?.opIndex ?? 0;
      const end = lastFrameOfOperation(frames, op);
      if (prev < end) return end;
      const nextOp = Math.min(op + 1, (frames[frames.length - 1]?.opIndex ?? 0));
      return lastFrameOfOperation(frames, nextOp);
    });
  }, [frames]);

  /** Back to the start of the current operation, or of the previous one if already there */
  const goToStart = useCallback(() => {
    setCurrentFrame(prev => {
      const op = frames[Math.min(prev, frames.length - 1)]?.opIndex ?? 0;
      const start = firstFrameOfOperation(frames, op);
      if (prev > start) return start;
      return firstFrameOfOperation(frames, Math.max(0, op - 1));
    });
  }, [frames]);

  // Reset to first frame when the trace changes; keep the operation when only the detail level changes
  useEffect(() => {
    setCurrentFrame(0);
    setGuesses({});
    setRevealed({});
    setPlaying(false);
  }, [trace]);
  const lastDetailRef = useRef(detail);
  useEffect(() => {
    if (lastDetailRef.current === detail) return;
    lastDetailRef.current = detail;
    setCurrentFrame(prev => {
      // prev indexes the old frame list; map through the operation it was on
      const oldFrames = framesFor(trace, detail === 'all' ? 'results' : 'all');
      const op = oldFrames[Math.min(prev, oldFrames.length - 1)]?.opIndex ?? 0;
      return firstFrameOfOperation(frames, op);
    });
  }, [detail, trace, frames]);

  // Autoplay (presentation only): advance on a timer, stop at the end
  useEffect(() => {
    if (!playing) return;
    if (currentFrame >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setCurrentFrame(f => Math.min(frames.length - 1, f + 1)), secondsPerFrame * 1000);
    return () => clearTimeout(id);
  }, [playing, currentFrame, frames.length, secondsPerFrame]);

  useEffect(() => {
    const frame = frames[Math.min(currentFrame, frames.length - 1)];
    if (frame) onFrameChange?.(frame);
  }, [currentFrame, frames, onFrameChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.monaco-editor'))) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPlaying(false);
        if (e.shiftKey) goToStart(); else goToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPlaying(false);
        if (e.shiftKey) goToResult(); else goToNext();
      } else if (autoplay && e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious, goToStart, goToResult, autoplay]);

  if (!trace || trace.length === 0 || frames.length === 0) {
    return null;
  }

  const frame = frames[Math.min(currentFrame, frames.length - 1)];
  const isFirst = currentFrame === 0;
  const isLast = currentFrame === frames.length - 1;

  // Predict mode: the result of the current operation stays hidden until checked or shown
  const op = frame.opIndex;
  const hidden = predict && !revealed[op] && Boolean(frame.record.output && frame.record.input);
  const guess = guesses[op] ?? { rows: '', cols: '' };
  const isArray = frame.record.output?.kind === 'array';
  let feedback: ReactNode = null;
  if (predict && revealed[op] === 'checked' && guesses[op]) {
    const actualRows = frame.record.output.num_rows;
    const actualCols = frame.record.output.num_columns;
    const rowsRight = Number(guesses[op].rows) === actualRows;
    const colsRight = isArray || Number(guesses[op].cols) === actualCols;
    feedback = (
      <div className={`predict-feedback ${rowsRight && colsRight ? 'is-right' : 'is-wrong'}`}>
        {isArray
          ? <span>{rowsRight ? 'Right' : 'Not quite'}: you said {guesses[op].rows} value{guesses[op].rows !== '1' ? 's' : ''}, the result has {actualRows}.</span>
          : <span>{rowsRight && colsRight ? 'Right' : 'Not quite'}: you said {guesses[op].rows} × {guesses[op].cols}, the result is {actualRows} row{actualRows !== 1 ? 's' : ''} × {actualCols} column{actualCols !== 1 ? 's' : ''}.</span>}
      </div>
    );
  }
  const placeholder = hidden ? (
    <PredictCard
      isArray={isArray}
      before={frame.record.input}
      guess={guess}
      onChange={(g) => setGuesses(prev => ({ ...prev, [op]: g }))}
      onCheck={() => setRevealed(prev => ({ ...prev, [op]: 'checked' }))}
      onReveal={() => setRevealed(prev => ({ ...prev, [op]: 'shown' }))}
    />
  ) : undefined;

  const argsText = Array.isArray(frame.record.args) ? frame.record.args.map(a => typeof a === 'string' ? `'${a}'` : String(a)).join(', ') : '';
  const shownFrame = hidden ? { ...frame, subStep: undefined } : frame;
  const explanationOverride = hidden
    ? `${frame.record.operation}(${argsText}) is about to run on the table below. What will come out?`
    : undefined;

  return (
    <div className="step-slideshow" ref={ref}>
      <div className="step-frame fade-in" key={currentFrame}>
        <StepCard frame={shownFrame} outputPlaceholder={placeholder} feedback={feedback} explanationOverride={explanationOverride} />
      </div>

      {/* Navigation Controls */}
      <div className="slideshow-controls">
        <div className="nav-group">
          <button
            type="button"
            className="skip-button"
            onClick={goToStart}
            disabled={isFirst}
            title="Back to the start of this operation (Shift+←)"
            aria-label="Back to start of operation"
          >
            <span className="arrow">«</span>
          </button>
          <button
            className="nav-button prev"
            onClick={goToPrevious}
            disabled={isFirst}
            title="Previous step (←)"
          >
            <span className="arrow">‹</span>
            <span className="nav-text">Previous</span>
          </button>
        </div>

        {/* One dot per operation; the active operation shows sub-progress */}
        <div className="step-dots">
          {trace.map((record, opIndex) => {
            const isActive = opIndex === frame.opIndex;
            const subCount = isActive ? (frame.subTotal ?? 0) : 0;
            return (
              <button
                key={opIndex}
                className={`dot ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentFrame(isActive ? lastFrameOfOperation(frames, opIndex) : firstFrameOfOperation(frames, opIndex))}
                title={isActive ? `Skip to the result of ${record.operation}()` : `Go to step ${opIndex + 1}: ${record.operation}()`}
              >
                {isActive && subCount > 1 && (
                  <span className="dot-sub-label">{(frame.subIndex ?? 0) + 1}/{subCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="nav-group">
          <button
            className="nav-button next"
            onClick={goToNext}
            disabled={isLast}
            title="Next step (→)"
          >
            <span className="nav-text">Next</span>
            <span className="arrow">›</span>
          </button>
          <button
            type="button"
            className="skip-button"
            onClick={goToResult}
            disabled={isLast}
            title="Skip to the result of this operation (Shift+→)"
            aria-label="Skip to result"
          >
            <span className="arrow">»</span>
          </button>
        </div>
      </div>

      {autoplay && (
        <div className="autoplay-controls">
          <button type="button" className={`autoplay-toggle ${playing ? 'is-playing' : ''}`} onClick={() => setPlaying(p => !p)} disabled={isLast && !playing} title="Play or pause (Space)">
            {playing ? 'Pause' : 'Play'}
          </button>
          <label className="autoplay-speed">
            <span>every</span>
            <select value={secondsPerFrame} onChange={(e) => setSecondsPerFrame(Number(e.target.value))}>
              {AUTOPLAY_SPEEDS.map(sec => <option key={sec} value={sec}>{sec} s</option>)}
            </select>
          </label>
        </div>
      )}

      {/* Keyboard Hint */}
      <div className="keyboard-hint">
        Arrow keys step{autoplay ? ', Space plays' : ''}; Shift+arrows jump to the result or start of an operation
      </div>
    </div>
  );
});

export default StepSlideshow;
