import { useEffect, useState } from 'react';
import { Editor } from './ui/components/Editor';
import { useDocumentStore } from './store/documentStore';
import './App.css';

function App() {
  const { loadDocument, document } = useDocumentStore();
  const [jsonInput, setJsonInput] = useState('');
  const [showLoader, setShowLoader] = useState(true);

  // Load sample JSON IR on mount
  useEffect(() => {
    // Load a sample JSON IR file from the examples
    fetch('/sample.json')
      .then(res => res.json())
      .then(data => {
        loadDocument(data);
        setShowLoader(false);
      })
      .catch(err => {
        console.error('Failed to load sample:', err);
        setShowLoader(false);
      });
  }, [loadDocument]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        loadDocument(json);
      } catch (error) {
        alert('Invalid JSON file');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonSubmit = () => {
    try {
      const json = JSON.parse(jsonInput);
      loadDocument(json);
      setJsonInput('');
    } catch (error) {
      alert('Invalid JSON');
      console.error(error);
    }
  };

  if (showLoader && !document) {
    return (
      <div className="app-loading">
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading Path Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!document ? (
        <div className="app-welcome">
          <div className="welcome-card">
            <h1>Minimact Path Editor</h1>
            <p>Edit JSON IR using path-based breadcrumb navigation</p>

            <div className="upload-section">
              <h3>Load JSON IR File</h3>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input"
              />
            </div>

            <div className="paste-section">
              <h3>Or Paste JSON</h3>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste JSON IR here..."
                className="json-textarea"
                rows={10}
              />
              <button onClick={handleJsonSubmit} className="submit-button">
                Load JSON
              </button>
            </div>

            <div className="features">
              <h3>Features</h3>
              <ul>
                <li>🔍 Visual path-based navigation</li>
                <li>⌨️ Full keyboard support</li>
                <li>↩️ Undo/Redo</li>
                <li>🔥 Hot reload integration (coming soon)</li>
                <li>🌳 Tree view (coming soon)</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <Editor />
      )}
    </div>
  );
}

export default App;
