import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareActiveFilters from './FailSquareActiveFilters';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Layout Components/FailSquareActiveFilters',
  component: FailSquareActiveFilters,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Active filters display component for FailSquare that shows currently applied filters as removable chips, provides sorting options, and includes advanced filter access.'
      }
    }
  },
  argTypes: {
    activeFilters: {
      description: 'Array of active filter chips'
    },
    sortOption: {
      control: 'select',
      options: ['merit', 'recent', 'forks'],
      description: 'Current sort option'
    },
    onRemoveFilter: {
      action: 'filter-removed',
      description: 'Callback when a filter is removed'
    },
    onAdvancedFilters: {
      action: 'advanced-filters-clicked',
      description: 'Callback when advanced filters button is clicked'
    },
    onSortOptionChange: {
      action: 'sort-changed',
      description: 'Callback when sort option changes'
    }
  }
};
export default meta;
const sampleFilters = [{
  id: 'category-database',
  label: 'Database',
  type: 'category'
}, {
  id: 'severity-critical',
  label: 'Critical',
  type: 'severity'
}, {
  id: 'date-week',
  label: 'This Week',
  type: 'date'
}];
export const Default = {
  args: {
    activeFilters: sampleFilters,
    sortOption: 'merit'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic active filters display with sample filters and default sorting.'
      }
    }
  }
};
export const NoFilters = {
  args: {
    activeFilters: [],
    sortOption: 'recent'
  },
  parameters: {
    docs: {
      description: {
        story: 'Active filters component with no active filters applied.'
      }
    }
  }
};
export const ManyFilters = {
  args: {
    activeFilters: [{
      id: 'category-database',
      label: 'Database',
      type: 'category'
    }, {
      id: 'category-api',
      label: 'API Integration',
      type: 'category'
    }, {
      id: 'severity-critical',
      label: 'Critical',
      type: 'severity'
    }, {
      id: 'severity-high',
      label: 'High',
      type: 'severity'
    }, {
      id: 'author-sarah',
      label: 'Dr. Sarah Chen',
      type: 'author'
    }, {
      id: 'date-month',
      label: 'Last 30 Days',
      type: 'date'
    }, {
      id: 'status-unresolved',
      label: 'Unresolved',
      type: 'status'
    }, {
      id: 'merit-high',
      label: 'Merit 4.0+',
      type: 'merit'
    }],
    sortOption: 'forks'
  },
  parameters: {
    docs: {
      description: {
        story: 'Active filters with many applied filters showing wrapping behavior.'
      }
    }
  }
};
export const InteractiveDemo = {
  render: () => {
    const [activeFilters, setActiveFilters] = useState([{
      id: 'category-database',
      label: 'Database Issues',
      type: 'category'
    }, {
      id: 'severity-critical',
      label: 'Critical Priority',
      type: 'severity'
    }, {
      id: 'date-week',
      label: 'This Week',
      type: 'date'
    }]);
    const [sortOption, setSortOption] = useState('merit');
    const removeFilter = filterToRemove => {
      setActiveFilters(prevFilters => prevFilters.filter(filter => !(filter.id === filterToRemove.id && filter.type === filterToRemove.type)));
    };
    const addFilter = newFilter => {
      setActiveFilters(prevFilters => [...prevFilters, newFilter]);
    };
    const clearAllFilters = () => {
      setActiveFilters([]);
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6",
      children: [/*#__PURE__*/_jsx(FailSquareActiveFilters, {
        activeFilters: activeFilters,
        sortOption: sortOption,
        onRemoveFilter: removeFilter,
        onSortOptionChange: setSortOption,
        onAdvancedFilters: () => console.log('Advanced filters clicked')
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-gray-50 rounded-lg",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-gray-900 mb-3",
          children: "Demo Controls"
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-3",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex flex-wrap gap-2",
            children: [/*#__PURE__*/_jsx("button", {
              onClick: () => addFilter({
                id: 'category-security',
                label: 'Security',
                type: 'category'
              }),
              className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700",
              children: "Add Security Filter"
            }), /*#__PURE__*/_jsx("button", {
              onClick: () => addFilter({
                id: 'author-mike',
                label: 'Mike Rodriguez',
                type: 'author'
              }),
              className: "px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700",
              children: "Add Author Filter"
            }), /*#__PURE__*/_jsx("button", {
              onClick: () => addFilter({
                id: 'status-resolved',
                label: 'Resolved',
                type: 'status'
              }),
              className: "px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700",
              children: "Add Status Filter"
            }), /*#__PURE__*/_jsx("button", {
              onClick: clearAllFilters,
              className: "px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700",
              children: "Clear All"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "text-sm text-gray-600",
            children: [/*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Active filters:"
              }), " ", activeFilters.length]
            }), /*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Current sort:"
              }), " ", sortOption]
            })]
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing filter removal and management.'
      }
    }
  }
};
export const FailureAnalysisFilters = {
  render: () => {
    const [filters, setFilters] = useState([{
      id: 'category-infrastructure',
      label: 'Infrastructure',
      type: 'category'
    }, {
      id: 'severity-high',
      label: 'High Priority',
      type: 'severity'
    }, {
      id: 'author-team',
      label: 'Engineering Team',
      type: 'author'
    }]);
    const [sort, setSort] = useState('recent');
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg border border-gray-200",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-lg font-semibold text-gray-900 mb-4",
          children: "Failure Analysis Search"
        }), /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: filters,
          sortOption: sort,
          onRemoveFilter: filter => {
            setFilters(prev => prev.filter(f => f.id !== filter.id || f.type !== filter.type));
          },
          onSortOptionChange: setSort,
          onAdvancedFilters: () => console.log('Opening advanced filters')
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-gray-50 p-4 rounded-lg",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-gray-900 mb-3",
          children: "Search Results"
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-3",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "bg-white p-4 rounded border",
            children: [/*#__PURE__*/_jsx("h5", {
              className: "font-medium text-gray-900",
              children: "Database Connection Pool Exhaustion"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm mt-1",
              children: "High priority infrastructure failure affecting user authentication..."
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Merit: 4.2/5"
              }), /*#__PURE__*/_jsx("span", {
                children: "15 forks"
              }), /*#__PURE__*/_jsx("span", {
                children: "2 days ago"
              })]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-white p-4 rounded border",
            children: [/*#__PURE__*/_jsx("h5", {
              className: "font-medium text-gray-900",
              children: "Load Balancer Configuration Error"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm mt-1",
              children: "Infrastructure issue causing intermittent service failures..."
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Merit: 3.9/5"
              }), /*#__PURE__*/_jsx("span", {
                children: "8 forks"
              }), /*#__PURE__*/_jsx("span", {
                children: "5 days ago"
              })]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-white p-4 rounded border",
            children: [/*#__PURE__*/_jsx("h5", {
              className: "font-medium text-gray-900",
              children: "Network Latency Spike Analysis"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm mt-1",
              children: "High priority network infrastructure investigation..."
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Merit: 4.5/5"
              }), /*#__PURE__*/_jsx("span", {
                children: "23 forks"
              }), /*#__PURE__*/_jsx("span", {
                children: "1 week ago"
              })]
            })]
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Real-world example of active filters in a failure analysis search interface.'
      }
    }
  }
};
export const DifferentFilterTypes = {
  args: {
    activeFilters: [{
      id: 'category-database',
      label: 'Database',
      type: 'category'
    }, {
      id: 'category-api',
      label: 'API',
      type: 'category'
    }, {
      id: 'severity-critical',
      label: 'Critical',
      type: 'severity'
    }, {
      id: 'author-sarah',
      label: 'Dr. Sarah Chen',
      type: 'author'
    }, {
      id: 'author-mike',
      label: 'Mike Rodriguez',
      type: 'author'
    }, {
      id: 'date-month',
      label: 'Last 30 Days',
      type: 'date'
    }, {
      id: 'status-open',
      label: 'Open',
      type: 'status'
    }, {
      id: 'merit-high',
      label: 'Merit 4+',
      type: 'merit'
    }, {
      id: 'tech-react',
      label: 'React',
      type: 'technology'
    }, {
      id: 'tech-nodejs',
      label: 'Node.js',
      type: 'technology'
    }],
    sortOption: 'merit'
  },
  parameters: {
    docs: {
      description: {
        story: 'Various types of filters applied showing different categories.'
      }
    }
  }
};
export const ResponsiveLayout = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-6",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-900 mb-3",
        children: "Desktop Layout"
      }), /*#__PURE__*/_jsx("div", {
        className: "p-4 bg-white border border-gray-200 rounded",
        children: /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: [{
            id: 'category-security',
            label: 'Security Issues',
            type: 'category'
          }, {
            id: 'severity-high',
            label: 'High Priority',
            type: 'severity'
          }, {
            id: 'author-team',
            label: 'Security Team',
            type: 'author'
          }, {
            id: 'date-week',
            label: 'This Week',
            type: 'date'
          }],
          sortOption: "recent"
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-900 mb-3",
        children: "Mobile Layout (Stacked)"
      }), /*#__PURE__*/_jsx("div", {
        className: "max-w-sm p-4 bg-white border border-gray-200 rounded",
        children: /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: [{
            id: 'category-performance',
            label: 'Performance',
            type: 'category'
          }, {
            id: 'severity-medium',
            label: 'Medium',
            type: 'severity'
          }, {
            id: 'date-today',
            label: 'Today',
            type: 'date'
          }],
          sortOption: "forks"
        })
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Responsive layout examples for different screen sizes.'
      }
    }
  }
};
export const EmptyWithSort = {
  args: {
    activeFilters: [],
    sortOption: 'merit'
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state showing only sort controls when no filters are active.'
      }
    }
  }
};
export const AdvancedFiltering = {
  render: () => {
    const [activeFilters, setActiveFilters] = useState([{
      id: 'advanced-severity',
      label: 'Severity: Critical OR High',
      type: 'advanced'
    }, {
      id: 'advanced-date',
      label: 'Date: Last 7-30 days',
      type: 'advanced'
    }, {
      id: 'advanced-tech',
      label: 'Tech: React AND Node.js',
      type: 'advanced'
    }]);
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg border border-gray-200",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-lg font-semibold text-gray-900 mb-4",
          children: "Advanced Filter Results"
        }), /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: activeFilters,
          sortOption: "merit",
          onRemoveFilter: filter => {
            setActiveFilters(prev => prev.filter(f => f.id !== filter.id));
          },
          onAdvancedFilters: () => console.log('Advanced filters panel opened')
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-blue-50 border border-blue-200 p-4 rounded",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-blue-800 mb-2",
          children: "Advanced Filter Features"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "text-blue-700 text-sm space-y-1",
          children: [/*#__PURE__*/_jsx("li", {
            children: "\u2022 Complex boolean logic (AND, OR, NOT)"
          }), /*#__PURE__*/_jsx("li", {
            children: "\u2022 Date range selectors"
          }), /*#__PURE__*/_jsx("li", {
            children: "\u2022 Multi-select with operators"
          }), /*#__PURE__*/_jsx("li", {
            children: "\u2022 Saved filter combinations"
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Advanced filtering scenario with complex filter combinations.'
      }
    }
  }
};
export const SavedFilterSets = {
  render: () => {
    const [currentFilters, setCurrentFilters] = useState([{
      id: 'category-database',
      label: 'Database',
      type: 'category'
    }, {
      id: 'severity-critical',
      label: 'Critical',
      type: 'severity'
    }]);
    const savedFilterSets = [{
      name: 'Critical Database Issues',
      filters: [{
        id: 'category-database',
        label: 'Database',
        type: 'category'
      }, {
        id: 'severity-critical',
        label: 'Critical',
        type: 'severity'
      }]
    }, {
      name: 'Team Security Reviews',
      filters: [{
        id: 'category-security',
        label: 'Security',
        type: 'category'
      }, {
        id: 'author-team',
        label: 'Security Team',
        type: 'author'
      }, {
        id: 'status-review',
        label: 'Under Review',
        type: 'status'
      }]
    }, {
      name: 'High Merit Recent',
      filters: [{
        id: 'merit-high',
        label: 'Merit 4+',
        type: 'merit'
      }, {
        id: 'date-week',
        label: 'This Week',
        type: 'date'
      }]
    }];
    const applyFilterSet = filterSet => {
      setCurrentFilters(filterSet.filters);
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg border border-gray-200",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-lg font-semibold text-gray-900 mb-4",
          children: "Current Filters"
        }), /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: currentFilters,
          sortOption: "merit",
          onRemoveFilter: filter => {
            setCurrentFilters(prev => prev.filter(f => f.id !== filter.id));
          },
          onAdvancedFilters: () => console.log('Advanced filters')
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-gray-50 p-4 rounded-lg",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-gray-900 mb-3",
          children: "Saved Filter Sets"
        }), /*#__PURE__*/_jsx("div", {
          className: "grid grid-cols-1 md:grid-cols-3 gap-3",
          children: savedFilterSets.map((filterSet, index) => /*#__PURE__*/_jsxs("button", {
            onClick: () => applyFilterSet(filterSet),
            className: "p-3 bg-white border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors text-left",
            children: [/*#__PURE__*/_jsx("div", {
              className: "font-medium text-gray-900 mb-1",
              children: filterSet.name
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-sm text-gray-600",
              children: [filterSet.filters.length, " filter", filterSet.filters.length !== 1 ? 's' : '']
            })]
          }, index))
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Saved filter sets that can be quickly applied to search results.'
      }
    }
  }
};
export const FilterStats = {
  render: () => {
    const [activeFilters, setActiveFilters] = useState([{
      id: 'category-api',
      label: 'API Issues',
      type: 'category'
    }, {
      id: 'severity-high',
      label: 'High Priority',
      type: 'severity'
    }, {
      id: 'date-month',
      label: 'Last 30 Days',
      type: 'date'
    }]);
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsx("div", {
        className: "bg-white p-6 rounded-lg border border-gray-200",
        children: /*#__PURE__*/_jsx(FailSquareActiveFilters, {
          activeFilters: activeFilters,
          sortOption: "recent",
          onRemoveFilter: filter => {
            setActiveFilters(prev => prev.filter(f => f.id !== filter.id));
          },
          onAdvancedFilters: () => console.log('Advanced filters')
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "bg-green-50 border border-green-200 p-4 rounded",
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-between",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", {
              className: "font-medium text-green-800",
              children: "Search Results"
            }), /*#__PURE__*/_jsx("div", {
              className: "text-green-700 text-sm",
              children: "Found 127 matching failure analyses"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "text-right",
            children: [/*#__PURE__*/_jsx("div", {
              className: "font-medium text-green-800",
              children: "Filters Applied"
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-green-700 text-sm",
              children: [activeFilters.length, " active filter", activeFilters.length !== 1 ? 's' : '']
            })]
          })]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Active filters with result statistics and filter count display.'
      }
    }
  }
};