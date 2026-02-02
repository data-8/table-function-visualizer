import { useState, useEffect, useCallback, forwardRef } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import DataTransformation from './DataTransformation';
import './StepSlideshow.css';

export interface StepCardProps {
  record: TraceRecord;
  stepIndex: number;
  totalSteps: number;
}

/** Single-step content (header, explanation, DataTransformation). Used for display and PDF export. */
export function StepCard({ record, stepIndex: _stepIndex, totalSteps }: StepCardProps) {
  const hasValidData = record.input && record.output;
  const explanation =
    record.input?.num_rows === 0 &&
    record.output?.num_rows > 0 &&
    (record.operation === 'with_columns' || record.operation === 'with_column')
      ? `Created table with ${record.output.num_columns} columns and ${record.output.num_rows} rows`
      : record.explanation;

  return (
    <div className="step-slideshow step-card">
      <div className="slideshow-header">
        <div className="step-indicator">
          <span className="step-badge">Step {record.step_id} of {totalSteps}</span>
        </div>
        <div className="step-operation-title">
          <code>{record.operation}()</code>
        </div>
      </div>
      <div className="slideshow-explanation">
        <span className="explanation-text">{explanation}</span>
      </div>
      {hasValidData && (
        <div className="slideshow-visualization">
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

interface StepSlideshowProps {
  trace: TraceRecord[];
}

const StepSlideshow = forwardRef<HTMLDivElement, StepSlideshowProps>(function StepSlideshow({ trace }, ref) {
  const [currentStep, setCurrentStep] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentStep(prev => Math.min(trace.length - 1, prev + 1));
  }, [trace.length]);

  // Reset to first step when trace changes
  useEffect(() => {
    setCurrentStep(0);
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

  if (!trace || trace.length === 0) {
    return null;
  }

  const record = trace[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === trace.length - 1;

  return (
    <div className="step-slideshow" ref={ref}>
      <StepCard record={record} stepIndex={currentStep} totalSteps={trace.length} />

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

        <div className="step-dots">
          {trace.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(index)}
              title={`Go to step ${index + 1}`}
            />
          ))}
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

