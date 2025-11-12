import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, X, Package, Download, Search, Star } from 'lucide-react';

interface Module {
  name: string;
  description: string;
  recommended: boolean;
  category: 'minimact' | 'external';
}

interface ModuleLibraryModalProps {
  selectedModules: string[];
  onSelectionChange: (moduleNames: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NpmSearchResult {
  name: string;
  version: string;
  description: string;
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
}

export function ModuleLibraryModal({
  selectedModules,
  onSelectionChange,
  isOpen,
  onClose
}: ModuleLibraryModalProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['minimact']) // Minimact modules expanded by default
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NpmSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadModules();
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await window.api.modules.searchNpm(searchQuery, 20);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const availableModules = await window.api.modules.getAvailable();
      setModules(availableModules);
    } catch (error) {
      console.error('Failed to load modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleModule = (moduleName: string) => {
    const newSelection = selectedModules.includes(moduleName)
      ? selectedModules.filter(name => name !== moduleName)
      : [...selectedModules, moduleName];
    onSelectionChange(newSelection);
  };

  const selectRecommended = () => {
    const recommended = modules
      .filter(m => m.recommended)
      .map(m => m.name);
    onSelectionChange(recommended);
  };

  const selectAll = () => {
    onSelectionChange(modules.map(m => m.name));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'minimact':
        return 'Minimact Modules';
      case 'external':
        return 'External Libraries';
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'minimact':
        return 'Official Minimact extension modules';
      case 'external':
        return 'Third-party JavaScript libraries';
      default:
        return '';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'minimact':
        return <Package className="w-4 h-4 text-green-400" />;
      case 'external':
        return <Download className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const getModuleBadgeColor = (moduleName: string): string => {
    if (moduleName.startsWith('@minimact/')) {
      return 'bg-green-900/30 text-green-300';
    }
    return 'bg-blue-900/30 text-blue-300';
  };

  const groupedModules = modules.reduce(
    (acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    },
    {} as Record<string, Module[]>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Module Library</h2>
            <p className="text-sm text-gray-400 mt-1">
              Select client-side modules to install in your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search npm registry... (e.g., 'react-icons', 'd3', 'date-fns')"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          {searchQuery && searchQuery.length < 2 && (
            <p className="text-xs text-gray-500 mt-2">Type at least 2 characters to search...</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-800">
          <button
            onClick={selectRecommended}
            className="px-3 py-1.5 text-sm bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 rounded-lg transition-colors"
          >
            Select Recommended
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Clear All
          </button>
          {showSearchResults && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="px-3 py-1.5 text-sm bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              Back to Curated
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 text-sm">Loading modules...</div>
            </div>
          ) : showSearchResults ? (
            /* Search Results */
            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No results found for "{searchQuery}"</p>
                  <p className="text-xs text-gray-500 mt-2">Try a different search term</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300">
                      Found {searchResults.length} package{searchResults.length !== 1 ? 's' : ''} on npm
                    </h3>
                  </div>
                  {searchResults.map(result => (
                    <label
                      key={result.name}
                      className="flex items-start gap-3 p-4 rounded-lg border border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(result.name)}
                        onChange={() => toggleModule(result.name)}
                        className="w-4 h-4 mt-0.5 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-200 font-mono">
                            {result.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                            v{result.version}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-400">
                              {(result.score.final * 100).toFixed(0)}% score
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {result.description || 'No description available'}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span title="Quality">Q: {(result.score.detail.quality * 100).toFixed(0)}%</span>
                          <span title="Popularity">P: {(result.score.detail.popularity * 100).toFixed(0)}%</span>
                          <span title="Maintenance">M: {(result.score.detail.maintenance * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Curated Modules */
            <div className="space-y-3">
              {Object.entries(groupedModules).map(([category, categoryModules]) => (
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
                      {getCategoryIcon(category)}
                      <span className="font-medium text-gray-200">
                        {getCategoryLabel(category)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({categoryModules.length} module{categoryModules.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {getCategoryDescription(category)}
                    </span>
                  </button>

                  {/* Category Modules */}
                  {expandedCategories.has(category) && (
                    <div className="px-4 pb-3 space-y-2">
                      {categoryModules.map(module => (
                        <label
                          key={module.name}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/30 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModules.includes(module.name)}
                            onChange={() => toggleModule(module.name)}
                            className="w-4 h-4 mt-0.5 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-green-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-200 font-mono">
                                {module.name}
                              </span>
                              {module.recommended && (
                                <span className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded">
                                  recommended
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded ${getModuleBadgeColor(module.name)}`}>
                                {module.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{module.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          {/* Selection Summary */}
          {selectedModules.length > 0 && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-sm text-green-300">
                <strong>{selectedModules.length}</strong> module{selectedModules.length !== 1 ? 's' : ''}{' '}
                selected. Modules will be installed to{' '}
                <code className="bg-gray-800 px-1 py-0.5 rounded">mact_modules/</code>
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>ℹ️ About mact_modules:</strong> Modules are downloaded once to a global cache
              (AppData) and then copied to your project. You can add more modules later using{' '}
              <code className="bg-gray-800 px-1 py-0.5 rounded">swig import</code>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
