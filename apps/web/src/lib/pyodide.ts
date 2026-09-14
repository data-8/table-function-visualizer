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
  /** repr() of a trailing bare expression, shown as the cell's Out[n] like a notebook */
  result?: string;
  /** Matplotlib figures drawn during the run, as PNGs (base64) with their display width in CSS px */
  images?: Array<{ png: string; width: number }>;
  error?: string;
  trace?: TraceRecord[];
}

export interface RunOptions {
  enableTracing?: boolean;
  /** Start a fresh trace (true) or append to the trace of earlier cells in a Run-all (false) */
  resetTrace?: boolean;
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
      // Handy for debugging from the browser console
      (window as unknown as { __pyodide?: PyodideInterface }).__pyodide = pyodide;
      
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

# Table.show() calls IPython.display, which has no front end here and just prints
# "<IPython.core.display.HTML object>". Print the text rendering instead, like print(t).
import datascience.tables as __ds_tables
def __show_as_text(self, max_rows=0):
    print(self.as_text(max_rows))
__show_as_text.__doc__ = __ds_tables.Table.show.__doc__
__ds_tables.Table.show = __show_as_text

# Plots: draw off-screen; figures left open after a cell are captured as PNGs (like %matplotlib inline)
import matplotlib as __mpl
__mpl.use('agg')
import matplotlib.pyplot as __plt
__plt.show = lambda *a, **k: None
import warnings as __warnings
__warnings.filterwarnings('ignore', message='.*non-interactive.*')

def __capture_figures():
    import io, base64
    out = []
    for num in __plt.get_fignums():
        fig = __plt.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=144, bbox_inches='tight', facecolor=fig.get_facecolor())
        out.append({"png": base64.b64encode(buf.getvalue()).decode('ascii'), "width": int(fig.get_figwidth() * 96)})
    __plt.close('all')
    return out

# Snapshot of the namespace after setup, so a kernel restart can forget everything cells defined
__baseline_globals = dict(globals())
__baseline_globals['__baseline_globals'] = __baseline_globals
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
export async function runPythonCode(code: string, options: RunOptions = {}): Promise<PyodideOutput> {
  const { enableTracing = true, resetTrace = true } = options;
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
${resetTrace ? 'clear_trace()' : ''}
enable()
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

    // Run user code inside a Python-level try/except. Pyodide's PythonError has an
    // empty .message while stderr is redirected, so we format the traceback ourselves
    // and keep any stdout / traced steps that happened before the failure.
    pyodide.globals.set('__user_code', code);
    const runInfo: string = await pyodide.runPythonAsync(`
import linecache as __linecache
import traceback as __traceback
# Register the cell source so tracebacks can quote the offending line
__linecache.cache['<cell>'] = (len(__user_code), None, __user_code.splitlines(True), '<cell>')
__err = None
__result = None
try:
    # Like a notebook cell: run every statement, then echo the value of a trailing bare
    # expression (so a cell ending in \`t\` or \`t.where(...)\` shows its table).
    import ast as __ast
    # IPython line magics (%matplotlib inline, %%time, ...) have no meaning here; blank them out
    # but keep the line count so tracebacks still point at the right line
    __user_code = '\\n'.join('' if l.lstrip().startswith('%') else l for l in __user_code.split('\\n'))
    __tree = __ast.parse(__user_code, '<cell>')
    __last = __tree.body.pop() if __tree.body and isinstance(__tree.body[-1], __ast.Expr) else None
    exec(compile(__tree, '<cell>', 'exec'), globals())
    if __last is not None:
        __val = eval(compile(__ast.Expression(__last.value), '<cell>', 'eval'), globals())
        if __val is not None:
            __result = repr(__val)
except BaseException as __e:
    __te = __traceback.TracebackException.from_exception(__e)
    # Hide our exec() wrapper and the tracer's patched-method frames (both run from '<exec>')
    __te.stack = __traceback.StackSummary.from_list([f for f in __te.stack if f.filename != '<exec>'])
    __err = ''.join(__te.format())
__images = __capture_figures()
import json as __json
__json.dumps({"error": __err, "result": __result, "images": __images})
`);
    const { error: errorText, result, images } = JSON.parse(runInfo) as {
      error: string | null;
      result: string | null;
      images: Array<{ png: string; width: number }>;
    };

    // Get captured output
    output.stdout = await pyodide.runPythonAsync(`
sys.stdout = __old_stdout
sys.stderr = __old_stderr
__stdout_capture.getvalue()
`);

    output.stderr = await pyodide.runPythonAsync(`
__stderr_capture.getvalue()
`);

    if (result !== null) {
      output.result = result;
    }
    if (images.length > 0) {
      output.images = images;
    }
    if (errorText) {
      output.error = errorText;
    }

    // Get trace (including operations that ran before an error)
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

    console.error('Python execution error:', error);
    const message = error instanceof Error ? error.message : String(error);
    output.error = message || 'The code could not be run. See the browser console for details.';
  }

  return output;
}

/**
 * Restart the kernel without reloading Python: every name defined by cells is forgotten and the
 * trace is cleared, but the interpreter and installed packages stay (so it is instant).
 */
export async function restartKernelSoft(): Promise<void> {
  const pyodide = await initPyodide();
  await pyodide.runPythonAsync(`
for __k in list(globals()):
    if __k not in __baseline_globals:
        del globals()[__k]
globals().update(__baseline_globals)
clear_trace()
__plt.close('all')
`);
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

