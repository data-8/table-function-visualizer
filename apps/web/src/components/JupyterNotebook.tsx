import { useState, useEffect } from 'react';
import NotebookCell from './NotebookCell';
import './JupyterNotebook.css';

interface Cell {
  id: string;
  code: string;
}

interface JupyterNotebookProps {
  initialCode: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

// Create a single cell with all the code
function createSingleCell(code: string): Cell[] {
  return [{ id: `cell-${Date.now()}`, code: code || '' }];
}

export default function JupyterNotebook({ initialCode, onChange, readOnly = false }: JupyterNotebookProps) {
  const [cells, setCells] = useState<Cell[]>(() => createSingleCell(initialCode));

  // Update when initialCode changes (example selection)
  useEffect(() => {
    setCells(createSingleCell(initialCode));
  }, [initialCode]);

  const handleCellChange = (cellId: string, newCode: string) => {
    // Update cell immediately
    setCells(prevCells => 
      prevCells.map(cell => 
        cell.id === cellId ? { ...cell, code: newCode } : cell
      )
    );
    
    // Update parent immediately
    onChange(newCode);
  };

  // Simplified - no add/delete for single cell notebook
  const addCell = () => {
    // Future: add multi-cell support
  };

  const deleteCell = () => {
    // Future: add multi-cell support
  };

  return (
    <div className="jupyter-notebook">
      <div className="notebook-header">
        <div className="notebook-info">
          <span className="notebook-icon">📓</span>
          <span className="notebook-name">Code Notebook</span>
        </div>
        <div className="notebook-hint">
          Press ▶ Run or ⌘↵ to execute
        </div>
      </div>

      <div className="notebook-cells">
        {cells.map((cell, index) => (
          <NotebookCell
            key={cell.id}
            cellIndex={1}
            code={cell.code}
            onChange={(newCode) => handleCellChange(cell.id, newCode)}
            readOnly={readOnly}
            isLast={true}
          />
        ))}
      </div>
    </div>
  );
}

