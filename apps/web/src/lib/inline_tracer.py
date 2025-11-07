"""
Inline table tracer - injected directly into Pyodide
No wheel file needed!
"""

_trace_enabled = False
_trace_log = []
_step_counter = 0
_original_methods = {}

def enable():
    """Enable Table operation tracing"""
    global _trace_enabled
    if _trace_enabled:
        return
    _trace_enabled = True
    _patch_table_methods()

def disable():
    """Disable Table operation tracing"""
    global _trace_enabled
    _trace_enabled = False

def get_trace():
    """Get the current trace log"""
    return _trace_log.copy()

def clear_trace():
    """Clear the trace log"""
    global _trace_log, _step_counter
    _trace_log = []
    _step_counter = 0

def _capture_table_state(table, max_rows=20):
    """Capture the current state of a Table"""
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
        return {
            "error": str(e),
            "num_rows": 0,
            "num_columns": 0,
            "columns": [],
            "preview": [],
        }

def _make_explanation(operation, args, kwargs, input_state, output_state):
    """Generate human-readable explanation"""
    if operation == "select":
        selected = list(args) if args else []
        total = input_state.get("num_columns", 0)
        if len(selected) == 1:
            return f"Selected 1 of {total} columns: {selected[0]}"
        return f"Selected {len(selected)} of {total} columns: {', '.join(str(s) for s in selected)}"
    
    elif operation == "drop":
        dropped = list(args) if args else []
        remaining = output_state.get("num_columns", 0)
        if len(dropped) == 1:
            return f"Dropped 1 column: {dropped[0]}. {remaining} columns remain."
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
        descending = kwargs.get("descending", False)
        direction = "descending" if descending else "ascending"
        return f"Sorted by '{col}' ({direction})."
    
    elif operation == "take":
        return f"Selected specific rows by index."
    
    elif operation == "group":
        col = args[0] if args else "?"
        num_groups = output_state.get("num_rows", 0)
        return f"Grouped by '{col}'. Created {num_groups} groups."
    
    elif operation == "join":
        col = args[0] if args else "?"
        out_rows = output_state.get("num_rows", 0)
        return f"Joined tables on '{col}'. Result: {out_rows} rows."
    
    else:
        return f"Applied {operation}. Result: {output_state.get('num_rows', 0)} rows."

def _serialize_args(args):
    """Convert to JSON-serializable"""
    if isinstance(args, dict):
        return {k: _serialize_args(v) for k, v in args.items()}
    elif isinstance(args, (list, tuple)):
        return [_serialize_args(item) for item in args]
    elif hasattr(args, 'tolist'):
        return args.tolist()
    elif hasattr(args, 'item'):
        return args.item()
    elif callable(args):
        return f"<function>"
    elif isinstance(args, (str, int, float, bool, type(None))):
        return args
    else:
        return str(args)

def _trace_operation(operation_name):
    """Decorator to trace a Table operation"""
    def decorator(original_method):
        def wrapper(self, *args, **kwargs):
            global _step_counter
            
            input_state = _capture_table_state(self)
            result = original_method(self, *args, **kwargs)
            output_state = {}
            
            if hasattr(result, 'labels') and hasattr(result, 'num_rows'):
                output_state = _capture_table_state(result)
            
            explanation = _make_explanation(
                operation_name, args, kwargs, input_state, output_state
            )
            
            if _trace_enabled:
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
                _trace_log.append(trace_record)
            
            return result
        
        return wrapper
    return decorator

def _patch_table_methods():
    """Monkey-patch Table methods"""
    try:
        from datascience import Table
    except ImportError:
        print("⚠️ Warning: datascience library not found")
        return
    
    operations = ["select", "drop", "with_column", "with_columns", "where", "sort", "take", "group", "join"]
    
    for op_name in operations:
        if hasattr(Table, op_name):
            original = getattr(Table, op_name)
            if op_name not in _original_methods:
                _original_methods[op_name] = original
            traced = _trace_operation(op_name)(original)
            setattr(Table, op_name, traced)
    
    print("✓ Table methods patched for tracing")

