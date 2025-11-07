import { useState } from 'react';
import CodeEditor from './CodeEditor';
import './NotebookCell.css';

interface NotebookCellProps {
  cellIndex: number;
  code: string;
  onChange: (code: string) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  isLast?: boolean;
  onAddCell?: () => void;
}

export default function NotebookCell({
  cellIndex,
  code,
  onChange,
  onDelete,
  readOnly = false,
  isLast = false,
  onAddCell,
}: NotebookCellProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`notebook-cell ${isFocused ? 'focused' : ''}`}>
      <div className="cell-toolbar">
        <span className="cell-label">In [1]:</span>
      </div>
      
      <div 
        className="cell-editor"
        onMouseEnter={() => setIsFocused(true)}
        onMouseLeave={() => setIsFocused(false)}
      >
        <CodeEditor
          code={code}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

