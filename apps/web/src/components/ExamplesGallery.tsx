import { useState } from 'react';
import { examples, categories, type Example } from '../lib/examples';
import './ExamplesGallery.css';

interface ExamplesGalleryProps {
  onSelectExample: (example: Example) => void;
  onClose: () => void;
}

export default function ExamplesGallery({ onSelectExample, onClose }: ExamplesGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredExamples = selectedCategory === 'all' 
    ? examples 
    : examples.filter(ex => ex.category === selectedCategory);

  return (
    <div className="gallery-overlay">
      <div className="gallery-modal">
        <div className="gallery-header">
          <div>
            <h1>Table Operation Examples</h1>
            <p>Select an example to see how Table operations transform data step-by-step</p>
            <p className="inspiration">Inspired by <a href="https://pandastutor.com/" target="_blank" rel="noopener noreferrer">PandasTutor</a></p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="category-filter">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All Examples
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={selectedCategory === cat.id ? 'active' : ''}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="examples-grid">
          {filteredExamples.map(example => (
            <button
              type="button"
              key={example.id}
              className="example-card"
              onClick={() => {
                onSelectExample(example);
                onClose();
              }}
            >
              <div className="example-thumbnail">
                <div className="operation-badges">
                  {example.operations.map(op => (
                    <span key={op} className="operation-badge">{op}</span>
                  ))}
                </div>
              </div>
              <div className="example-info">
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <div className="example-category">{
                  categories.find(c => c.id === example.category)?.name
                }</div>
              </div>
            </button>
          ))}
        </div>

        <div className="gallery-footer">
          <button className="secondary-button" onClick={onClose}>
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
}

