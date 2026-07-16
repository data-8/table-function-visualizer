import { loadPyodide, type PyodideInterface } from 'pyodide';
import TRACER_CODE from './tracer.py?raw';

let pyodideInstance: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;
let wheelsInstalled = false;

/**
 * Tear down the current Pyodide runtime so the next initPyodide() does a full reload.
 * In-flight runPythonCode cannot be interrupted; callers must ignore stale results via run tokens.
 */
export function stopExecutionHard(): void {
  pyodideInstance = null;
  loadingPromise = null;
  wheelsInstalled = false;
}


export interface PyodideOutput {
  stdout: string;
  stderr: string;
  error?: string;
  trace?: TraceRecord[];
}

export interface Highlights {
  /** Preview row indices (0-based) to emphasize */
  rows?: number[];
  /** Preview row indices shown struck-through (e.g. rows removed by where) */
  rows_removed?: number[];
  /** Column names to emphasize */
  columns?: string[];
  /** Individual cells as [previewRowIndex, columnName] pairs */
  cells?: [number, string][];
}

export interface SubStep {
  /** Replaces record.explanation for this frame */
  message: string;
  /** Monospace detail line, e.g. "sum([3.55, 5.25]) = 8.8" */
  detail?: string;
  input_highlights?: Highlights;
  output_highlights?: Highlights;
  /** Intermediate result table; absent => render record.output */
  output_state?: TableState;
  /** Secondary input table (e.g. the right table of a join) */
  aux_table?: { label: string; state: TableState; highlights?: Highlights };
}

export interface TraceRecord {
  step_id: number;
  operation: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
  input: TableState;
  output: TableState;
  explanation: string;
  /** Pedagogical walkthrough frames; absent => single before/after frame */
  sub_steps?: SubStep[];
}

export interface TableState {
  num_rows: number;
  num_columns: number;
  columns: string[];
  preview: unknown[][];
  error?: string;
}

/**
 * Initialize and load Pyodide runtime
 * Uses singleton pattern to avoid multiple loads
 */
export async function initPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      console.log('Loading Pyodide...');
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      });
      
      console.log('Pyodide loaded successfully');
      pyodideInstance = pyodide;
      
      // Install packages
      await installPackages(pyodide);
      
      return pyodide;
    } catch (error) {
      console.error('Failed to load Pyodide:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Install datascience and load the inline tracer
 */
async function installPackages(pyodide: PyodideInterface): Promise<void> {
  if (wheelsInstalled) {
    console.log('Packages already installed');
    return;
  }

  try {
    console.log('=== Installing Python packages ===');
    
    // Load micropip
    console.log('Loading micropip...');
    await pyodide.loadPackage('micropip');
    console.log('✓ micropip loaded');
    
    // Install datascience
    console.log('Installing datascience from PyPI...');
    const result = await pyodide.runPythonAsync(`
import micropip
import sys

print("Python version:", sys.version)
print("Installing datascience...")

try:
    await micropip.install('datascience')
    print("✓ datascience installed successfully")
    
    # Verify import works
    import datascience
    from datascience import Table
    print("✓ datascience import successful")
    print("✓ Table class available")
    "SUCCESS"
except Exception as e:
    print(f"✗ Error installing datascience: {e}")
    import traceback
    traceback.print_exc()
    f"ERROR: {e}"
`);
    
    console.log('datascience install result:', result);
    
    // Load inline tracer (no wheel needed!)
    console.log('Loading inline table tracer...');
    await pyodide.runPythonAsync(TRACER_CODE);
    console.log('✓ Inline tracer loaded');
    
    // Test tracer
    await pyodide.runPythonAsync(`
print("Testing tracer...")
enable()
print("✓ Tracer enabled and ready")
`);

    // Pre-import the standard Data 8 symbols (Table, make_array, are, percentile, ...)
    // into the persistent global namespace. Course materials conventionally assume
    // `from datascience import *`, so code that only does `from datascience import Table`
    // (like the default snippet and every built-in example) still has make_array/are available.
    await pyodide.runPythonAsync(`
from datascience import *
print("✓ datascience symbols available (Table, make_array, are, percentile, ...)")
`);

    console.log('=== Package installation complete ===');
    wheelsInstalled = true;
  } catch (error) {
    console.error('❌ Failed to install packages:', error);
    throw error; // Re-throw to show error to user
  }
}

/**
 * Execute Python code and capture output
 */
export async function runPythonCode(code: string, enableTracing = true): Promise<PyodideOutput> {
  const pyodide = await initPyodide();
  
  const output: PyodideOutput = {
    stdout: '',
    stderr: '',
  };

  try {
    // Setup tracing
    if (enableTracing) {
      try {
        await pyodide.runPythonAsync(`
# Clear and enable tracing
clear_trace()
enable()
print("✓ Tracing enabled for this run")
`);
      } catch (e) {
        console.error('Failed to enable tracing:', e);
      }
    }

    // Capture stdout and stderr
    await pyodide.runPythonAsync(`
import sys
from io import StringIO

__stdout_capture = StringIO()
__stderr_capture = StringIO()
__old_stdout = sys.stdout
__old_stderr = sys.stderr
sys.stdout = __stdout_capture
sys.stderr = __stderr_capture
`);

    // Run user code
    await pyodide.runPythonAsync(code);

    // Get captured output
    output.stdout = await pyodide.runPythonAsync(`
sys.stdout = __old_stdout
sys.stderr = __old_stderr
__stdout_capture.getvalue()
`);

    output.stderr = await pyodide.runPythonAsync(`
__stderr_capture.getvalue()
`);

    // Get trace
    if (enableTracing) {
      try {
        const traceJson = await pyodide.runPythonAsync(`
import json
trace_data = get_trace()
print(f"✓ Captured {len(trace_data)} operations")
json.dumps(trace_data)
`);
        output.trace = JSON.parse(traceJson);
        console.log('✓ Trace retrieved:', output.trace);
      } catch (e) {
        console.error('Failed to get trace:', e);
        output.trace = [];
      }
    }

  } catch (error) {
    // Restore stdout/stderr
    try {
      await pyodide.runPythonAsync(`
sys.stdout = __old_stdout
sys.stderr = __old_stderr
`);
    } catch {
      // Ignore cleanup errors
    }

    output.error = error instanceof Error ? error.message : String(error);
  }

  return output;
}

/**
 * Get the current Pyodide instance (if loaded)
 */
export function getPyodide(): PyodideInterface | null {
  return pyodideInstance;
}

/**
 * Check if Pyodide is loaded
 */
export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null;
}

