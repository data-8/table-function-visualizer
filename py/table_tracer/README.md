# Table Tracer

Instrumentation layer for `datascience.Table` operations.

## Overview

This package monkey-patches the `datascience.Table` class to capture:
- Method calls and arguments
- Input table state (schema, sample rows)
- Output table state
- Operation metadata for visualization

## Usage

```python
import table_tracer

# Enable tracing
table_tracer.enable()

# Use datascience.Table as normal
from datascience import Table
table = Table().with_columns('x', [1, 2, 3], 'y', [4, 5, 6])
result = table.select('x')

# Get captured trace
trace = table_tracer.get_trace()
print(trace)  # List of operation records
```

## Trace Format

Each operation creates a trace record:

```json
{
  "step_id": 1,
  "operation": "select",
  "args": ["x"],
  "kwargs": {},
  "input": {
    "num_rows": 3,
    "columns": ["x", "y"],
    "preview": [[1, 4], [2, 5], [3, 6]]
  },
  "output": {
    "num_rows": 3,
    "columns": ["x"],
    "preview": [[1], [2], [3]]
  },
  "explanation": "Selected 1 of 2 columns: x"
}
```

## Supported Operations

Phase 1 (Milestone 2):
- `select`
- `with_column` / `with_columns`
- `drop`
- `where`
- `sort`
- `take`
- `group`
- `join`

## Development

Build wheel:
```bash
python -m build
```

Output: `dist/table_tracer-0.1.0-py3-none-any.whl`

