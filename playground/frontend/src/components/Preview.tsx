import { useRef, useEffect, useState } from 'react';
import { PredictionOverlay } from './PredictionOverlay';
import type { InteractionResponse } from '../types/playground';

interface PreviewProps {
  html: string;
  isLoading?: boolean;
  error?: string | null;
  lastInteraction?: InteractionResponse | null;
  onInteraction?: (eventType: string, elementId: string) => void;
}

export function Preview({
  html,
  isLoading = false,
  error = null,
  lastInteraction = null,
  onInteraction,
}: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Render HTML in iframe when it changes
  useEffect(() => {
    if (!iframeRef.current || !html) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Write HTML
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            line-height: 1.5;
          }
          button {
            padding: 8px 16px;
            margin: 0 4px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
          }
          button:hover {
            background: #0052a3;
          }
          input {
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            margin: 0 4px;
          }
          .counter, .todo-list, .form-example {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          h1, h2, h3 {
            margin-bottom: 16px;
          }
          p {
            margin: 8px 0;
          }
          ul {
            margin-left: 20px;
          }
          li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div id="root">
          ${html}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Attach click handlers
    const buttons = doc.querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.textContent || 'button';
        onInteraction?.('click', btn.id || text);
      });
    });

    const inputs = doc.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        onInteraction?.('change', input.id || 'input');
      });
      input.addEventListener('input', () => {
        onInteraction?.('input', input.id || 'input');
      });
    });
  }, [html, onInteraction]);

  // Show overlay on interaction
  useEffect(() => {
    if (lastInteraction) {
      setShowOverlay(true);
      const timer = setTimeout(() => setShowOverlay(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastInteraction]);

  return (
    <div className="flex flex-col h-full gap-2 relative">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 rounded-t-lg">
        <h2 className="text-lg font-semibold text-slate-100">Live Preview</h2>
      </div>

      {/* Content */}
      <div className="flex-1 relative rounded-b-lg overflow-hidden border border-slate-700 bg-white">
        {error ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-gray-600 text-sm mt-2">{error}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Compiling...</p>
            </div>
          </div>
        ) : html ? (
          <>
            <iframe
              ref={iframeRef}
              title="preview"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin"
            />
            {showOverlay && lastInteraction && (
              <PredictionOverlay interaction={lastInteraction} />
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">👈</p>
              <p>Write code and click "Run Full Demo" to see preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
