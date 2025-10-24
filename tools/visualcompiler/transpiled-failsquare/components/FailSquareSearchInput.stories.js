import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareSearchInput from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareSearchInput.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareSearchInput',
  component: FailSquareSearchInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Specialized search input component for FailSquare with clear functionality, Enter key support, and both controlled and uncontrolled modes.'
      }
    }
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Controlled search value'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    onValueChange: {
      action: 'value-changed',
      description: 'Callback when search value changes'
    },
    onSearch: {
      action: 'search-triggered',
      description: 'Callback when search is triggered (Enter key)'
    }
  }
};
export default meta;
export const Default = {
  args: {
    placeholder: 'Search...'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic search input with default placeholder.'
      }
    }
  }
};
export const CustomPlaceholder = {
  args: {
    placeholder: 'Search failure analyses...'
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input with custom placeholder text.'
      }
    }
  }
};
export const WithValue = {
  args: {
    placeholder: 'Search...',
    value: 'database error'
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input with pre-filled value (shows clear button).'
      }
    }
  }
};
export const ControlledExample = {
  render: () => {
    const [searchValue, setSearchValue] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const handleSearch = value => {
      if (value.trim() && !searchHistory.includes(value.trim())) {
        setSearchHistory(prev => [value.trim(), ...prev].slice(0, 5));
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Search"
      }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
        placeholder: "Search for failures, keywords, or authors...",
        value: searchValue,
        onValueChange: setSearchValue,
        onSearch: handleSearch
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setSearchValue('database timeout'),
          className: "px-3 py-1 bg-blue-600 text-white rounded text-sm",
          children: "Sample Search"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSearchValue(''),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Current value:"
        }), " \"", searchValue, "\""]
      }), searchHistory.length > 0 && /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "text-sm font-medium text-gray-700",
          children: "Recent Searches:"
        }), /*#__PURE__*/_jsx("div", {
          className: "flex flex-wrap gap-2",
          children: searchHistory.map((term, index) => /*#__PURE__*/_jsx("button", {
            onClick: () => setSearchValue(term),
            className: "px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 transition-colors",
            children: term
          }, index))
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled search input with search history functionality.'
      }
    }
  }
};
export const FilterableList = {
  render: () => {
    const [searchTerm, setSearchTerm] = useState('');
    const failures = [{
      id: 1,
      title: 'Database Connection Timeout',
      category: 'Database',
      severity: 'High'
    }, {
      id: 2,
      title: 'API Gateway Rate Limit Exceeded',
      category: 'API',
      severity: 'Medium'
    }, {
      id: 3,
      title: 'React Component Memory Leak',
      category: 'Frontend',
      severity: 'Low'
    }, {
      id: 4,
      title: 'Authentication Service Down',
      category: 'Backend',
      severity: 'Critical'
    }, {
      id: 5,
      title: 'CDN Cache Invalidation Failed',
      category: 'Infrastructure',
      severity: 'Medium'
    }, {
      id: 6,
      title: 'Database Migration Rollback',
      category: 'Database',
      severity: 'High'
    }, {
      id: 7,
      title: 'Load Balancer Configuration Error',
      category: 'Infrastructure',
      severity: 'Critical'
    }, {
      id: 8,
      title: 'User Session Timeout Bug',
      category: 'Backend',
      severity: 'Low'
    }];
    const filteredFailures = failures.filter(failure => failure.title.toLowerCase().includes(searchTerm.toLowerCase()) || failure.category.toLowerCase().includes(searchTerm.toLowerCase()) || failure.severity.toLowerCase().includes(searchTerm.toLowerCase()));
    const getSeverityColor = severity => {
      switch (severity.toLowerCase()) {
        case 'critical':
          return 'bg-red-100 text-red-800';
        case 'high':
          return 'bg-orange-100 text-orange-800';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800';
        case 'low':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Search Failure Analyses"
      }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
        placeholder: "Search by title, category, or severity...",
        value: searchTerm,
        onValueChange: setSearchTerm,
        onSearch: value => console.log('Searching for:', value)
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-600",
        children: ["Showing ", filteredFailures.length, " of ", failures.length, " results", searchTerm && ` for "${searchTerm}"`]
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [filteredFailures.map(failure => /*#__PURE__*/_jsx("div", {
          className: "p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors",
          children: /*#__PURE__*/_jsxs("div", {
            className: "flex items-start justify-between",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex-1",
              children: [/*#__PURE__*/_jsx("h5", {
                className: "font-medium text-gray-900",
                children: failure.title
              }), /*#__PURE__*/_jsxs("p", {
                className: "text-sm text-gray-600 mt-1",
                children: ["Category: ", failure.category]
              })]
            }), /*#__PURE__*/_jsx("span", {
              className: `px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(failure.severity)}`,
              children: failure.severity
            })]
          })
        }, failure.id)), filteredFailures.length === 0 && searchTerm && /*#__PURE__*/_jsxs("div", {
          className: "text-center py-8 text-gray-500",
          children: [/*#__PURE__*/_jsxs("p", {
            children: ["No failures found matching \"", searchTerm, "\""]
          }), /*#__PURE__*/_jsx("p", {
            className: "text-sm mt-2",
            children: "Try adjusting your search terms"
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input filtering a list of failure analyses in real-time.'
      }
    }
  }
};
export const SearchSuggestions = {
  render: () => {
    const [searchValue, setSearchValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestions = ['database connection', 'database timeout', 'database migration', 'api gateway', 'authentication', 'memory leak', 'performance issue', 'security breach', 'network latency', 'server crash'];
    const filteredSuggestions = suggestions.filter(suggestion => suggestion.toLowerCase().includes(searchValue.toLowerCase()) && suggestion.toLowerCase() !== searchValue.toLowerCase()).slice(0, 5);
    const handleSearchFocus = () => {
      setShowSuggestions(true);
    };
    const handleSearchBlur = () => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => setShowSuggestions(false), 200);
    };
    const handleSuggestionClick = suggestion => {
      setSearchValue(suggestion);
      setShowSuggestions(false);
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Search with Suggestions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "relative",
        children: [/*#__PURE__*/_jsx(FailSquareSearchInput, {
          placeholder: "Type to see suggestions...",
          value: searchValue,
          onValueChange: setSearchValue,
          onSearch: value => {
            console.log('Searching for:', value);
            setShowSuggestions(false);
          }
        }), /*#__PURE__*/_jsx("div", {
          className: "absolute inset-0 pointer-events-none",
          onFocus: handleSearchFocus,
          onBlur: handleSearchBlur
        }), showSuggestions && filteredSuggestions.length > 0 && /*#__PURE__*/_jsx("div", {
          className: "absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg mt-1 z-10",
          children: filteredSuggestions.map((suggestion, index) => /*#__PURE__*/_jsx("button", {
            className: "w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors first:rounded-t-md last:rounded-b-md",
            onClick: () => handleSuggestionClick(suggestion),
            children: /*#__PURE__*/_jsx("span", {
              className: "text-gray-700",
              children: suggestion
            })
          }, index))
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "text-sm text-gray-600",
        children: /*#__PURE__*/_jsx("p", {
          children: "Popular searches: database, api, authentication, performance"
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input with dropdown suggestions (simulated focus/blur behavior).'
      }
    }
  }
};
export const MultipleSearchInputs = {
  render: () => {
    const [searches, setSearches] = useState({
      global: '',
      title: '',
      author: '',
      tags: ''
    });
    const updateSearch = field => value => {
      setSearches(prev => ({
        ...prev,
        [field]: value
      }));
    };
    const hasActiveFilters = Object.values(searches).some(value => value.trim() !== '');
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Advanced Search"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Global Search"
          }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
            placeholder: "Search across all fields...",
            value: searches.global,
            onValueChange: updateSearch('global'),
            onSearch: value => console.log('Global search:', value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-3 gap-4",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              className: "block text-sm font-medium text-gray-600 mb-2",
              children: "Title"
            }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
              placeholder: "Search titles...",
              value: searches.title,
              onValueChange: updateSearch('title'),
              onSearch: value => console.log('Title search:', value)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              className: "block text-sm font-medium text-gray-600 mb-2",
              children: "Author"
            }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
              placeholder: "Search authors...",
              value: searches.author,
              onValueChange: updateSearch('author'),
              onSearch: value => console.log('Author search:', value)
            })]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              className: "block text-sm font-medium text-gray-600 mb-2",
              children: "Tags"
            }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
              placeholder: "Search tags...",
              value: searches.tags,
              onValueChange: updateSearch('tags'),
              onSearch: value => console.log('Tags search:', value)
            })]
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors",
          children: "Apply Filters"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSearches({
            global: '',
            title: '',
            author: '',
            tags: ''
          }),
          disabled: !hasActiveFilters,
          className: `px-4 py-2 rounded transition-colors ${hasActiveFilters ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`,
          children: "Clear All"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-gray-50 rounded",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium text-gray-700 mb-2",
          children: "Active Searches:"
        }), /*#__PURE__*/_jsx("div", {
          className: "text-sm text-gray-600 space-y-1",
          children: Object.entries(searches).map(([key, value]) => /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("strong", {
              children: [key.charAt(0).toUpperCase() + key.slice(1), ":"]
            }), " \"", value || 'None', "\""]
          }, key))
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple search inputs for advanced filtering scenarios.'
      }
    }
  }
};
export const UncontrolledExample = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-lg",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Uncontrolled Search Inputs"
    }), /*#__PURE__*/_jsx("p", {
      className: "text-sm text-gray-600",
      children: "These search inputs manage their own state internally."
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Quick Search"
        }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
          placeholder: "Search anything...",
          onValueChange: value => console.log('Quick search changed:', value),
          onSearch: value => console.log('Quick search triggered:', value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Filter Search"
        }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
          placeholder: "Filter results...",
          onValueChange: value => console.log('Filter changed:', value),
          onSearch: value => console.log('Filter applied:', value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Tag Search"
        }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
          placeholder: "Search tags...",
          onValueChange: value => console.log('Tag search changed:', value),
          onSearch: value => console.log('Tag search triggered:', value)
        })]
      })]
    }), /*#__PURE__*/_jsx("p", {
      className: "text-xs text-gray-500",
      children: "Check the browser console to see search events."
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled search inputs that manage their own state.'
      }
    }
  }
};
export const SearchWithActions = {
  render: () => {
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const performSearch = async value => {
      setIsSearching(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockResults = [`Result 1 for "${value}"`, `Result 2 for "${value}"`, `Result 3 for "${value}"`];
      setResults(mockResults);
      setIsSearching(false);
    };
    const handleSearch = value => {
      if (value.trim()) {
        performSearch(value);
      } else {
        setResults([]);
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Search with Actions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareSearchInput, {
          placeholder: "Search and press Enter...",
          value: searchValue,
          onValueChange: setSearchValue,
          onSearch: handleSearch,
          className: "flex-1"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => handleSearch(searchValue),
          disabled: isSearching || !searchValue.trim(),
          className: `px-4 py-2 rounded transition-colors ${isSearching || !searchValue.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`,
          children: isSearching ? 'Searching...' : 'Search'
        })]
      }), isSearching && /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-2 text-blue-600",
        children: [/*#__PURE__*/_jsx("div", {
          className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm",
          children: "Searching..."
        })]
      }), results.length > 0 && /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "text-sm font-medium text-gray-700",
          children: "Search Results:"
        }), /*#__PURE__*/_jsx("div", {
          className: "space-y-1",
          children: results.map((result, index) => /*#__PURE__*/_jsx("div", {
            className: "p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors",
            children: result
          }, index))
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input with external search button and loading states.'
      }
    }
  }
};
export const SearchKeyboardShortcuts = {
  render: () => {
    const [searchValue, setSearchValue] = useState('');
    const [lastAction, setLastAction] = useState('');
    const handleKeyDown = e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setLastAction('Focus search (Ctrl/Cmd+K)');
            break;
          case 'Enter':
            e.preventDefault();
            setLastAction('Advanced search (Ctrl/Cmd+Enter)');
            break;
        }
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      onKeyDown: handleKeyDown,
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Search with Keyboard Shortcuts"
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-600 bg-blue-50 p-3 rounded",
        children: [/*#__PURE__*/_jsx("p", {
          className: "font-medium mb-2",
          children: "Keyboard Shortcuts:"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "space-y-1",
          children: [/*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("kbd", {
              className: "px-1 py-0.5 bg-white rounded text-xs",
              children: "Ctrl/Cmd + K"
            }), " - Focus search"]
          }), /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("kbd", {
              className: "px-1 py-0.5 bg-white rounded text-xs",
              children: "Enter"
            }), " - Trigger search"]
          }), /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("kbd", {
              className: "px-1 py-0.5 bg-white rounded text-xs",
              children: "Ctrl/Cmd + Enter"
            }), " - Advanced search"]
          }), /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("kbd", {
              className: "px-1 py-0.5 bg-white rounded text-xs",
              children: "Esc"
            }), " - Clear search"]
          })]
        })]
      }), /*#__PURE__*/_jsx(FailSquareSearchInput, {
        placeholder: "Try the keyboard shortcuts...",
        value: searchValue,
        onValueChange: setSearchValue,
        onSearch: value => setLastAction(`Search triggered: "${value}"`)
      }), lastAction && /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Last action:"
        }), " ", lastAction]
      }), /*#__PURE__*/_jsx("div", {
        className: "text-xs text-gray-500",
        children: "Click in this area and try the keyboard shortcuts above."
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Search input with keyboard shortcuts and accessibility features.'
      }
    }
  }
};