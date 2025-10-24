import FailSquareTabControl, { FailSquareTab } from './FailSquareTabControl';
import { FileTextOutlined, BugOutlined, BarChartOutlined, ClockCircleOutlined, TeamOutlined, SettingOutlined, DatabaseOutlined, ApiOutlined, SecurityScanOutlined, ExperimentOutlined, CodeOutlined, SearchOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Layout Components/FailSquareTabControl',
  component: FailSquareTabControl,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Tab control component for FailSquare that provides organized content sections with icons, accessibility features, and smooth tab switching.'
      }
    }
  },
  argTypes: {
    defaultActiveIndex: {
      control: 'number',
      description: 'Index of the tab that should be active by default'
    },
    onTabChange: {
      action: 'tab-changed',
      description: 'Callback when active tab changes'
    },
    children: {
      description: 'FailSquareTab components'
    }
  }
};
export default meta;
export const Default = {
  args: {
    children: /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx(FailSquareTab, {
        title: "Overview",
        icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Failure Analysis Overview"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600 mb-4",
            children: "This tab contains the main overview of the failure analysis, including summary information, key findings, and executive summary."
          }), /*#__PURE__*/_jsxs("ul", {
            className: "list-disc list-inside text-gray-700 space-y-1",
            children: [/*#__PURE__*/_jsx("li", {
              children: "Failure occurred on March 15, 2024 at 14:30 UTC"
            }), /*#__PURE__*/_jsx("li", {
              children: "Affected 12,000 users for 45 minutes"
            }), /*#__PURE__*/_jsx("li", {
              children: "Root cause: Database connection timeout"
            }), /*#__PURE__*/_jsx("li", {
              children: "Resolution: Increased connection pool size"
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Technical Details",
        icon: /*#__PURE__*/_jsx(BugOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Technical Analysis"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600 mb-4",
            children: "Detailed technical information about the failure, including stack traces, logs, and system metrics."
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-gray-100 p-4 rounded-lg",
            children: [/*#__PURE__*/_jsx("h4", {
              className: "font-medium mb-2",
              children: "Error Log:"
            }), /*#__PURE__*/_jsx("pre", {
              className: "text-sm text-gray-800 font-mono",
              children: `ConnectionTimeoutException: Connection timeout after 30000ms
    at DatabasePool.getConnection(DatabasePool.java:145)
    at UserService.authenticate(UserService.java:67)
    at AuthController.login(AuthController.java:34)`
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Metrics",
        icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Performance Metrics"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600 mb-4",
            children: "System performance data and metrics collected during the failure event."
          }), /*#__PURE__*/_jsxs("div", {
            className: "grid grid-cols-2 gap-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "bg-red-50 p-4 rounded-lg border border-red-200",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-red-800",
                children: "Response Time"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-2xl font-bold text-red-900",
                children: "8.5s"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-red-700 text-sm",
                children: "Normal: 200ms"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "bg-orange-50 p-4 rounded-lg border border-orange-200",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-orange-800",
                children: "Error Rate"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-2xl font-bold text-orange-900",
                children: "45%"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-orange-700 text-sm",
                children: "Normal: 0.1%"
              })]
            })]
          })]
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic tab control with three tabs containing different types of failure analysis content.'
      }
    }
  }
};
export const FailureAnalysis = {
  args: {
    children: /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx(FailSquareTab, {
        title: "Summary",
        icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-xl font-bold text-gray-900 mb-4",
            children: "Database Migration Failure Analysis"
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-red-50 border border-red-200 p-4 rounded-lg mb-6",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-semibold text-red-800 mb-2",
              children: "Incident Summary"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-red-700",
              children: "Critical failure during database migration resulted in 45-minute service outage affecting 12,000 active users and causing estimated $23,000 revenue loss."
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "grid grid-cols-3 gap-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "text-center p-4 bg-gray-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "45min"
              }), /*#__PURE__*/_jsx("div", {
                className: "text-gray-600",
                children: "Downtime"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-center p-4 bg-gray-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "12K"
              }), /*#__PURE__*/_jsx("div", {
                className: "text-gray-600",
                children: "Users Affected"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-center p-4 bg-gray-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "$23K"
              }), /*#__PURE__*/_jsx("div", {
                className: "text-gray-600",
                children: "Revenue Loss"
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Timeline",
        icon: /*#__PURE__*/_jsx(ClockCircleOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Incident Timeline"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 p-3 bg-blue-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-blue-600 font-mono text-sm",
                children: "14:30 UTC"
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: "Migration script initiated"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 p-3 bg-yellow-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-yellow-600 font-mono text-sm",
                children: "14:32 UTC"
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: "First error messages in logs"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 p-3 bg-orange-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-orange-600 font-mono text-sm",
                children: "14:35 UTC"
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: "Database connections timing out"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 p-3 bg-red-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-red-600 font-mono text-sm",
                children: "14:40 UTC"
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: "Full service outage declared"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 p-3 bg-green-50 rounded",
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-green-600 font-mono text-sm",
                children: "15:15 UTC"
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: "Service fully restored"
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Root Cause",
        icon: /*#__PURE__*/_jsx(SearchOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Root Cause Analysis"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-2",
                children: "Primary Cause"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-700",
                children: "Migration script contained a deadlock condition when attempting to create indexes on tables with active connections."
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-2",
                children: "Contributing Factors"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "list-disc list-inside text-gray-700 space-y-1",
                children: [/*#__PURE__*/_jsx("li", {
                  children: "Script did not acquire necessary table locks"
                }), /*#__PURE__*/_jsx("li", {
                  children: "No timeout values for long-running operations"
                }), /*#__PURE__*/_jsx("li", {
                  children: "Missing rollback procedures for partial failures"
                }), /*#__PURE__*/_jsx("li", {
                  children: "Insufficient testing on production-sized datasets"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-2",
                children: "Prevention Measures"
              }), /*#__PURE__*/_jsx("div", {
                className: "bg-green-50 border border-green-200 p-4 rounded",
                children: /*#__PURE__*/_jsxs("ul", {
                  className: "list-disc list-inside text-green-700 space-y-1",
                  children: [/*#__PURE__*/_jsx("li", {
                    children: "Mandatory testing protocol for migrations"
                  }), /*#__PURE__*/_jsx("li", {
                    children: "Required rollback procedures"
                  }), /*#__PURE__*/_jsx("li", {
                    children: "Enhanced monitoring for database operations"
                  }), /*#__PURE__*/_jsx("li", {
                    children: "Additional peer review process"
                  })]
                })
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Team Response",
        icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Team Response & Communication"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "bg-blue-50 border border-blue-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-blue-800 mb-2",
                children: "Response Team"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "text-blue-700 space-y-1",
                children: [/*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Incident Commander:"
                  }), " Sarah Chen"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Database Lead:"
                  }), " Mike Rodriguez"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "DevOps Engineer:"
                  }), " Alex Thompson"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Communications:"
                  }), " Emily Park"]
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-2",
                children: "Communication Timeline"
              }), /*#__PURE__*/_jsxs("div", {
                className: "space-y-2 text-sm",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between p-2 bg-gray-50 rounded",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Internal team notification"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-600",
                    children: "14:35 UTC"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between p-2 bg-gray-50 rounded",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Customer status page updated"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-600",
                    children: "14:42 UTC"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between p-2 bg-gray-50 rounded",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Executive briefing"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-600",
                    children: "14:55 UTC"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between p-2 bg-gray-50 rounded",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Resolution announcement"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-600",
                    children: "15:20 UTC"
                  })]
                })]
              })]
            })]
          })]
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive failure analysis with multiple detailed tabs.'
      }
    }
  }
};
export const TechnicalCategories = {
  args: {
    defaultActiveIndex: 1,
    children: /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx(FailSquareTab, {
        title: "Infrastructure",
        icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Infrastructure Failures"
          }), /*#__PURE__*/_jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-2",
                children: "Database Issues"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm",
                children: "Connection timeouts, deadlocks, performance"
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-red-600 font-medium",
                children: "15 active issues"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-2",
                children: "Network Problems"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm",
                children: "Latency, packet loss, DNS issues"
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-orange-600 font-medium",
                children: "8 active issues"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-2",
                children: "Server Hardware"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm",
                children: "CPU, memory, disk failures"
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-yellow-600 font-medium",
                children: "3 active issues"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-2",
                children: "Cloud Services"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm",
                children: "AWS, Azure, GCP outages"
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-green-600 font-medium",
                children: "1 active issue"
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Application",
        icon: /*#__PURE__*/_jsx(CodeOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Application Layer Failures"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "bg-red-50 border border-red-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-red-800",
                children: "Critical Bug Reports"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-red-700 text-sm mt-1",
                children: "Application crashes, data corruption, security vulnerabilities"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mt-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "text-red-900 font-bold",
                  children: "23 reports"
                }), /*#__PURE__*/_jsx("span", {
                  className: "text-red-600 text-sm",
                  children: "Last 7 days"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "bg-orange-50 border border-orange-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-orange-800",
                children: "Performance Issues"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-orange-700 text-sm mt-1",
                children: "Slow response times, memory leaks, CPU usage spikes"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mt-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "text-orange-900 font-bold",
                  children: "12 reports"
                }), /*#__PURE__*/_jsx("span", {
                  className: "text-orange-600 text-sm",
                  children: "Last 7 days"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "bg-yellow-50 border border-yellow-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-yellow-800",
                children: "UI/UX Problems"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-yellow-700 text-sm mt-1",
                children: "Interface bugs, usability issues, accessibility problems"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mt-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "text-yellow-900 font-bold",
                  children: "7 reports"
                }), /*#__PURE__*/_jsx("span", {
                  className: "text-yellow-600 text-sm",
                  children: "Last 7 days"
                })]
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Security",
        icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Security Incident Analysis"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "bg-red-100 border border-red-300 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-red-800 mb-2",
                children: "High Severity Incidents"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "text-red-700 space-y-1 text-sm",
                children: [/*#__PURE__*/_jsx("li", {
                  children: "\u2022 Data breach attempt blocked"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Unauthorized access detected"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 SQL injection vulnerability patched"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-2",
                children: "Security Metrics"
              }), /*#__PURE__*/_jsxs("div", {
                className: "grid grid-cols-3 gap-4",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "text-center p-3 bg-green-50 rounded",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-xl font-bold text-green-600",
                    children: "99.8%"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-green-700 text-sm",
                    children: "Uptime"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "text-center p-3 bg-blue-50 rounded",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-xl font-bold text-blue-600",
                    children: "156"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-blue-700 text-sm",
                    children: "Blocked Attacks"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "text-center p-3 bg-purple-50 rounded",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-xl font-bold text-purple-600",
                    children: "0"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-purple-700 text-sm",
                    children: "Data Breaches"
                  })]
                })]
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "APIs",
        icon: /*#__PURE__*/_jsx(ApiOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "API Integration Failures"
          }), /*#__PURE__*/_jsx("div", {
            className: "space-y-4",
            children: /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 rounded overflow-hidden",
              children: [/*#__PURE__*/_jsx("div", {
                className: "bg-gray-50 px-4 py-2 border-b",
                children: /*#__PURE__*/_jsx("h4", {
                  className: "font-medium",
                  children: "External API Status"
                })
              }), /*#__PURE__*/_jsxs("div", {
                className: "p-4 space-y-3",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Payment Gateway API"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "px-2 py-1 bg-green-100 text-green-800 rounded text-sm",
                    children: "Healthy"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Email Service API"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm",
                    children: "Degraded"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "SMS Provider API"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "px-2 py-1 bg-red-100 text-red-800 rounded text-sm",
                    children: "Down"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/*#__PURE__*/_jsx("span", {
                    children: "Analytics API"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "px-2 py-1 bg-green-100 text-green-800 rounded text-sm",
                    children: "Healthy"
                  })]
                })]
              })]
            })
          })]
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Technical category tabs with specialized content and metrics.'
      }
    }
  }
};
export const SimpleConfiguration = {
  args: {
    children: /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx(FailSquareTab, {
        title: "Basic",
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "font-medium mb-2",
            children: "Basic Configuration"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600",
            children: "Simple tab without icons."
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Advanced",
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "font-medium mb-2",
            children: "Advanced Settings"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600",
            children: "More complex configuration options."
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Expert",
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-4",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "font-medium mb-2",
            children: "Expert Mode"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600",
            children: "Advanced user settings and options."
          })]
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple tab control without icons for basic content organization.'
      }
    }
  }
};
export const ExperimentalFeatures = {
  args: {
    children: /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx(FailSquareTab, {
        title: "Active Experiments",
        icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Currently Running Experiments"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "border border-blue-200 bg-blue-50 p-4 rounded",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/*#__PURE__*/_jsx("h4", {
                  className: "font-medium text-blue-900",
                  children: "AI-Powered Root Cause Detection"
                }), /*#__PURE__*/_jsx("span", {
                  className: "px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm",
                  children: "Running"
                })]
              }), /*#__PURE__*/_jsx("p", {
                className: "text-blue-800 text-sm",
                children: "Testing machine learning algorithms to automatically identify failure root causes."
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-blue-700 text-sm",
                children: "Progress: 65% | ETA: 2 weeks"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-green-200 bg-green-50 p-4 rounded",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/*#__PURE__*/_jsx("h4", {
                  className: "font-medium text-green-900",
                  children: "Predictive Failure Analytics"
                }), /*#__PURE__*/_jsx("span", {
                  className: "px-2 py-1 bg-green-200 text-green-800 rounded text-sm",
                  children: "Beta"
                })]
              }), /*#__PURE__*/_jsx("p", {
                className: "text-green-800 text-sm",
                children: "Early warning system for potential failures based on system metrics patterns."
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-2 text-green-700 text-sm",
                children: "Beta Users: 50 | Feedback: Positive"
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Completed",
        icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Completed Experiments"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-3",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900",
                children: "Automated Incident Classification"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Experiment completed successfully. Feature deployed to production."
              }), /*#__PURE__*/_jsx("div", {
                className: "text-gray-500 text-sm mt-2",
                children: "Completed: 2 weeks ago"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900",
                children: "Real-time Collaboration Tools"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Enhanced team collaboration features during incident response."
              }), /*#__PURE__*/_jsx("div", {
                className: "text-gray-500 text-sm mt-2",
                children: "Completed: 1 month ago"
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Proposals",
        icon: /*#__PURE__*/_jsx(BugOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Experiment Proposals"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900",
                children: "Smart Failure Grouping"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Automatically group related failures using similarity algorithms."
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mt-3",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-gray-500 text-sm",
                  children: "Proposed by: Dr. Sarah Chen"
                }), /*#__PURE__*/_jsx("button", {
                  className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700",
                  children: "Review"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border border-gray-200 p-4 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900",
                children: "Impact Prediction Model"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Predict business impact of failures before they occur."
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between mt-3",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-gray-500 text-sm",
                  children: "Proposed by: Mike Rodriguez"
                }), /*#__PURE__*/_jsx("button", {
                  className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700",
                  children: "Review"
                })]
              })]
            })]
          })]
        })
      }), /*#__PURE__*/_jsx(FailSquareTab, {
        title: "Settings",
        icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
        children: /*#__PURE__*/_jsxs("div", {
          className: "p-6",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "text-lg font-semibold mb-4",
            children: "Experiment Settings"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-6",
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-3",
                children: "Participation Settings"
              }), /*#__PURE__*/_jsxs("div", {
                className: "space-y-3",
                children: [/*#__PURE__*/_jsxs("label", {
                  className: "flex items-center",
                  children: [/*#__PURE__*/_jsx("input", {
                    type: "checkbox",
                    className: "mr-3",
                    defaultChecked: true
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-700",
                    children: "Participate in beta experiments"
                  })]
                }), /*#__PURE__*/_jsxs("label", {
                  className: "flex items-center",
                  children: [/*#__PURE__*/_jsx("input", {
                    type: "checkbox",
                    className: "mr-3"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-700",
                    children: "Early access to experimental features"
                  })]
                }), /*#__PURE__*/_jsxs("label", {
                  className: "flex items-center",
                  children: [/*#__PURE__*/_jsx("input", {
                    type: "checkbox",
                    className: "mr-3",
                    defaultChecked: true
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-700",
                    children: "Receive experiment notifications"
                  })]
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-gray-900 mb-3",
                children: "Data Sharing"
              }), /*#__PURE__*/_jsxs("div", {
                className: "space-y-3",
                children: [/*#__PURE__*/_jsxs("label", {
                  className: "flex items-center",
                  children: [/*#__PURE__*/_jsx("input", {
                    type: "checkbox",
                    className: "mr-3",
                    defaultChecked: true
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-700",
                    children: "Share anonymous usage data"
                  })]
                }), /*#__PURE__*/_jsxs("label", {
                  className: "flex items-center",
                  children: [/*#__PURE__*/_jsx("input", {
                    type: "checkbox",
                    className: "mr-3"
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-gray-700",
                    children: "Share failure analysis data for research"
                  })]
                })]
              })]
            })]
          })]
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Tab control for experimental features and research programs.'
      }
    }
  }
};
export const InteractiveDemo = {
  render: () => {
    const [selectedTab, setSelectedTab] = React.useState(0);
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs(FailSquareTabControl, {
        defaultActiveIndex: 0,
        onTabChange: index => setSelectedTab(index),
        children: [/*#__PURE__*/_jsx(FailSquareTab, {
          title: "Dashboard",
          icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-6",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-semibold mb-4",
              children: "System Dashboard"
            }), /*#__PURE__*/_jsxs("div", {
              className: "grid grid-cols-3 gap-4",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "bg-green-50 p-4 rounded text-center",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-2xl font-bold text-green-600",
                  children: "98.7%"
                }), /*#__PURE__*/_jsx("div", {
                  className: "text-green-800",
                  children: "System Uptime"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "bg-blue-50 p-4 rounded text-center",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-2xl font-bold text-blue-600",
                  children: "127"
                }), /*#__PURE__*/_jsx("div", {
                  className: "text-blue-800",
                  children: "Active Analyses"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "bg-purple-50 p-4 rounded text-center",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-2xl font-bold text-purple-600",
                  children: "1,234"
                }), /*#__PURE__*/_jsx("div", {
                  className: "text-purple-800",
                  children: "Community Members"
                })]
              })]
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareTab, {
          title: "Analytics",
          icon: /*#__PURE__*/_jsx(BarChartOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-6",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-semibold mb-4",
              children: "Failure Analytics"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Detailed analytics and insights about failure patterns, trends, and resolution effectiveness."
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareTab, {
          title: "Reports",
          icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-6",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-semibold mb-4",
              children: "Generated Reports"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Access to generated reports, export functionality, and historical analysis data."
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareTab, {
          title: "Settings",
          icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "p-6",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-semibold mb-4",
              children: "Application Settings"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Configure application preferences, notification settings, and user account options."
            })]
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-blue-50 border border-blue-200 rounded",
        children: [/*#__PURE__*/_jsxs("p", {
          className: "text-blue-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Currently active tab:"
          }), " Tab ", selectedTab + 1]
        }), /*#__PURE__*/_jsx("p", {
          className: "text-blue-700 text-sm mt-1",
          children: "Switch between tabs to see the callback in action."
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing tab switching with callback functionality.'
      }
    }
  }
};