import type { NotebookCell } from '../components/NotebookCells';

/**
 * Serialize the notebook as Jupyter nbformat 4.5 (https://nbformat.readthedocs.io).
 * Cell outputs are included so the file opens with results in place, like a saved notebook.
 */

/** nbformat splits multi-line text into a list of lines, each keeping its trailing newline */
function toLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line)).filter((l, i, a) => !(i === a.length - 1 && l === ''));
}

/** Cell ids must match ^[a-zA-Z0-9-_]+$ and be at most 64 characters (nbformat 4.5) */
export function toNbformatId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9\-_]/g, '-').slice(0, 64);
  return cleaned.length > 0 ? cleaned : 'cell';
}

interface NbOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  [key: string]: unknown;
}

function cellOutputs(cell: NotebookCell): NbOutput[] {
  const out = cell.output;
  if (!out) return [];
  const outputs: NbOutput[] = [];
  if (out.stdout) {
    outputs.push({ output_type: 'stream', name: 'stdout', text: toLines(out.stdout) });
  }
  if (out.stderr) {
    outputs.push({ output_type: 'stream', name: 'stderr', text: toLines(out.stderr) });
  }
  for (const image of out.images ?? []) {
    outputs.push({
      output_type: 'display_data',
      data: { 'image/png': image.png },
      metadata: { 'image/png': { width: image.width } },
    });
  }
  if (out.result !== undefined) {
    outputs.push({
      output_type: 'execute_result',
      execution_count: cell.execCount ?? null,
      data: { 'text/plain': toLines(out.result) },
      metadata: {},
    });
  }
  if (out.error) {
    const lines = out.error.replace(/\n$/, '').split('\n');
    const last = lines[lines.length - 1] ?? '';
    const sep = last.indexOf(': ');
    outputs.push({
      output_type: 'error',
      ename: sep === -1 ? last : last.slice(0, sep),
      evalue: sep === -1 ? '' : last.slice(sep + 2),
      traceback: lines,
    });
  }
  return outputs;
}

export function buildIpynb(cells: NotebookCell[]): Record<string, unknown> {
  const usedIds = new Set<string>();
  const uniqueId = (raw: string) => {
    let id = toNbformatId(raw);
    let n = 1;
    while (usedIds.has(id)) id = `${toNbformatId(raw).slice(0, 60)}-${n++}`;
    usedIds.add(id);
    return id;
  };

  return {
    cells: cells.map(cell =>
      cell.type === 'markdown'
        ? {
            cell_type: 'markdown',
            id: uniqueId(cell.id),
            metadata: {},
            source: toLines(cell.source),
          }
        : {
            cell_type: 'code',
            id: uniqueId(cell.id),
            metadata: {},
            execution_count: cell.execCount ?? null,
            outputs: cellOutputs(cell),
            source: toLines(cell.source),
          }
    ),
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

export function ipynbToJson(cells: NotebookCell[]): string {
  return JSON.stringify(buildIpynb(cells), null, 1) + '\n';
}
