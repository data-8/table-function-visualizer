# datascience Table Tutor

A browser-based visualizer for UC Berkeley's `datascience` library (the Data 8 Table API). Run Python code with Table operations entirely in your browser, with step-by-step visual explanations of what each operation does.

Inspired by [PandasTutor](https://pandastutor.com/).

## Features

- **Examples Gallery**: 13+ pre-built examples with visual cards
- **Split Interface**: Code editor on left, visualization on right
- **Step-by-Step Slideshow**: Navigate through operations with arrows
- **Browser-based Python**: Full Python runtime via Pyodide (no server needed)
- **Operation Tracing**: See every Table operation with before/after views
- **Smart Explanations**: Human-readable descriptions for each operation
- **Permalink Sharing**: Share code via URL
- **Export**: Download trace data as JSON
- **Offline Support**: Service worker caches assets after first load
- **Error Help**: Helpful error messages with troubleshooting tips
- **Dark Theme**: Clean, accessible interface
- **Keyboard Shortcuts**: Cmd/Ctrl + Enter to run code

## Quick Start

### Prerequisites

- Node.js v18 or higher ([download here](https://nodejs.org/))

### Run Locally

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Supported Operations

### Basic Operations
- `select(*columns)` - Choose specific columns
- `drop(*columns)` - Remove columns
- `with_column(label, values)` - Add a single column
- `with_columns(*args)` - Add multiple columns
- `take(n)` - Select first n rows

### Filtering and Sorting
- `where(column, value)` - Filter rows
- `sort(column, descending=False)` - Sort rows

### Aggregation
- `group(column, function)` - Group and aggregate
- `pivot(columns, rows, values, function)` - Reshape data

### Joining
- `join(join_column, other_table)` - Combine tables

## How to Use

1. **Load Examples**: Click "Examples" to browse pre-built visualizations
2. **Write Code**: Type or paste Python code in the editor
3. **Run**: Click "Run" or press Cmd/Ctrl + Enter
4. **Navigate**: Use arrows to step through the visualization
5. **Share**: Click "Share" to copy a permalink URL
6. **Export**: Click "Export" to download trace as JSON

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Complete guide for students
- [Teacher Guide](docs/TEACHER_GUIDE.md) - Classroom use and best practices
- [Setup Guide](SETUP.md) - Installation and troubleshooting
- [Development Guide](apps/web/DEVELOPMENT.md) - Developer documentation
- [Project Plan](context.md) - Full roadmap and architecture

## Architecture

```
┌─────────────────┐
│   React + Vite  │  Modern, fast frontend
├─────────────────┤
│     Pyodide     │  Python → WebAssembly
├─────────────────┤
│  datascience    │  Data 8 Table API
├─────────────────┤
│ table_tracer    │  Operation instrumentation
└─────────────────┘
```

Everything runs client-side - no server needed.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Editor**: Monaco Editor (VS Code editor)
- **Python Runtime**: Pyodide (Python 3.11 in WebAssembly)
- **Styling**: Modern CSS with dark theme

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript and WebAssembly support.

## Repository Structure

```
table-function-visualizer/
├── apps/web/               # Main web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/            # Pyodide integration
│   │   └── App.tsx         # Main app
│   ├── public/             # Static assets
│   │   └── sw.js           # Service worker
│   └── package.json
├── docs/                   # User and teacher guides
│   ├── USER_GUIDE.md
│   └── TEACHER_GUIDE.md
├── SETUP.md                # Setup instructions
└── context.md              # Project plan
```

## Contributing

Contributions welcome! This is an educational project for Data 8 students and instructors.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

See [LICENSE](LICENSE) file.

## Credits

- **PandasTutor** for design inspiration
- **UC Berkeley Data 8** for the `datascience` library
- **Pyodide** team for Python in the browser
- **Monaco Editor** for the code editor

## Inspiration

This project brings the visual step-by-step approach pioneered by [PandasTutor](https://pandastutor.com/) to UC Berkeley's Data 8 `datascience` library. Special thanks to the PandasTutor team for showing how powerful visual explanations can be for teaching data operations.
