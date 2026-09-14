import { useState, useEffect, useCallback, useMemo, forwardRef, type ReactNode } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import { flattenTrace, firstFrameOfOperation, type Frame } from '../lib/frames';
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

const StepSlideshow = forwardRef<HTMLDivElement, StepSlideshowProps>(function StepSlideshow({ trace, onFrameChange, predict = false }, ref) {
  const frames = useMemo(() => flattenTrace(trace), [trace]);
  const [currentFrame, setCurrentFrame] = useState(0);
  /** Predict mode bookkeeping, per operation index */
  const [guesses, setGuesses] = useState<Record<number, Prediction>>({});
  const [revealed, setRevealed] = useState<Record<number, 'checked' | 'shown'>>({});

  const goToPrevious = useCallback(() => {
    setCurrentFrame(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentFrame(prev => Math.min(frames.length - 1, prev + 1));
  }, [frames.length]);

  // Reset to first frame when trace changes
  useEffect(() => {
    setCurrentFrame(0);
    setGuesses({});
    setRevealed({});
  }, [trace]);

  useEffect(() => {
    const frame = frames[Math.min(currentFrame, frames.length - 1)];
    if (frame) onFrameChange?.(frame);
  }, [currentFrame, frames, onFrameChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious]);

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
        <button
          className="nav-button prev"
          onClick={goToPrevious}
          disabled={isFirst}
          title="Previous step"
        >
          <span className="arrow">‹</span>
          <span className="nav-text">Previous</span>
        </button>

        {/* One dot per operation; the active operation shows sub-progress */}
        <div className="step-dots">
          {trace.map((record, opIndex) => {
            const isActive = opIndex === frame.opIndex;
            const subCount = record.sub_steps?.length ?? 0;
            return (
              <button
                key={opIndex}
                className={`dot ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentFrame(firstFrameOfOperation(frames, opIndex))}
                title={`Go to step ${opIndex + 1}: ${record.operation}()`}
              >
                {isActive && subCount > 1 && (
                  <span className="dot-sub-label">{(frame.subIndex ?? 0) + 1}/{subCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          className="nav-button next"
          onClick={goToNext}
          disabled={isLast}
          title="Next step"
        >
          <span className="nav-text">Next</span>
          <span className="arrow">›</span>
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="keyboard-hint">
        Use arrow keys to navigate
      </div>
    </div>
  );
});

export default StepSlideshow;
