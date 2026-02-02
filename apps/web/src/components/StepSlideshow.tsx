import { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import type { TraceRecord } from '../lib/pyodide';
import { expandTraceToDisplaySteps, type DisplayStep } from '../lib/displaySteps';
import DataTransformation from './DataTransformation';
import './StepSlideshow.css';

export interface StepCardProps {
  step: DisplayStep;
  stepIndex: number;
  totalSteps: number;
}

function hasStepContent(step: DisplayStep): boolean {
  return !!step.before && (step.after !== undefined || step.message.length > 0);
}

/** Single-step content (header, explanation, DataTransformation). Used for display and PDF export. */
export function StepCard({ step, stepIndex, totalSteps }: StepCardProps) {
  const explanation = step.message || step.record.explanation;

  return (
    <div className="step-slideshow step-card">
      <div className="slideshow-header">
        <div className="step-indicator">
          <span className="step-badge">Step {stepIndex + 1} of {totalSteps}</span>
        </div>
        <div className="step-operation-title">
          <code>{step.record.operation}()</code>
        </div>
      </div>
      <div className="slideshow-explanation">
        <span className="explanation-text">{explanation}</span>
      </div>
      {hasStepContent(step) && (
        <div className="slideshow-visualization">
          <DataTransformation
            before={step.before}
            after={step.after}
            operation={step.record.operation}
            args={step.record.args}
            stepMessage={step.message}
            highlightBeforeCols={step.highlightBeforeCols}
            highlightBeforeRows={step.highlightBeforeRows}
            highlightBeforeCells={step.highlightBeforeCells}
            highlightAfterCols={step.highlightAfterCols}
            highlightAfterRows={step.highlightAfterRows}
            highlightAfterCells={step.highlightAfterCells}
            beforeOnly={step.after === undefined}
            otherTable={step.otherTable}
            highlightOtherCols={step.highlightOtherCols}
            highlightOtherRows={step.highlightOtherRows}
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
  const displaySteps = useMemo(() => expandTraceToDisplaySteps(trace ?? []), [trace]);
  const stepCount = displaySteps.length;

  const goToPrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(stepCount - 1, prev + 1));
  }, [stepCount]);

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

  if (!trace || trace.length === 0 || stepCount === 0) {
    return null;
  }

  const step = displaySteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === stepCount - 1;

  return (
    <div className="step-slideshow" ref={ref}>
      <StepCard step={step} stepIndex={currentStep} totalSteps={stepCount} />

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
          {displaySteps.map((_, index) => (
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

