import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;
let wheelsInstalled = false;

// Inline tracer code - embedded directly
const INLINE_TRACER_CODE = `
_trace_enabled = False
_trace_log = []
_step_counter = 0
_original_methods = {}

def enable():
    global _trace_enabled
    if _trace_enabled:
        return
    _trace_enabled = True
    _patch_table_methods()

def disable():
    global _trace_enabled
    _trace_enabled = False

def get_trace():
    return _trace_log.copy()

def clear_trace():
    global _trace_log, _step_counter
    _trace_log = []
    _step_counter = 0

def _capture_table_state(table, max_rows=20):
    try:
        num_rows = table.num_rows
        columns = list(table.labels)
        preview_rows = min(num_rows, max_rows)
        preview_data = []
        
        if preview_rows > 0:
            for i in range(preview_rows):
                row = []
                for col in columns:
                    try:
                        value = table[col][i]
                        if hasattr(value, 'item'):
                            value = value.item()
                        row.append(value)
                    except:
                        row.append(None)
                preview_data.append(row)
        
        return {
            "num_rows": num_rows,
            "num_columns": len(columns),
            "columns": columns,
            "preview": preview_data,
        }
    except Exception as e:
        return {"error": str(e), "num_rows": 0, "num_columns": 0, "columns": [], "preview": []}

def _make_explanation(operation, args, kwargs, input_state, output_state):
    # Check if this is table initialization
    is_init = input_state.get("num_rows", 0) == 0 and output_state.get("num_rows", 0) > 0
    
    if operation == "with_columns" and is_init:
        cols = output_state.get("num_columns", 0)
        rows = output_state.get("num_rows", 0)
        return f"Created table with {cols} columns and {rows} rows"
    elif operation == "with_column" and is_init:
        col_name = args[0] if args else "?"
        return f"Initialized table with column '{col_name}'"
    elif operation == "select":
        selected = list(args) if args else []
        total = input_state.get("num_columns", 0)
        return f"Selected {len(selected)} of {total} columns: {', '.join(str(s) for s in selected)}"
    elif operation == "drop":
        dropped = list(args) if args else []
        remaining = output_state.get("num_columns", 0)
        return f"Dropped {len(dropped)} columns. {remaining} remain."
    elif operation == "with_column":
        col_name = args[0] if args else "?"
        return f"Added column '{col_name}'. Now {output_state.get('num_columns', 0)} columns."
    elif operation == "with_columns":
        num_added = len(args) // 2 if args else 0
        return f"Added {num_added} columns. Now {output_state.get('num_columns', 0)} columns."
    elif operation == "where":
        removed = input_state.get("num_rows", 0) - output_state.get("num_rows", 0)
        kept = output_state.get("num_rows", 0)
        return f"Filtered rows. Kept {kept}, removed {removed}."
    elif operation == "sort":
        col = args[0] if args else "?"
        return f"Sorted by '{col}'."
    elif operation == "group":
        col = args[0] if args else "?"
        num_groups = output_state.get("num_rows", 0)
        return f"Grouped by '{col}'. Created {num_groups} groups."
    elif operation == "join":
        col = args[0] if args else "?"
        return f"Joined on '{col}'."
    elif operation == "pivot":
        pivot_col = args[0] if args else "?"
        values_col = args[2] if len(args) > 2 else "?"
        return f"Pivoted table: '{pivot_col}' as columns, '{values_col}' as values."
    elif operation == "take":
        num_rows = args[0] if args else 0
        return f"Took first {num_rows} rows."
    else:
        return f"Applied {operation}."

def _serialize_args(args):
    if isinstance(args, dict):
        return {k: _serialize_args(v) for k, v in args.items()}
    elif isinstance(args, (list, tuple)):
        return [_serialize_args(item) for item in args]
    elif hasattr(args, 'tolist'):
        return args.tolist()
    elif hasattr(args, 'item'):
        return args.item()
    elif callable(args):
        return "<function>"
    elif isinstance(args, (str, int, float, bool, type(None))):
        return args
    else:
        return str(args)

def _trace_operation(operation_name):
    def decorator(original_method):
        def wrapper(self, *args, **kwargs):
            global _step_counter
            
            input_state = _capture_table_state(self)
            is_empty_before = input_state.get("num_rows", 0) == 0
            
            result = original_method(self, *args, **kwargs)
            output_state = {}
            if hasattr(result, 'labels') and hasattr(result, 'num_rows'):
                output_state = _capture_table_state(result)
            
            # SKIP with_column entirely when starting from empty table
            # (it's always part of with_columns initialization)
            should_skip = operation_name == "with_column" and is_empty_before
            
            # If this is with_columns on empty table, clean up any leaked traces
            if operation_name == "with_columns" and is_empty_before:
                # Remove ALL with_column traces from initialization
                _trace_log[:] = [t for t in _trace_log if t.get("operation") != "with_column"]
                # Reset counter since we removed traces
                _step_counter = len(_trace_log)
            
            explanation = _make_explanation(operation_name, args, kwargs, input_state, output_state)
            
            if _trace_enabled and not should_skip:
                _step_counter += 1
                trace_record = {
                    "step_id": _step_counter,
                    "operation": operation_name,
                    "args": _serialize_args(args),
                    "kwargs": _serialize_args(kwargs),
                    "input": input_state,
                    "output": output_state,
                    "explanation": explanation,
                }
                if operation_name == "join" and len(args) >= 2:
                    other = args[1]
                    if hasattr(other, "labels") and hasattr(other, "num_rows"):
                        trace_record["other_table"] = _capture_table_state(other)
                _trace_log.append(trace_record)
            
            return result
        return wrapper
    return decorator

def _patch_table_methods():
    try:
        from datascience import Table
    except ImportError:
        print("⚠️ datascience not found")
        return
    operations = ["select", "drop", "with_column", "with_columns", "where", "sort", "take", "group", "join", "pivot"]
    for op_name in operations:
        if hasattr(Table, op_name):
            original = getattr(Table, op_name)
            if op_name not in _original_methods:
                _original_methods[op_name] = original
            traced = _trace_operation(op_name)(original)
            setattr(Table, op_name, traced)
    print("✓ Table methods patched for tracing")
`;

export interface PyodideOutput {
  stdout: string;
  stderr: string;
  error?: string;
  trace?: TraceRecord[];
}

export interface TraceRecord {
  step_id: number;
  operation: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
  input: TableState;
  output: TableState;
  explanation: string;
  /** For join: the right-hand table. */
  other_table?: TableState;
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
 * Install datascience and table_tracer packages
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
    await pyodide.runPythonAsync(INLINE_TRACER_CODE);
    console.log('✓ Inline tracer loaded');
    
    // Test tracer
    await pyodide.runPythonAsync(`
print("Testing tracer...")
enable()
print("✓ Tracer enabled and ready")
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

