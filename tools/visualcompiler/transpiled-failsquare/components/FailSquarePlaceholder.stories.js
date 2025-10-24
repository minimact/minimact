import FailSquarePlaceholder from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquarePlaceholder.js';
import { ClockCircleOutlined, ExperimentOutlined, DatabaseOutlined, ApiOutlined, BugOutlined, SecurityScanOutlined, BarChartOutlined, TeamOutlined, SettingOutlined, BulbOutlined, FileTextOutlined, SearchOutlined, CloudOutlined, MobileOutlined, CodeOutlined, HeartOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquarePlaceholder',
  component: FailSquarePlaceholder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Placeholder component for FailSquare. Used to indicate features under development, empty states, or loading areas with contextual messaging.'
      }
    }
  },
  argTypes: {
    icon: {
      description: 'Custom icon to display (React node)'
    },
    title: {
      control: 'text',
      description: 'Main heading text for the placeholder'
    },
    description: {
      control: 'text',
      description: 'Descriptive text explaining the placeholder state'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for styling'
    }
  }
};
export default meta;
export const Default = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default placeholder with clock icon and generic coming soon message.'
      }
    }
  }
};
export const CustomMessage = {
  args: {
    title: 'Advanced Analytics Dashboard',
    description: 'We\'re building powerful analytics tools to help you understand failure patterns and trends across your organization.'
  },
  parameters: {
    docs: {
      description: {
        story: 'Placeholder with custom title and description.'
      }
    }
  }
};
export const WithCustomIcon = {
  args: {
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {
      className: "w-12 h-12 text-blue-500"
    }),
    title: 'Experimental Features',
    description: 'This section will showcase experimental failure analysis tools currently in beta testing.'
  },
  parameters: {
    docs: {
      description: {
        story: 'Placeholder with custom icon and colored styling.'
      }
    }
  }
};
export const EmptyStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-6",
    children: [/*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(FileTextOutlined, {
          className: "w-12 h-12 text-gray-400"
        }),
        title: "No Analyses Yet",
        description: "You haven't created any failure analyses. Click the 'New Analysis' button to get started."
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(SearchOutlined, {
          className: "w-12 h-12 text-gray-400"
        }),
        title: "No Search Results",
        description: "We couldn't find any failure analyses matching your search criteria. Try adjusting your filters."
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(TeamOutlined, {
          className: "w-12 h-12 text-gray-400"
        }),
        title: "No Team Members",
        description: "Invite team members to collaborate on failure analyses and share knowledge."
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(HeartOutlined, {
          className: "w-12 h-12 text-gray-400"
        }),
        title: "No Favorites",
        description: "Star your favorite failure analyses to quickly access them later."
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Various empty state placeholders for different sections of the application.'
      }
    }
  }
};
export const FeaturePlaceholders = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-6",
    children: [/*#__PURE__*/_jsx("div", {
      className: "bg-blue-50 border border-blue-200 rounded-lg p-6",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(BarChartOutlined, {
          className: "w-12 h-12 text-blue-500"
        }),
        title: "Real-time Analytics",
        description: "Live dashboard showing failure metrics, trends, and alerts across your systems. Expected release: Q2 2024.",
        className: "text-center"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "bg-green-50 border border-green-200 rounded-lg p-6",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(BulbOutlined, {
          className: "w-12 h-12 text-green-500"
        }),
        title: "AI-Powered Insights",
        description: "Machine learning algorithms that automatically identify patterns and suggest solutions based on historical failure data.",
        className: "text-center"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "bg-purple-50 border border-purple-200 rounded-lg p-6",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(ApiOutlined, {
          className: "w-12 h-12 text-purple-500"
        }),
        title: "Integration Hub",
        description: "Connect FailSquare with your existing tools: Slack, Jira, PagerDuty, and monitoring systems.",
        className: "text-center"
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Feature placeholders with different color themes and upcoming feature descriptions.'
      }
    }
  }
};
export const TechnicalFeatures = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-4",
    children: [/*#__PURE__*/_jsx(FailSquarePlaceholder, {
      icon: /*#__PURE__*/_jsx(DatabaseOutlined, {
        className: "w-12 h-12 text-blue-600"
      }),
      title: "Database Failure Analyzer",
      description: "Advanced tools for analyzing database failures, query performance issues, and connection problems."
    }), /*#__PURE__*/_jsx(FailSquarePlaceholder, {
      icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {
        className: "w-12 h-12 text-red-600"
      }),
      title: "Security Incident Tracker",
      description: "Specialized workflows for documenting and analyzing security-related failures and breaches."
    }), /*#__PURE__*/_jsx(FailSquarePlaceholder, {
      icon: /*#__PURE__*/_jsx(CloudOutlined, {
        className: "w-12 h-12 text-indigo-600"
      }),
      title: "Cloud Infrastructure Monitor",
      description: "Tools for tracking failures across cloud services, containers, and distributed systems."
    }), /*#__PURE__*/_jsx(FailSquarePlaceholder, {
      icon: /*#__PURE__*/_jsx(MobileOutlined, {
        className: "w-12 h-12 text-green-600"
      }),
      title: "Mobile App Crash Analysis",
      description: "Mobile-specific failure analysis with crash logs, device metrics, and user experience data."
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Technical feature placeholders for specialized analysis tools.'
      }
    }
  }
};
export const MinimalStyle = {
  args: {
    icon: /*#__PURE__*/_jsx(BugOutlined, {
      className: "w-8 h-8 text-gray-500"
    }),
    title: 'Bug Tracker Integration',
    description: 'Connect with external bug tracking systems.',
    className: 'py-4'
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal placeholder with smaller icon and reduced padding.'
      }
    }
  }
};
export const LargeFeature = {
  args: {
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {
      className: "w-16 h-16 text-indigo-500"
    }),
    title: 'Machine Learning Lab',
    description: 'Experimental machine learning tools for predictive failure analysis, pattern recognition, and automated root cause identification. This comprehensive suite will help teams proactively identify potential failure points before they impact production systems.',
    className: 'py-12'
  },
  parameters: {
    docs: {
      description: {
        story: 'Large placeholder for major features with extended description.'
      }
    }
  }
};
export const DevelopmentStages = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx("div", {
      className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(SettingOutlined, {
          className: "w-10 h-10 text-yellow-600"
        }),
        title: "In Development",
        description: "Advanced filtering system - 80% complete",
        className: "py-3"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "bg-blue-50 border border-blue-200 rounded-lg p-4",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(CodeOutlined, {
          className: "w-10 h-10 text-blue-600"
        }),
        title: "In Testing",
        description: "Export functionality - Currently in beta testing",
        className: "py-3"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "bg-gray-50 border border-gray-200 rounded-lg p-4",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(ClockCircleOutlined, {
          className: "w-10 h-10 text-gray-500"
        }),
        title: "Planned",
        description: "Multi-tenant support - Scheduled for next quarter",
        className: "py-3"
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Placeholders indicating different development stages with status colors.'
      }
    }
  }
};
export const Interactive = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4",
    children: [/*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(ExperimentOutlined, {
          className: "w-12 h-12 text-blue-500"
        }),
        title: "Beta Features",
        description: "Click to join the beta program and get early access to new features."
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer",
      children: /*#__PURE__*/_jsx(FailSquarePlaceholder, {
        icon: /*#__PURE__*/_jsx(TeamOutlined, {
          className: "w-12 h-12 text-green-500"
        }),
        title: "Community Forum",
        description: "Connect with other FailSquare users to share experiences and solutions."
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive placeholders with hover effects for clickable features.'
      }
    }
  }
};
export const CustomStyling = {
  args: {
    icon: /*#__PURE__*/_jsx(BulbOutlined, {
      className: "w-14 h-14 text-amber-500"
    }),
    title: 'Innovation Lab',
    description: 'Experimental features and cutting-edge failure analysis techniques.',
    className: 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl py-8'
  },
  parameters: {
    docs: {
      description: {
        story: 'Placeholder with custom gradient background and border styling.'
      }
    }
  }
};