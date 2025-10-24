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
  const [currentInteraction, setCurrentInteraction] = useState<InteractionResponse | null>(null);

  // Render HTML in iframe when it changes
  useEffect(() => {
    console.log('Preview useEffect - html length:', html?.length);
    console.log('Preview useEffect - html preview:', html?.substring(0, 200));

    if (!html) {
      console.log('Preview useEffect - no html');
      return;
    }

    // Wait for iframe to be ready
    const iframe = iframeRef.current;
    if (!iframe) {
      console.log('Preview useEffect - no iframe ref');
      return;
    }

    const writeContent = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        console.log('Preview useEffect - no contentDocument');
        return;
      }

      // Write HTML directly (backend returns full HTML document)
      console.log('Writing HTML to iframe...');
      doc.open();
      doc.write(html);
      doc.close();
      console.log('HTML written to iframe');
    };

    // If iframe is already loaded, write immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      writeContent();
    } else {
      // Otherwise wait for iframe to load
      iframe.addEventListener('load', writeContent, { once: true });
      return () => iframe.removeEventListener('load', writeContent);
    }
  }, [html]);

  // Listen for postMessage events from iframe (cache hit/miss notifications)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle Minimact prediction events
      if (event.data.type === 'minimact:cache-hit' || event.data.type === 'minimact:cache-miss') {
        // Convert to InteractionResponse format
        const interaction: InteractionResponse = {
          cacheHit: event.data.data.cacheHit,
          elapsedMs: event.data.data.elapsedMs,
          predictionConfidence: event.data.data.confidence || 0,
          latency: event.data.data.cacheHit ? 'cached' : 'computed',
          actualPatches: event.data.data.actualPatches || [],
          predictedPatches: event.data.data.predictedPatches,
          html: event.data.data.html || ''
        };

        setCurrentInteraction(interaction);
        setShowOverlay(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Attach event handlers separately when iframe content changes
  useEffect(() => {
    if (!html || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const setupHandlers = () => {
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
    };

    // Setup handlers after a small delay to ensure content is rendered
    const timer = setTimeout(setupHandlers, 100);
    return () => clearTimeout(timer);
  }, [html, onInteraction]);

  // Show overlay on interaction (from props - legacy support)
  useEffect(() => {
    if (lastInteraction) {
      setCurrentInteraction(lastInteraction);
      setShowOverlay(true);
    }
  }, [lastInteraction]);

  // Auto-hide overlay after 2 seconds
  useEffect(() => {
    if (showOverlay) {
      const timer = setTimeout(() => setShowOverlay(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showOverlay]);

  return (
    <div className="flex flex-col h-full gap-2 relative">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 rounded-t-lg">
        <h2 className="text-lg font-semibold text-slate-100">Live Preview</h2>
      </div>

      {/* Content */}
      <div className="flex-1 relative rounded-b-lg overflow-hidden border border-slate-700 bg-white">
        {/* Always render iframe so ref is available */}
        <iframe
          ref={iframeRef}
          title="preview"
          className={`w-full h-full border-none ${!html || error || isLoading ? 'hidden' : ''}`}
          sandbox="allow-scripts allow-same-origin"
        />

        {/* Overlays */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-gray-600 text-sm mt-2">{error}</p>
            </div>
          </div>
        )}

        {!error && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Compiling...</p>
            </div>
          </div>
        )}

        {!error && !isLoading && !html && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">👈</p>
              <p>Write code and click "Run Full Demo" to see preview</p>
            </div>
          </div>
        )}

        {showOverlay && currentInteraction && (
          <PredictionOverlay interaction={currentInteraction} />
        )}
      </div>
    </div>
  );
}
