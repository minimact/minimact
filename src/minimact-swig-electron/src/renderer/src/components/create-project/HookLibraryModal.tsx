import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Info, X, BookOpen } from 'lucide-react';

interface Hook {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'communication' | 'tasks' | 'advanced' | 'mvc' | 'punch' | 'query' | 'trees' | 'quantum' | 'charts';
  packageName?: string;
  example: string;
  isDefault: boolean;
}

interface HookLibraryModalProps {
  selectedHooks: string[];
  onSelectionChange: (hookIds: string[]) => void;
  hooks: Hook[];
  isOpen: boolean;
  onClose: () => void;
}

export function HookLibraryModal({
  selectedHooks,
  onSelectionChange,
  hooks,
  isOpen,
  onClose
}: HookLibraryModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['core']) // Core expanded by default
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewHook, setPreviewHook] = useState<Hook | null>(null);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleHook = (hookId: string) => {
    const newSelection = selectedHooks.includes(hookId)
      ? selectedHooks.filter(id => id !== hookId)
      : [...selectedHooks, hookId];
    onSelectionChange(newSelection);
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'core':
        return 'Core Hooks';
      case 'communication':
        return 'Communication Hooks';
      case 'tasks':
        return 'Task Hooks';
      case 'advanced':
        return 'Advanced Hooks';
      case 'mvc':
        return 'MVC Bridge Hooks';
      case 'punch':
        return 'Punch Hooks (DOM State)';
      case 'query':
        return 'Query Hooks (SQL for DOM)';
      case 'trees':
        return 'Trees Hooks (State Machines)';
      case 'quantum':
        return 'Quantum Hooks (DOM Entanglement)';
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'core':
        return 'Essential React-like hooks (useState, useEffect, useRef)';
      case 'communication':
        return 'Real-time communication (pub/sub, SignalR)';
      case 'tasks':
        return 'Server tasks, pagination, and task scheduling';
      case 'advanced':
        return 'Context, client-computed values, server reducers';
      case 'mvc':
        return 'ASP.NET MVC integration with ViewModels';
      case 'punch':
        return 'Make the DOM a reactive data source (80+ properties)';
      case 'query':
        return 'Query the DOM with SQL syntax (SELECT, WHERE, JOIN, GROUP BY)';
      case 'trees':
        return 'Decision trees and state machines for complex flows';
      case 'quantum':
        return 'Share DOM identity across clients with mutation vectors';
      default:
        return '';
    }
  };

  const defaultHooks = hooks.filter(h => h.isDefault);
  const advancedHooks = hooks.filter(h => !h.isDefault);

  const groupedHooks = (hooksToGroup: Hook[]) => {
    return hooksToGroup.reduce(
      (acc, hook) => {
        if (!acc[hook.category]) {
          acc[hook.category] = [];
        }
        acc[hook.category].push(hook);
        return acc;
      },
      {} as Record<string, Hook[]>
    );
  };

  const defaultGrouped = groupedHooks(defaultHooks);
  const advancedGrouped = groupedHooks(advancedHooks);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className="bg-gray-900 border border-gray-700 z-50 flex flex-col shadow-2xl rounded-3xl max-w-4xl w-full max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Traffic Lights */}
        <div className="traffic-lights absolute top-6 left-6 z-10">
          <div className="traffic-light bg-red-500 cursor-pointer hover:opacity-100" onClick={onClose}></div>
          <div className="traffic-light bg-yellow-500 opacity-50"></div>
          <div className="traffic-light bg-green-500 opacity-50"></div>
        </div>
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-100">Hook Library</h2>
              <p className="text-sm text-gray-400">
                Select hooks to include example code in your project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {/* Default Hooks */}
          <div className="space-y-2">
            {Object.entries(defaultGrouped).map(([category, categoryHooks]) => (
              <div key={category} className="border border-gray-700 rounded-lg bg-gray-800/50">
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-200">
                      {getCategoryLabel(category)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({categoryHooks.length} hook{categoryHooks.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </button>

                {/* Category Description */}
                {expandedCategories.has(category) && (
                  <div className="px-4 pb-1">
                    <p className="text-xs text-gray-500">{getCategoryDescription(category)}</p>
                  </div>
                )}

                {/* Category Hooks */}
                {expandedCategories.has(category) && (
                  <div className="px-4 pb-3 space-y-2">
                    {categoryHooks.map(hook => (
                      <label
                        key={hook.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedHooks.includes(hook.id)}
                          onChange={() => toggleHook(hook.id)}
                          className="w-4 h-4 mt-0.5 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200 font-mono">
                              {hook.name}
                            </span>
                            {hook.packageName && (
                              <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                                {hook.packageName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{hook.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.preventDefault();
                            setPreviewHook(hook);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                          title="Preview example"
                        >
                          <Info className="w-4 h-4 text-gray-400" />
                        </button>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Advanced Hooks (Collapsible) */}
          {Object.keys(advancedGrouped).length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                {showAdvanced ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-200">Additional Hooks</span>
                <span className="text-xs text-gray-500">
                  ({advancedHooks.length} additional hooks)
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-2 space-y-2">
                  {Object.entries(advancedGrouped).map(([category, categoryHooks]) => (
                    <div
                      key={category}
                      className="border border-gray-700 rounded-lg bg-gray-800/50"
                    >
                      {/* Category Header */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-200">
                            {getCategoryLabel(category)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({categoryHooks.length} hook{categoryHooks.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </button>

                      {/* Category Description */}
                      {expandedCategories.has(category) && (
                        <div className="px-4 pb-1">
                          <p className="text-xs text-gray-500">
                            {getCategoryDescription(category)}
                          </p>
                        </div>
                      )}

                      {/* Category Hooks */}
                      {expandedCategories.has(category) && (
                        <div className="px-4 pb-3 space-y-2">
                          {categoryHooks.map(hook => (
                            <label
                              key={hook.id}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/30 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedHooks.includes(hook.id)}
                                onChange={() => toggleHook(hook.id)}
                                className="w-4 h-4 mt-0.5 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-200 font-mono">
                                    {hook.name}
                                  </span>
                                  {hook.packageName && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                                      {hook.packageName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{hook.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault();
                                  setPreviewHook(hook);
                                }}
                                className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                                title="Preview example"
                              >
                                <Info className="w-4 h-4 text-gray-400" />
                              </button>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
          {/* Selection Summary */}
          {selectedHooks.length > 0 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300 font-medium">
                  {selectedHooks.length} hook{selectedHooks.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Example code will be generated in <code className="text-gray-400">Pages/Examples/</code>
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                No hooks selected. The project will be created without example code.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewHook && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setPreviewHook(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg max-w-3xl max-h-[80vh] overflow-auto m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-100 font-mono">
                    {previewHook.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{previewHook.description}</p>
                  {previewHook.packageName && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                        {previewHook.packageName}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPreviewHook(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{previewHook.example}</code>
                </pre>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setPreviewHook(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    toggleHook(previewHook.id);
                    setPreviewHook(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  {selectedHooks.includes(previewHook.id) ? (
                    <>
                      <Check className="w-4 h-4" />
                      Selected
                    </>
                  ) : (
                    'Add to Project'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
