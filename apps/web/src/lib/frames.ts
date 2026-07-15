import type { TraceRecord, SubStep } from './pyodide';

/** One navigable slide: an operation, optionally narrowed to one of its sub-steps. */
export interface Frame {
  record: TraceRecord;
  subStep?: SubStep;
  /** Operation-level position (0-based) */
  opIndex: number;
  opTotal: number;
  /** Position within the operation's sub-steps (0-based); absent when the operation has none */
  subIndex?: number;
  subTotal?: number;
}

/** Expand each trace record into one frame per sub-step (or a single before/after frame). */
export function flattenTrace(trace: TraceRecord[]): Frame[] {
  const frames: Frame[] = [];
  trace.forEach((record, opIndex) => {
    const subs = record.sub_steps;
    if (subs && subs.length > 0) {
      subs.forEach((subStep, subIndex) => {
        frames.push({ record, subStep, opIndex, opTotal: trace.length, subIndex, subTotal: subs.length });
      });
    } else {
      frames.push({ record, opIndex, opTotal: trace.length });
    }
  });
  return frames;
}

/** Index of the first frame belonging to the given operation. */
export function firstFrameOfOperation(frames: Frame[], opIndex: number): number {
  const idx = frames.findIndex(f => f.opIndex === opIndex);
  return idx === -1 ? 0 : idx;
}
