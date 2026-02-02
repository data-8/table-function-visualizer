"""
Core tracing functionality for datascience.Table operations
"""

import json
from typing import Any, Dict, List, Optional, Callable
from functools import wraps

# Global state
_trace_enabled = False
_trace_log: List[Dict[str, Any]] = []
_step_counter = 0
_original_methods: Dict[str, Callable] = {}


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
    if not _trace_enabled:
        return
    
    _trace_enabled = False
    _unpatch_table_methods()


def is_enabled() -> bool:
    """Check if tracing is enabled"""
    return _trace_enabled


def get_trace() -> List[Dict[str, Any]]:
    """Get the current trace log"""
    return _trace_log.copy()


def clear_trace():
    """Clear the trace log"""
    global _trace_log, _step_counter
    _trace_log = []
    _step_counter = 0


def _capture_table_state(table, max_rows: int = 20) -> Dict[str, Any]:
    """Capture the current state of a Table"""
    try:
        num_rows = table.num_rows
        columns = list(table.labels)
        
        # Capture preview data (first N rows)
        preview_rows = min(num_rows, max_rows)
        preview_data = []
        
        if preview_rows > 0:
            for i in range(preview_rows):
                row = []
                for col in columns:
                    try:
                        value = table[col][i]
                        # Convert to JSON-serializable types
                        if hasattr(value, 'item'):  # numpy types
                            value = value.item()
                        row.append(value)
                    except Exception:
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


def _make_explanation(operation: str, args: tuple, kwargs: dict, 
                     input_state: Dict, output_state: Dict) -> str:
    """Generate human-readable explanation for an operation"""
    
    if operation == "select":
        selected = list(args) if args else []
        total = input_state.get("num_columns", 0)
        if len(selected) == 1:
            return f"Selected 1 of {total} columns: {selected[0]}"
        return f"Selected {len(selected)} of {total} columns: {', '.join(selected)}"
    
    elif operation == "drop":
        dropped = list(args) if args else []
        total = input_state.get("num_columns", 0)
        remaining = output_state.get("num_columns", 0)
        if len(dropped) == 1:
            return f"Dropped 1 column: {dropped[0]}. {remaining} columns remain."
        return f"Dropped {len(dropped)} columns: {', '.join(dropped)}. {remaining} remain."
    
    elif operation == "with_column":
        col_name = args[0] if args else "?"
        return f"Added column '{col_name}'. Now {output_state.get('num_columns', 0)} columns."
    
    elif operation == "with_columns":
        num_added = len(args) // 2 if args else 0
        return f"Added {num_added} columns. Now {output_state.get('num_columns', 0)} columns."
    
    elif operation == "where":
        removed = input_state.get("num_rows", 0) - output_state.get("num_rows", 0)
        kept = output_state.get("num_rows", 0)
        return f"Filtered by condition. Kept {kept} rows, removed {removed}."
    
    elif operation == "sort":
        col = args[0] if args else "?"
        descending = kwargs.get("descending", False)
        direction = "descending" if descending else "ascending"
        return f"Sorted by '{col}' ({direction}). {output_state.get('num_rows', 0)} rows."
    
    elif operation == "take":
        indices = args[0] if args else []
        if hasattr(indices, '__len__'):
            return f"Selected {len(indices)} rows by index."
        return f"Selected rows by index."
    
    elif operation == "group":
        col = args[0] if args else "?"
        num_groups = output_state.get("num_rows", 0)
        return f"Grouped by '{col}'. Created {num_groups} groups."
    
    elif operation == "join":
        col = args[0] if args else "?"
        in_rows = input_state.get("num_rows", 0)
        out_rows = output_state.get("num_rows", 0)
        return f"Joined on '{col}'. Result has {out_rows} rows."

    elif operation == "pivot":
        pivot_col = args[0] if args else "?"
        rows_col = args[1] if len(args) > 1 else "?"
        return f"Pivoted: '{pivot_col}' as columns, '{rows_col}' as rows."

    else:
        return f"Applied {operation}. Result: {output_state.get('num_rows', 0)} rows × {output_state.get('num_columns', 0)} columns."


def _trace_operation(operation_name: str):
    """Decorator to trace a Table operation"""
    def decorator(original_method: Callable) -> Callable:
        @wraps(original_method)
        def wrapper(self, *args, **kwargs):
            global _step_counter
            
            # Capture input state
            input_state = _capture_table_state(self)
            
            # For join: capture other (right) table before calling
            other_table_state = None
            if operation_name == "join" and len(args) >= 2:
                other = args[1]
                if hasattr(other, 'labels') and hasattr(other, 'num_rows'):
                    other_table_state = _capture_table_state(other)
            
            # Call original method
            result = original_method(self, *args, **kwargs)
            
            # Capture output state (if result is a Table)
            output_state = {}
            if hasattr(result, 'labels') and hasattr(result, 'num_rows'):
                output_state = _capture_table_state(result)
            
            # Generate explanation
            explanation = _make_explanation(
                operation_name, args, kwargs, input_state, output_state
            )
            
            # Record trace
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
                if other_table_state is not None:
                    trace_record["other_table"] = other_table_state
                _trace_log.append(trace_record)
            
            return result
        
        return wrapper
    return decorator


def _serialize_args(args) -> Any:
    """Convert arguments to JSON-serializable format"""
    if isinstance(args, dict):
        return {k: _serialize_args(v) for k, v in args.items()}
    elif isinstance(args, (list, tuple)):
        return [_serialize_args(item) for item in args]
    elif hasattr(args, 'tolist'):  # numpy array
        return args.tolist()
    elif hasattr(args, 'item'):  # numpy scalar
        return args.item()
    elif callable(args):
        return f"<function {getattr(args, '__name__', 'anonymous')}>"
    elif isinstance(args, (str, int, float, bool, type(None))):
        return args
    else:
        return str(args)


def _patch_table_methods():
    """Monkey-patch Table methods to enable tracing"""
    try:
        from datascience import Table
    except ImportError:
        print("Warning: datascience library not found. Tracing will not work.")
        return
    
    # Operations to trace
    operations = [
        "select",
        "drop",
        "with_column",
        "with_columns",
        "where",
        "sort",
        "take",
        "group",
        "join",
        "pivot",
    ]
    
    for op_name in operations:
        if hasattr(Table, op_name):
            original = getattr(Table, op_name)
            if op_name not in _original_methods:
                _original_methods[op_name] = original
            traced = _trace_operation(op_name)(original)
            setattr(Table, op_name, traced)


def _unpatch_table_methods():
    """Restore original Table methods"""
    try:
        from datascience import Table
    except ImportError:
        return
    
    for op_name, original_method in _original_methods.items():
        if hasattr(Table, op_name):
            setattr(Table, op_name, original_method)
    
    _original_methods.clear()

