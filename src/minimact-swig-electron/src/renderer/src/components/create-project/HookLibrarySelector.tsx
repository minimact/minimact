import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Info } from 'lucide-react';

interface Hook {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'mvc' | 'punch' | 'query' | 'advanced';
  packageName?: string;
  example: string;
  isDefault: boolean;
}

interface HookLibrarySelectorProps {
  selectedHooks: string[];
  onSelectionChange: (hookIds: string[]) => void;
  hooks: Hook[];
}

export function HookLibrarySelector({
  selectedHooks,
  onSelectionChange,
  hooks
}: HookLibrarySelectorProps) {
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
      case 'mvc':
        return 'MVC Bridge Hooks';
      case 'punch':
        return 'Punch Hooks (DOM State)';
      case 'query':
        return 'Query Hooks (SQL for DOM)';
      case 'advanced':
        return 'Advanced Hooks';
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'core':
        return 'Essential React-like hooks (useState, useEffect, useRef)';
      case 'mvc':
        return 'ASP.NET MVC integration with ViewModels';
      case 'punch':
        return 'Make the DOM a reactive data source (80+ properties)';
      case 'query':
        return 'Query the DOM with SQL syntax (SELECT, WHERE, JOIN, GROUP BY)';
      case 'advanced':
        return 'Server tasks, context, client-computed values';
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Hook Library
        </label>
        <p className="text-xs text-gray-500 mb-4">
          Select hooks to include example code in your project. Dependencies are
          auto-selected.
        </p>
      </div>

      {/* Default Hooks */}
      <div className="space-y-2">
        {Object.entries(defaultGrouped).map(([category, categoryHooks]) => (
          <div key={category} className="border border-gray-700 rounded-lg bg-gray-800/50">
            {/* Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
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
              <span className="text-xs text-gray-500">
                {getCategoryDescription(category)}
              </span>
            </button>

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
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
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
            <span className="font-medium text-gray-200">Advanced Hooks</span>
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
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
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
                    <span className="text-xs text-gray-500">
                      {getCategoryDescription(category)}
                    </span>
                  </button>

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
                            className="p-1 hover:bg-gray-600 rounded transition-colors"
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

      {/* Preview Modal */}
      {previewHook && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
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
                  ✕
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

      {/* Selection Summary */}
      {selectedHooks.length > 0 && (
        <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <p className="text-sm text-green-300">
            <strong>{selectedHooks.length}</strong> hook{selectedHooks.length !== 1 ? 's' : ''}{' '}
            selected. Example code will be generated in <code>Pages/Examples/</code>
          </p>
        </div>
      )}
    </div>
  );
}
