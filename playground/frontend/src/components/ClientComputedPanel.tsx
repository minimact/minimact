import { useEffect, useState } from 'react';
import { clientComputationService, type ClientComputedVariable } from '../services/clientComputation';

interface ClientComputedPanelProps {
  sessionId: string | null;
}

export function ClientComputedPanel({ sessionId }: ClientComputedPanelProps) {
  const [metadata, setMetadata] = useState<ClientComputedVariable[]>([]);
  const [computedValues, setComputedValues] = useState<Record<string, any>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Update when session changes
  useEffect(() => {
    if (!sessionId) {
      setMetadata([]);
      setComputedValues({});
      setIsVisible(false);
      return;
    }

    const meta = clientComputationService.getMetadata();
    const values = clientComputationService.getComputedValues();

    setMetadata(meta);
    setComputedValues(values);
    setIsVisible(meta.length > 0);

    console.log('[ClientComputedPanel] Updated', { meta, values });
  }, [sessionId]);

  // Poll for updates every 500ms (in a real app, we'd use events)
  useEffect(() => {
    if (!sessionId || !isVisible) return;

    const interval = setInterval(() => {
      const values = clientComputationService.getComputedValues();
      setComputedValues(values);
    }, 500);

    return () => clearInterval(interval);
  }, [sessionId, isVisible]);

  if (!isVisible || metadata.length === 0) {
    return null;
  }

  /**
   * Format a computed value for display
   */
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  /**
   * Get library badge for a variable
   */
  const getLibraryBadge = (varName: string): string => {
    // Infer library from variable name
    if (['sortedItems', 'totalPrice', 'avgPrice', 'cheapestItem', 'expensiveItems'].includes(varName)) {
      return '✨ lodash';
    }
    if (varName === 'formatDate') {
      return '✨ moment';
    }
    return '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span>🧮</span>
          <span>Client-Computed Variables</span>
          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
            {metadata.length}
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Computed in browser with external libraries
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {metadata.map((variable) => {
          const value = computedValues[variable.name];
          const hasValue = value !== undefined;
          const libraryBadge = getLibraryBadge(variable.name);

          return (
            <div
              key={variable.name}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors"
            >
              {/* Variable name and status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasValue ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    ></span>
                    <code className="text-sm font-mono text-blue-400">{variable.name}</code>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{variable.type}</div>
                </div>
                {libraryBadge && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full whitespace-nowrap">
                    {libraryBadge}
                  </span>
                )}
              </div>

              {/* Value */}
              {hasValue ? (
                <div className="bg-slate-900 border border-slate-700 rounded p-2 mt-2">
                  <div className="text-xs text-slate-400 mb-1">Value:</div>
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                    {formatValue(value)}
                  </pre>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-2">
                  Computing...
                </div>
              )}

              {/* Dependencies (if any) */}
              {variable.dependencies && variable.dependencies.length > 0 && (
                <div className="text-xs text-slate-500 mt-2">
                  <span className="font-semibold">Dependencies:</span>{' '}
                  {variable.dependencies.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>Session: {sessionId?.substring(0, 8)}...</span>
          <span className="text-green-400">● Live</span>
        </div>
      </div>
    </div>
  );
}
