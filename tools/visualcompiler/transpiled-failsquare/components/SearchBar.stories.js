import SearchBar from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/SearchBar.js';
const meta = {
  title: 'FailSquare/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Search bar component ported from Meritocious Blazor. Provides search functionality with filters and sorting for FailSquare content discovery.'
      }
    }
  },
  argTypes: {
    showFilters: {
      control: 'boolean',
      description: 'Whether to show the filters section'
    },
    onSearch: {
      action: 'search',
      description: 'Callback when search is performed'
    },
    onFilterRemove: {
      action: 'filter-remove',
      description: 'Callback when a filter is removed'
    },
    onAdvancedFilter: {
      action: 'advanced-filter',
      description: 'Callback when advanced filters are opened'
    },
    onSortChange: {
      action: 'sort-change',
      description: 'Callback when sort option changes'
    }
  }
};
export default meta;
export const Default = {
  args: {
    placeholder: 'Search ideas, discussions, and forks...',
    showFilters: true,
    activeFilters: []
  }
};
export const WithActiveFilters = {
  args: {
    placeholder: 'Search failure documentation...',
    showFilters: true,
    activeFilters: ['Machine Learning', 'Distributed Systems', 'High Merit Score', 'Last Week']
  },
  parameters: {
    docs: {
      description: {
        story: 'Search bar with multiple active filters applied.'
      }
    }
  }
};
export const ManyFilters = {
  args: {
    placeholder: 'Search FailSquare database...',
    showFilters: true,
    activeFilters: ['Machine Learning', 'Distributed Systems', 'Database Failures', 'API Integration', 'Cloud Infrastructure', 'DevOps', 'Security', 'Performance', 'High Merit Score', 'Recent Activity', 'Many Forks', 'Expert Reviewed']
  },
  parameters: {
    docs: {
      description: {
        story: 'Search bar with many active filters to test layout.'
      }
    }
  }
};
export const NoFilters = {
  args: {
    placeholder: 'Quick search...',
    showFilters: false,
    activeFilters: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple search bar without filters section.'
      }
    }
  }
};
export const CustomPlaceholder = {
  args: {
    placeholder: 'Search for failed experiments and lessons learned...',
    showFilters: true,
    activeFilters: ['Experimental', 'Research']
  },
  parameters: {
    docs: {
      description: {
        story: 'Search bar with custom placeholder text.'
      }
    }
  }
};
export const DomainSpecific = {
  args: {
    placeholder: 'Search machine learning failures...',
    showFilters: true,
    activeFilters: ['Neural Networks', 'Computer Vision', 'NLP', 'Convergence Issues']
  },
  parameters: {
    docs: {
      description: {
        story: 'Domain-specific search with relevant filters.'
      }
    }
  }
};
export const ResearchFocus = {
  args: {
    placeholder: 'Search academic failure documentation...',
    showFilters: true,
    activeFilters: ['Peer Reviewed', 'Academic', 'Research Papers', 'Reproducibility']
  },
  parameters: {
    docs: {
      description: {
        story: 'Research-focused search configuration.'
      }
    }
  }
};
export const IndustryFocus = {
  args: {
    placeholder: 'Search industry failure cases...',
    showFilters: true,
    activeFilters: ['Production Issues', 'Enterprise', 'Scalability', 'Business Impact']
  },
  parameters: {
    docs: {
      description: {
        story: 'Industry-focused search configuration.'
      }
    }
  }
};
export const MinimalFilters = {
  args: {
    placeholder: 'Search...',
    showFilters: true,
    activeFilters: ['Recent']
  },
  parameters: {
    docs: {
      description: {
        story: 'Search bar with minimal filter configuration.'
      }
    }
  }
};