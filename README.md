# datascience Table Tutor

A notebook in the browser for UC Berkeley's `datascience` library (the Data 8 `Table` API), with a step-by-step visualization of every table operation you run. Write code in Jupyter-style cells, then watch `where`, `group`, `join`, `apply` and the rest transform the table one row, group, or draw at a time.

**Live:** https://data-8.github.io/table-function-visualizer/

Everything runs in the browser (Python via Pyodide); there is no server. Inspired by [Python Tutor](https://pythontutor.com/) and [PandasTutor](https://pandastutor.com/).

## What it does

**A notebook.** Markdown and code cells with the Jupyter keys: `Shift+Enter`, `Ctrl/⌘+Enter`, `Esc`/`Enter` for command and edit mode, `a`/`b`, `d d`, `m`/`y`, `z`, `x`/`c`/`v`, `Shift+M` (merge), `Ctrl+Shift+-` (split), `Ctrl+Shift+↑/↓` (move), `0 0` (restart). Tab completion for the `datascience` API. A cell's last expression is shown beneath it, plots included (`t.scatter`, `t.hist`, `t.barh` draw inline like `%matplotlib inline`).

**A visualization.** *Run all & visualize* runs the notebook and shows each `Table` operation as before/after tables, with walkthrough frames where the operation has moving parts: rows kept and struck through by `where`, groups collapsing under `group`, keys matching in `join`, one frame per row for `apply`, each draw of `sample`. The step names the variable it assigns (`cs_students = where()`) and highlights the statement in the notebook. *Visualize* alone shows whatever cells you have run so far.

**Predict mode** hides each result until you guess its size. **Present** shows the visualization full-window for lecturing.

**Sharing and files.** *Share* copies a permanent link that reproduces the notebook (compressed into the URL). The *File* menu opens and saves `.ipynb` (nbformat 4.5, outputs included) and exports the visualization as a PDF or a zip of PNGs, one per step, for slides.

**Examples.** A gallery of small notebooks in the course's own datasets (cones, NBA salaries, top movies, skyscrapers, United flights, the baby study, Galton's heights). They live in [`apps/web/src/data/examples.json`](apps/web/src/data/examples.json); see the [README there](apps/web/src/data/README.md) to add one without touching code.

**Links.** `?example=filter-rows` opens a gallery example by id. `?embed=1` hides the chrome and makes cells read-only, for iframes in a textbook or course site.

## Traced operations

`select`, `drop`, `with_column`, `with_columns`, `with_row`, `with_rows`, `where`, `sort`, `group`, `pivot`, `join`, `take`, `column`, `apply`, `sample`, `shuffle`, `split`.

Only calls made from the cell are recorded (not the library's internal ones), and a run records at most 200 operations so simulation loops stay bounded. Plotting methods are not traced; their figures appear under the cell.

## Run it locally

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173. The first load fetches Pyodide and `datascience` (about 45 MB); a service worker caches them for later visits.

## Test

```bash
cd apps/web
npm run check        # lint + unit tests + tracer tests
```

The tracer tests run the Python tracer under CPython and need `datascience` installed: `pip install -r requirements-test.txt`, or point at a Python that has it with `PYTHON=/path/to/python npm run check`. CI runs the same command before every deploy.

## How it works

```
React + Vite            notebook UI, visualization, exports
  └─ Monaco             bundled code editor (plain textarea fallback on old browsers)
  └─ Pyodide            Python 3.12 in WebAssembly, in the page
       └─ datascience   pinned to 0.18.1
       └─ tracer.py     patches Table methods; records inputs, outputs and walkthrough frames
```

The tracer ([`apps/web/src/lib/tracer.py`](apps/web/src/lib/tracer.py)) wraps the `Table` methods above. Each call records the table before and after, an explanation, and for operations with moving parts a list of sub-steps (highlights and intermediate result states) that the frontend plays as frames. [`TABLE_VISUALIZATION_LOGIC.md`](TABLE_VISUALIZATION_LOGIC.md) describes the group and pivot walkthroughs in detail.

## Repository layout

```
apps/web/
  src/App.tsx                 notebook state, kernel control, sharing, exports
  src/components/             NotebookCells, StepSlideshow, DataTransformation, ...
  src/lib/tracer.py           the Python tracer (+ tracer_test.py)
  src/lib/pyodide.ts          Pyodide setup and the cell runner
  src/lib/completions.ts      Tab completion data (from the datascience API)
  src/lib/ipynb.ts, share.ts  .ipynb import/export, compressed share links
  src/data/examples.json      the example gallery
  public/sw.js                service worker (app cache per build, Pyodide cache per version)
.github/workflows/deploy.yml  test + build + deploy to GitHub Pages
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages through the workflow above; see [DEPLOYMENT.md](DEPLOYMENT.md). [SETUP.md](SETUP.md) has more on local setup and troubleshooting.

## Browser support

Current Chrome, Edge, Firefox and Safari, on desktop and phones. Older browsers that cannot load the code editor get a plain text editor instead and everything else still works. WebAssembly is required for Python.

## License

See [LICENSE](LICENSE).

## Credits

- **UC Berkeley Data 8** for the `datascience` library and the course materials the examples are modelled on
- **Python Tutor** and **PandasTutor** for showing what a step-by-step view can do for teaching
- **Pyodide** for Python in the browser
- **Monaco Editor** for the code editor
