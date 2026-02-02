import type { TraceRecord, TableState } from './pyodide';

export interface DisplayStep {
  record: TraceRecord;
  subIndex: number;
  subTotal: number;
  message: string;
  before: TableState;
  after?: TableState;
  otherTable?: TableState;
  highlightBeforeCols: number[];
  highlightBeforeRows: number[];
  highlightBeforeCells: [number, number][];
  highlightAfterCols: number[];
  highlightAfterRows: number[];
  highlightAfterCells: [number, number][];
  /** For join: highlights on the right (other) table */
  highlightOtherCols: number[];
  highlightOtherRows: number[];
}

const MAX_GROUP_STEPS = 8;
const MAX_PIVOT_ROW_STEPS = 15;
const MAX_JOIN_STEPS = 12;

function getUniqueValuesSorted(preview: unknown[][], colIndex: number): unknown[] {
  if (!preview.length || colIndex < 0) return [];
  const values = preview.map((row) => row[colIndex]);
  const uniq = Array.from(new Set(values));
  const first = uniq[0];
  if (typeof first === 'number') {
    return uniq.slice().sort((a, b) => (a as number) - (b as number));
  }
  return uniq.slice().sort((a, b) => String(a).localeCompare(String(b)));
}

function formatUniqueValues(values: unknown[]): string {
  return values.map((v) => (typeof v === 'string' ? `"${v}"` : v)).join(', ');
}

function simpleStep(record: TraceRecord): DisplayStep {
  return {
    record,
    subIndex: 0,
    subTotal: 1,
    message: record.explanation,
    before: record.input,
    after: record.output,
    highlightBeforeCols: [],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  };
}

function expandGroup(record: TraceRecord): DisplayStep[] {
  const { input: before, output: after, args } = record;
  const groupCol = typeof args?.[0] === 'string' ? args[0] : undefined;
  if (!groupCol || !before.columns.includes(groupCol)) {
    return [simpleStep(record)];
  }
  const groupColIndex = before.columns.indexOf(groupCol);
  const uniqueValues = getUniqueValuesSorted(before.preview, groupColIndex);
  const steps: DisplayStep[] = [];

  // Step 1: Identify group column (before only)
  steps.push({
    record,
    subIndex: 0,
    subTotal: 0, // will set at end
    message: 'Identify the group column.',
    before,
    highlightBeforeCols: [groupColIndex],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  // Step 2: Unique values + result structure (skeleton: columns, empty or first row)
  const skeletonAfter: TableState = {
    ...after,
    preview: [], // empty rows for skeleton
    num_rows: 0,
  };
  const uniqueStr = formatUniqueValues(uniqueValues);
  steps.push({
    record,
    subIndex: 1,
    subTotal: 0,
    message: `Unique values (sorted): [${uniqueStr}]. Result has one row per group.`,
    before,
    after: skeletonAfter,
    highlightBeforeCols: [groupColIndex],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: after.columns.map((_, i) => i),
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  // Steps 3..N: For each unique value, highlight matching rows and show partial result
  const groupStepCount = Math.min(uniqueValues.length, MAX_GROUP_STEPS);
  for (let i = 0; i < groupStepCount; i++) {
    const value = uniqueValues[i];
    const rowIndices: number[] = [];
    before.preview.forEach((row, r) => {
      if (row[groupColIndex] === value) rowIndices.push(r);
    });
    const partialAfter: TableState = {
      ...after,
      preview: after.preview.slice(0, i + 1),
      num_rows: i + 1,
    };
    const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
    steps.push({
      record,
      subIndex: 2 + i,
      subTotal: 0,
      message: `Group value = ${valueStr}. Rows matched: ${rowIndices.length}.`,
      before,
      after: partialAfter,
      highlightBeforeCols: [groupColIndex],
      highlightBeforeRows: rowIndices,
      highlightBeforeCells: [],
      highlightAfterCols: [],
      highlightAfterRows: [i],
      highlightAfterCells: [],
      highlightOtherCols: [],
      highlightOtherRows: [],
    });
  }

  if (uniqueValues.length > MAX_GROUP_STEPS) {
    steps.push({
      record,
      subIndex: 2 + groupStepCount,
      subTotal: 0,
      message: `… and ${uniqueValues.length - MAX_GROUP_STEPS} more groups.`,
      before,
      after,
      highlightBeforeCols: [groupColIndex],
      highlightBeforeRows: [],
      highlightBeforeCells: [],
      highlightAfterCols: [],
      highlightAfterRows: [],
      highlightAfterCells: [],
      highlightOtherCols: [],
      highlightOtherRows: [],
    });
  }

  // Final step: full result
  steps.push({
    record,
    subIndex: steps.length,
    subTotal: 0,
    message: '',
    before,
    after,
    highlightBeforeCols: [],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  const subTotal = steps.length;
  steps.forEach((s) => (s.subTotal = subTotal));
  return steps;
}

function expandPivot(record: TraceRecord): DisplayStep[] {
  const { input: before, output: after, args } = record;
  const pivotCol = typeof args?.[0] === 'string' ? args[0] : undefined;
  const groupCol = typeof args?.[1] === 'string' ? args[1] : undefined;
  if (!pivotCol || !groupCol || !before.columns.includes(pivotCol) || !before.columns.includes(groupCol)) {
    return [simpleStep(record)];
  }
  const pivotColIndex = before.columns.indexOf(pivotCol);
  const groupColIndex = before.columns.indexOf(groupCol);
  const pivotUniq = getUniqueValuesSorted(before.preview, pivotColIndex);
  const groupUniq = getUniqueValuesSorted(before.preview, groupColIndex);
  const steps: DisplayStep[] = [];

  // Step 1: Pivot column - highlight pivot column, message
  steps.push({
    record,
    subIndex: 0,
    subTotal: 0,
    message: `Unique Value(s) in Pivot Column (sorted): [${formatUniqueValues(pivotUniq)}]`,
    before,
    after: undefined,
    highlightBeforeCols: [pivotColIndex],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  // Step 2: Group column + skeleton result table
  const skeletonAfter: TableState = {
    ...after,
    preview: after.preview.length > 0 ? after.preview : [],
    num_rows: after.num_rows,
  };
  steps.push({
    record,
    subIndex: 1,
    subTotal: 0,
    message: `Unique Value(s) in group column (sorted): [${formatUniqueValues(groupUniq)}]`,
    before,
    after: skeletonAfter,
    highlightBeforeCols: [groupColIndex],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: after.columns.map((_, i) => i),
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  // Steps 3..M+2: For each row in input (cap MAX_PIVOT_ROW_STEPS), highlight row and result cell
  const rowStepCount = Math.min(before.preview.length, MAX_PIVOT_ROW_STEPS);
  for (let rowIndex = 0; rowIndex < rowStepCount; rowIndex++) {
    const row = before.preview[rowIndex];
    const groupVal = row[groupColIndex];
    const pivotVal = row[pivotColIndex];
    const groupRowIdx = groupUniq.indexOf(groupVal);
    const pivotColIdx = after.columns.indexOf(String(pivotVal));
    if (pivotColIdx < 0) continue; // pivot value might be column name in output
    const afterCell: [number, number] = [groupRowIdx, pivotColIdx];
    steps.push({
      record,
      subIndex: 2 + rowIndex,
      subTotal: 0,
      message: 'Row contributes to cell (group, pivot).',
      before,
      after,
      highlightBeforeCols: [],
      highlightBeforeRows: [rowIndex],
      highlightBeforeCells: [],
      highlightAfterCols: [],
      highlightAfterRows: [],
      highlightAfterCells: [afterCell],
      highlightOtherCols: [],
      highlightOtherRows: [],
    });
  }

  if (before.preview.length > MAX_PIVOT_ROW_STEPS) {
    steps.push({
      record,
      subIndex: 2 + rowStepCount,
      subTotal: 0,
      message: `… and ${before.preview.length - MAX_PIVOT_ROW_STEPS} more rows.`,
      before,
      after,
      highlightBeforeCols: [],
      highlightBeforeRows: [],
      highlightBeforeCells: [],
      highlightAfterCols: [],
      highlightAfterRows: [],
      highlightAfterCells: [],
      highlightOtherCols: [],
      highlightOtherRows: [],
    });
  }

  // Final step
  steps.push({
    record,
    subIndex: steps.length,
    subTotal: 0,
    message: '',
    before,
    after,
    highlightBeforeCols: [],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  const subTotal = steps.length;
  steps.forEach((s) => (s.subTotal = subTotal));
  return steps;
}

/** Build (resultRowIndex -> { leftRowIndex, rightRowIndex }) for join. */
function buildJoinMatches(
  before: TableState,
  otherTable: TableState,
  _after: TableState,
  joinCol: string
): { resultIdx: number; leftIdx: number; rightIdx: number }[] {
  const leftJoinIdx = before.columns.indexOf(joinCol);
  const rightJoinIdx = otherTable.columns.indexOf(joinCol);
  if (leftJoinIdx < 0 || rightJoinIdx < 0) return [];

  const matches: { resultIdx: number; leftIdx: number; rightIdx: number }[] = [];
  let resultIdx = 0;
  for (let i = 0; i < before.preview.length; i++) {
    const leftVal = before.preview[i][leftJoinIdx];
    for (let j = 0; j < otherTable.preview.length; j++) {
      if (otherTable.preview[j][rightJoinIdx] === leftVal) {
        matches.push({ resultIdx, leftIdx: i, rightIdx: j });
        resultIdx++;
      }
    }
  }
  return matches;
}

function expandJoin(record: TraceRecord): DisplayStep[] {
  const { input: before, output: after, args } = record;
  const joinCol = typeof args?.[0] === 'string' ? args[0] : undefined;
  if (!joinCol || !before.columns.includes(joinCol) || !after) {
    return [simpleStep(record)];
  }
  const joinColIndexLeft = before.columns.indexOf(joinCol);
  const otherTable = record.other_table;
  const steps: DisplayStep[] = [];

  // Step 1: Highlight join column in left table (before only)
  steps.push({
    record,
    subIndex: 0,
    subTotal: 0,
    message: `Join on column "${joinCol}".`,
    before,
    after: undefined,
    highlightBeforeCols: [joinColIndexLeft],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  if (otherTable) {
    // Step 2: Both tables side by side, join column highlighted in both
    const otherJoinColIndex = otherTable.columns.indexOf(joinCol);
    steps.push({
      record,
      subIndex: 1,
      subTotal: 0,
      message: 'Both tables and join column.',
      before,
      after,
      otherTable,
      highlightBeforeCols: [joinColIndexLeft],
      highlightBeforeRows: [],
      highlightBeforeCells: [],
      highlightAfterCols: after.columns.map((_, i) => i),
      highlightAfterRows: [],
      highlightAfterCells: [],
      highlightOtherCols: otherJoinColIndex >= 0 ? [otherJoinColIndex] : [],
      highlightOtherRows: [],
    });

    const matches = buildJoinMatches(before, otherTable, after, joinCol);
    const matchStepCount = Math.min(matches.length, MAX_JOIN_STEPS);
    for (let k = 0; k < matchStepCount; k++) {
      const { resultIdx, leftIdx, rightIdx } = matches[k];
      const joinVal = before.preview[leftIdx][joinColIndexLeft];
      const valueStr = typeof joinVal === 'string' ? `"${joinVal}"` : String(joinVal);
      steps.push({
        record,
        subIndex: 2 + k,
        subTotal: 0,
        message: `Matched on ${joinCol} = ${valueStr}.`,
        before,
        after,
        otherTable,
        highlightBeforeCols: [joinColIndexLeft],
        highlightBeforeRows: [leftIdx],
        highlightBeforeCells: [],
        highlightAfterCols: [],
        highlightAfterRows: [resultIdx],
        highlightAfterCells: [],
        highlightOtherCols: otherTable.columns.indexOf(joinCol) >= 0 ? [otherTable.columns.indexOf(joinCol)] : [],
        highlightOtherRows: [rightIdx],
      });
    }

    if (matches.length > MAX_JOIN_STEPS) {
      steps.push({
        record,
        subIndex: 2 + matchStepCount,
        subTotal: 0,
        message: `… and ${matches.length - MAX_JOIN_STEPS} more matches.`,
        before,
        after,
        otherTable,
        highlightBeforeCols: [],
        highlightBeforeRows: [],
        highlightBeforeCells: [],
        highlightAfterCols: [],
        highlightAfterRows: [],
        highlightAfterCells: [],
        highlightOtherCols: [],
        highlightOtherRows: [],
      });
    }
  } else {
    // No other_table: step 2 is result with join column and right-side cols highlighted
    const joinColIndexAfter = after.columns.indexOf(joinCol);
    steps.push({
      record,
      subIndex: 1,
      subTotal: 0,
      message: 'Result: matched rows from both tables.',
      before,
      after,
      highlightBeforeCols: [],
      highlightBeforeRows: [],
      highlightBeforeCells: [],
      highlightAfterCols: joinColIndexAfter >= 0 ? [joinColIndexAfter] : after.columns.map((_, i) => i),
      highlightAfterRows: [],
      highlightAfterCells: [],
      highlightOtherCols: [],
      highlightOtherRows: [],
    });
  }

  // Final step
  steps.push({
    record,
    subIndex: steps.length,
    subTotal: 0,
    message: '',
    before,
    after,
    otherTable,
    highlightBeforeCols: [],
    highlightBeforeRows: [],
    highlightBeforeCells: [],
    highlightAfterCols: [],
    highlightAfterRows: [],
    highlightAfterCells: [],
    highlightOtherCols: [],
    highlightOtherRows: [],
  });

  const subTotal = steps.length;
  steps.forEach((s) => (s.subTotal = subTotal));
  return steps;
}

export function expandRecordToSteps(record: TraceRecord): DisplayStep[] {
  if (!record.input || !record.output) return [simpleStep(record)];
  switch (record.operation) {
    case 'group':
      return expandGroup(record);
    case 'pivot':
      return expandPivot(record);
    case 'join':
      return expandJoin(record);
    default:
      return [simpleStep(record)];
  }
}

export function expandTraceToDisplaySteps(trace: TraceRecord[]): DisplayStep[] {
  if (!trace?.length) return [];
  return trace.flatMap(expandRecordToSteps);
}
