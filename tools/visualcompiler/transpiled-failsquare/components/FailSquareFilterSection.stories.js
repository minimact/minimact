import FailSquareFilterSection from './FailSquareFilterSection';
import FailSquareCheckbox from './FailSquareCheckbox';
import FailSquareRadioGroup from './FailSquareRadioGroup';
import FailSquareSelect from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareSelect.js';
import { FilterOutlined, CalendarOutlined, TagOutlined, TeamOutlined, BarChartOutlined, DatabaseOutlined, ApiOutlined, BugOutlined, SecurityScanOutlined, ThunderboltOutlined, AppstoreOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Layout Components/FailSquareFilterSection',
  component: FailSquareFilterSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Collapsible filter section component for FailSquare that organizes filter controls into expandable/collapsible groups with icons and smooth animations.'
      }
    }
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Section title displayed in the header'
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the section is open by default'
    },
    icon: {
      description: 'Optional icon to display next to the title'
    },
    children: {
      description: 'Filter controls content'
    }
  }
};
export default meta;
export const Default = {
  args: {
    title: 'Filter Options',
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-3",
      children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Include resolved failures"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Show only my analyses"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Community contributions"
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic filter section with checkboxes.'
      }
    }
  }
};
export const WithIcon = {
  args: {
    title: 'Categories',
    icon: /*#__PURE__*/_jsx(TagOutlined, {}),
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Database Issues"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "API Problems"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Security Incidents"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Performance Issues"
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter section with icon and category checkboxes.'
      }
    }
  }
};
export const DefaultOpen = {
  args: {
    title: 'Date Range',
    icon: /*#__PURE__*/_jsx(CalendarOutlined, {}),
    defaultOpen: true,
    children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
      name: "date-range",
      options: [{
        value: 'today',
        label: 'Today'
      }, {
        value: 'week',
        label: 'This Week'
      }, {
        value: 'month',
        label: 'This Month'
      }, {
        value: 'quarter',
        label: 'This Quarter'
      }, {
        value: 'year',
        label: 'This Year'
      }]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter section that starts in the open state.'
      }
    }
  }
};
export const CompleteFilterSidebar = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-80 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Failure Analysis Filters"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Severity Level",
      icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Critical"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "High"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Medium"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Low"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Failure Categories",
      icon: /*#__PURE__*/_jsx(TagOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Database"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "API Integration"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Infrastructure"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Security"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Performance"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "User Interface"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Time Period",
      icon: /*#__PURE__*/_jsx(CalendarOutlined, {}),
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "time-period",
        options: [{
          value: 'today',
          label: 'Today'
        }, {
          value: 'week',
          label: 'Last 7 days'
        }, {
          value: 'month',
          label: 'Last 30 days'
        }, {
          value: 'quarter',
          label: 'Last 90 days'
        }, {
          value: 'custom',
          label: 'Custom range'
        }]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Authors",
      icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Search authors...",
          options: [{
            value: 'sarah-chen',
            label: 'Dr. Sarah Chen'
          }, {
            value: 'mike-rodriguez',
            label: 'Mike Rodriguez'
          }, {
            value: 'alex-thompson',
            label: 'Alex Thompson'
          }, {
            value: 'emily-park',
            label: 'Emily Park'
          }]
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-2",
          children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "My analyses only"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Team members"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Community contributors"
          })]
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Merit Score",
      icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "merit-score",
        options: [{
          value: 'any',
          label: 'Any score'
        }, {
          value: 'high',
          label: '4.0+ (Excellent)'
        }, {
          value: 'good',
          label: '3.0+ (Good)'
        }, {
          value: 'average',
          label: '2.0+ (Average)'
        }]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Status",
      icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Open investigations"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Resolved"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Under review"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Archived"
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Complete filter sidebar with multiple collapsible sections.'
      }
    }
  }
};
export const TechnicalFilters = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-96 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Technical Filters"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Infrastructure Components",
      icon: /*#__PURE__*/_jsx(AppstoreOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Web Servers"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Load Balancers"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "CDN"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "DNS"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Monitoring Systems"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Database Systems",
      icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "space-y-2",
          children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "PostgreSQL"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "MySQL"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "MongoDB"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Redis"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Elasticsearch"
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "pt-2 border-t border-gray-200",
          children: /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Database version...",
            options: [{
              value: 'any',
              label: 'Any version'
            }, {
              value: 'latest',
              label: 'Latest stable'
            }, {
              value: 'legacy',
              label: 'Legacy versions'
            }]
          })
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "API Integrations",
      icon: /*#__PURE__*/_jsx(ApiOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "REST APIs"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "GraphQL"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "WebSocket"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Webhook"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "gRPC"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Security Aspects",
      icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Authentication"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Authorization"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Data Encryption"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Network Security"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Compliance"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Error Types",
      icon: /*#__PURE__*/_jsx(BugOutlined, {}),
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "error-types",
        options: [{
          value: 'all',
          label: 'All error types'
        }, {
          value: 'runtime',
          label: 'Runtime errors'
        }, {
          value: 'compilation',
          label: 'Compilation errors'
        }, {
          value: 'logic',
          label: 'Logic errors'
        }, {
          value: 'integration',
          label: 'Integration errors'
        }]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Technical filter sections for software engineering failures.'
      }
    }
  }
};
export const UserPreferences = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-80 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Personal Preferences"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "My Content",
      icon: /*#__PURE__*/_jsx(UserOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "My failure analyses"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "My forks"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Bookmarked content"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Recently viewed"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Collaboration",
      icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Shared with me"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Team collaborations"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Public contributions"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Peer reviews requested"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Notification Preferences",
      icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareRadioGroup, {
          name: "notification-frequency",
          options: [{
            value: 'immediate',
            label: 'Immediate'
          }, {
            value: 'daily',
            label: 'Daily digest'
          }, {
            value: 'weekly',
            label: 'Weekly summary'
          }, {
            value: 'none',
            label: 'No notifications'
          }]
        }), /*#__PURE__*/_jsxs("div", {
          className: "pt-2 border-t border-gray-200 space-y-2",
          children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Email notifications"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Browser notifications"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Mobile push notifications"
          })]
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Display Options",
      icon: /*#__PURE__*/_jsx(FilterOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Items per page...",
          options: [{
            value: '10',
            label: '10 items'
          }, {
            value: '25',
            label: '25 items'
          }, {
            value: '50',
            label: '50 items'
          }, {
            value: '100',
            label: '100 items'
          }]
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-2",
          children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Show thumbnails"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Compact view"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            children: "Show timestamps"
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'User preference filters for personalizing the experience.'
      }
    }
  }
};
export const SearchFilters = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-96 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Advanced Search Filters"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Search Scope",
      icon: /*#__PURE__*/_jsx(FilterOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Title and description"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Technical details"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Comments and discussions"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Tags and metadata"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Code snippets"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Content Type",
      icon: /*#__PURE__*/_jsx(TagOutlined, {}),
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "content-type",
        options: [{
          value: 'all',
          label: 'All content types'
        }, {
          value: 'analyses',
          label: 'Failure analyses only'
        }, {
          value: 'discussions',
          label: 'Discussions only'
        }, {
          value: 'documentation',
          label: 'Documentation only'
        }]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Language & Technology",
      icon: /*#__PURE__*/_jsx(AppstoreOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Programming language...",
          options: [{
            value: 'javascript',
            label: 'JavaScript'
          }, {
            value: 'python',
            label: 'Python'
          }, {
            value: 'java',
            label: 'Java'
          }, {
            value: 'csharp',
            label: 'C#'
          }, {
            value: 'go',
            label: 'Go'
          }]
        }), /*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Framework...",
          options: [{
            value: 'react',
            label: 'React'
          }, {
            value: 'vue',
            label: 'Vue.js'
          }, {
            value: 'angular',
            label: 'Angular'
          }, {
            value: 'express',
            label: 'Express.js'
          }, {
            value: 'django',
            label: 'Django'
          }]
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Engagement Metrics",
      icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Minimum Views"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select minimum views...",
            options: [{
              value: '0',
              label: 'Any number'
            }, {
              value: '10',
              label: '10+ views'
            }, {
              value: '50',
              label: '50+ views'
            }, {
              value: '100',
              label: '100+ views'
            }, {
              value: '500',
              label: '500+ views'
            }]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Minimum Comments"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select minimum comments...",
            options: [{
              value: '0',
              label: 'Any number'
            }, {
              value: '1',
              label: '1+ comments'
            }, {
              value: '5',
              label: '5+ comments'
            }, {
              value: '10',
              label: '10+ comments'
            }]
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Advanced search filters for detailed content discovery.'
      }
    }
  }
};
export const AllClosed = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-80 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Filter Options"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Categories",
      icon: /*#__PURE__*/_jsx(TagOutlined, {}),
      defaultOpen: false,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Database"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "API"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Security"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Date Range",
      icon: /*#__PURE__*/_jsx(CalendarOutlined, {}),
      defaultOpen: false,
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "date-range",
        options: [{
          value: 'today',
          label: 'Today'
        }, {
          value: 'week',
          label: 'This Week'
        }, {
          value: 'month',
          label: 'This Month'
        }]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Priority",
      icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
      defaultOpen: false,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Critical"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "High"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Medium"
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'All filter sections in collapsed state by default.'
      }
    }
  }
};
export const MixedStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "w-80 space-y-4 bg-gray-50 p-4 rounded-lg",
    children: [/*#__PURE__*/_jsx("h3", {
      className: "text-lg font-semibold text-gray-900 mb-4",
      children: "Mixed Filter States"
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Quick Filters",
      icon: /*#__PURE__*/_jsx(FilterOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Show only unresolved"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "High priority only"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Recent activity"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Categories",
      icon: /*#__PURE__*/_jsx(TagOutlined, {}),
      defaultOpen: false,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Infrastructure"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Application"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Security"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Advanced Options",
      icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Sort by...",
          options: [{
            value: 'recent',
            label: 'Most Recent'
          }, {
            value: 'popular',
            label: 'Most Popular'
          }, {
            value: 'merit',
            label: 'Highest Merit'
          }]
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          children: "Include archived"
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareFilterSection, {
      title: "Time Range",
      icon: /*#__PURE__*/_jsx(CalendarOutlined, {}),
      defaultOpen: false,
      children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "time-range",
        options: [{
          value: 'day',
          label: 'Last 24 hours'
        }, {
          value: 'week',
          label: 'Last week'
        }, {
          value: 'month',
          label: 'Last month'
        }]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Filter sections with mixed open and closed states.'
      }
    }
  }
};