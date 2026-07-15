import { useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import { flattenTrace, firstFrameOfOperation, type Frame } from '../lib/frames';
import DataTransformation from './DataTransformation';
import './StepSlideshow.css';

export interface StepCardProps {
  frame: Frame;
}

/** Single-frame content (header, explanation, DataTransformation). Used for display and PDF export. */
export function StepCard({ frame }: StepCardProps) {
  const { record, subStep, opIndex, opTotal, subIndex, subTotal } = frame;
  const hasValidData = record.input && record.output;
  const baseExplanation =
    record.input?.num_rows === 0 &&
    record.output?.num_rows > 0 &&
    (record.operation === 'with_columns' || record.operation === 'with_column')
      ? `Created table with ${record.output.num_columns} columns and ${record.output.num_rows} rows`
      : record.explanation;
  const explanation = subStep?.message ?? baseExplanation;
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
          <code>{record.operation}()</code>
        </div>
      </div>
      <div className="slideshow-explanation">
        <div className="explanation-body">
          <span className="explanation-text">{explanation}</span>
          {subStep?.detail && <code className="explanation-detail">{subStep.detail}</code>}
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
            isSubStep={Boolean(subStep)}
          />
        </div>
      )}
    </div>
  );
}

interface StepSlideshowProps {
  trace: TraceRecord[];
}

const StepSlideshow = forwardRef<HTMLDivElement, StepSlideshowProps>(function StepSlideshow({ trace }, ref) {
  const frames = useMemo(() => flattenTrace(trace), [trace]);
  const [currentFrame, setCurrentFrame] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentFrame(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentFrame(prev => Math.min(frames.length - 1, prev + 1));
  }, [frames.length]);

  // Reset to first frame when trace changes
  useEffect(() => {
    setCurrentFrame(0);
  }, [trace]);

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

  return (
    <div className="step-slideshow" ref={ref}>
      <StepCard frame={frame} />

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
