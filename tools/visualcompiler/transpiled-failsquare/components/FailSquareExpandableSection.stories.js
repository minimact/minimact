import FailSquareExpandableSection from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareExpandableSection.js';
import { ExperimentOutlined, DatabaseOutlined, CodeOutlined, BugOutlined, SettingOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquareExpandableSection',
  component: FailSquareExpandableSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Collapsible section component for FailSquare. Perfect for organizing detailed failure information, technical specifications, and documentation sections.'
      }
    }
  },
  argTypes: {
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the section is initially expanded'
    }
  }
};
export default meta;
export const Default = {
  args: {
    title: 'Technical Details',
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-3",
      children: [/*#__PURE__*/_jsx("p", {
        className: "text-gray-700",
        children: "This section contains detailed technical information about the failure case. Click the header to expand or collapse this content."
      }), /*#__PURE__*/_jsxs("ul", {
        className: "list-disc list-inside text-gray-600 space-y-1",
        children: [/*#__PURE__*/_jsx("li", {
          children: "Error occurred in production environment"
        }), /*#__PURE__*/_jsx("li", {
          children: "Affected 15% of user base"
        }), /*#__PURE__*/_jsx("li", {
          children: "Resolution time: 2.5 hours"
        })]
      })]
    })
  }
};
export const WithIcon = {
  args: {
    title: 'Database Configuration',
    icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium mb-2",
          children: "Connection Settings"
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-gray-100 p-3 rounded text-sm font-mono",
          children: ["host: localhost", /*#__PURE__*/_jsx("br", {}), "port: 5432", /*#__PURE__*/_jsx("br", {}), "database: failsquare_prod", /*#__PURE__*/_jsx("br", {}), "pool_size: 20"]
        })]
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "These settings were found to be the root cause of the connection timeout issues during peak traffic periods."
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Expandable section with an icon for better visual categorization.'
      }
    }
  }
};
export const DefaultOpen = {
  args: {
    title: 'Critical Error Analysis',
    icon: /*#__PURE__*/_jsx(BugOutlined, {}),
    defaultOpen: true,
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-3",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "bg-red-50 border border-red-200 p-3 rounded",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "text-red-800 font-medium mb-1",
          children: "Stack Trace"
        }), /*#__PURE__*/_jsxs("code", {
          className: "text-red-700 text-sm",
          children: ["TypeError: Cannot read property 'id' of undefined", /*#__PURE__*/_jsx("br", {}), "at UserService.getUserById (line 42)", /*#__PURE__*/_jsx("br", {}), "at AuthController.authenticate (line 18)"]
        })]
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-700",
        children: "This error occurred when the authentication service attempted to validate a user session with a malformed token."
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Section that starts in the expanded state.'
      }
    }
  }
};
export const NestedSections = {
  render: () => /*#__PURE__*/_jsx("div", {
    className: "space-y-4",
    children: /*#__PURE__*/_jsx(FailSquareExpandableSection, {
      title: "System Architecture Failure",
      icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-gray-700",
          children: "Comprehensive analysis of the system architecture that led to cascading failures."
        }), /*#__PURE__*/_jsx(FailSquareExpandableSection, {
          title: "Frontend Issues",
          icon: /*#__PURE__*/_jsx(CodeOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "space-y-2",
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "React components were not properly handling error states."
            }), /*#__PURE__*/_jsxs("ul", {
              className: "list-disc list-inside text-sm text-gray-600",
              children: [/*#__PURE__*/_jsx("li", {
                children: "Missing error boundaries"
              }), /*#__PURE__*/_jsx("li", {
                children: "Unhandled promise rejections"
              }), /*#__PURE__*/_jsx("li", {
                children: "Memory leaks in event listeners"
              })]
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareExpandableSection, {
          title: "Backend Problems",
          icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
          children: /*#__PURE__*/_jsxs("div", {
            className: "space-y-2",
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Server-side issues that contributed to the overall failure."
            }), /*#__PURE__*/_jsxs("ul", {
              className: "list-disc list-inside text-sm text-gray-600",
              children: [/*#__PURE__*/_jsx("li", {
                children: "Database connection pool exhaustion"
              }), /*#__PURE__*/_jsx("li", {
                children: "Inefficient query patterns"
              }), /*#__PURE__*/_jsx("li", {
                children: "Missing request timeouts"
              })]
            })]
          })
        })]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Nested expandable sections for hierarchical organization.'
      }
    }
  }
};
export const MultipleIndependent = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx(FailSquareExpandableSection, {
      title: "Root Cause Analysis",
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-gray-700",
          children: "After thorough investigation, we identified three primary factors that led to the failure."
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-blue-50 p-3 rounded",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Primary Cause:"
          }), " Database connection timeout during peak load"]
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareExpandableSection, {
      title: "Impact Assessment",
      icon: /*#__PURE__*/_jsx(BugOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "grid grid-cols-2 gap-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            className: "font-medium mb-2",
            children: "Affected Systems"
          }), /*#__PURE__*/_jsxs("ul", {
            className: "text-sm text-gray-600 space-y-1",
            children: [/*#__PURE__*/_jsx("li", {
              children: "\u2022 User Authentication"
            }), /*#__PURE__*/_jsx("li", {
              children: "\u2022 Payment Processing"
            }), /*#__PURE__*/_jsx("li", {
              children: "\u2022 Notification Service"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            className: "font-medium mb-2",
            children: "Metrics"
          }), /*#__PURE__*/_jsxs("ul", {
            className: "text-sm text-gray-600 space-y-1",
            children: [/*#__PURE__*/_jsx("li", {
              children: "\u2022 12,000 users affected"
            }), /*#__PURE__*/_jsx("li", {
              children: "\u2022 4.5 hours downtime"
            }), /*#__PURE__*/_jsx("li", {
              children: "\u2022 $45k revenue impact"
            })]
          })]
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareExpandableSection, {
      title: "Security Implications",
      icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "bg-yellow-50 border border-yellow-200 p-3 rounded",
          children: [/*#__PURE__*/_jsx("strong", {
            className: "text-yellow-800",
            children: "Warning:"
          }), /*#__PURE__*/_jsx("span", {
            className: "text-yellow-700 ml-2",
            children: "Some user sessions may have been exposed during the failure window."
          })]
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-700",
          children: "We immediately invalidated all active sessions and required users to re-authenticate as a precautionary measure."
        })]
      })
    }), /*#__PURE__*/_jsx(FailSquareExpandableSection, {
      title: "Prevention Measures",
      icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
      defaultOpen: true,
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium",
          children: "Implemented Solutions:"
        }), /*#__PURE__*/_jsxs("ol", {
          className: "list-decimal list-inside text-gray-700 space-y-1",
          children: [/*#__PURE__*/_jsx("li", {
            children: "Increased database connection pool size"
          }), /*#__PURE__*/_jsx("li", {
            children: "Added circuit breaker pattern to authentication service"
          }), /*#__PURE__*/_jsx("li", {
            children: "Implemented graceful degradation for non-critical features"
          }), /*#__PURE__*/_jsx("li", {
            children: "Enhanced monitoring and alerting thresholds"
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Multiple independent sections for comprehensive failure documentation.'
      }
    }
  }
};
export const LongContent = {
  args: {
    title: 'Detailed Technical Specification',
    icon: /*#__PURE__*/_jsx(CodeOutlined, {}),
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsx("p", {
        className: "text-gray-700",
        children: "This section contains a very long and detailed technical specification that demonstrates how the expandable section handles extensive content gracefully."
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            className: "font-medium mb-2",
            children: "System Requirements"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600 text-sm mb-3",
            children: "The failure analysis revealed several critical system requirements that were not properly addressed in the original architecture. These requirements span multiple domains including performance, scalability, reliability, and security."
          }), /*#__PURE__*/_jsxs("ul", {
            className: "list-disc list-inside text-sm text-gray-600 space-y-1",
            children: [/*#__PURE__*/_jsx("li", {
              children: "Minimum response time: 200ms for 95th percentile"
            }), /*#__PURE__*/_jsx("li", {
              children: "Throughput capacity: 10,000 requests per second"
            }), /*#__PURE__*/_jsx("li", {
              children: "Availability target: 99.9% uptime"
            }), /*#__PURE__*/_jsx("li", {
              children: "Data consistency: Strong consistency for financial transactions"
            }), /*#__PURE__*/_jsx("li", {
              children: "Security compliance: SOC 2 Type II certification"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            className: "font-medium mb-2",
            children: "Architecture Overview"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-600 text-sm mb-3",
            children: "The proposed architecture implements a microservices pattern with event-driven communication and distributed caching to address the identified failure points."
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-gray-100 p-4 rounded text-sm font-mono",
            children: ["Frontend (React) \u2192 API Gateway \u2192 Auth Service", /*#__PURE__*/_jsx("br", {}), "\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\u2193", /*#__PURE__*/_jsx("br", {}), "User Service \u2190 Database \u2190 Message Queue"]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            className: "font-medium mb-2",
            children: "Implementation Timeline"
          }), /*#__PURE__*/_jsxs("div", {
            className: "text-sm text-gray-600 space-y-2",
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Phase 1 (Weeks 1-2):"
              }), " Infrastructure setup and database optimization"]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Phase 2 (Weeks 3-4):"
              }), " Service implementation and testing"]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Phase 3 (Weeks 5-6):"
              }), " Integration and deployment"]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Phase 4 (Week 7):"
              }), " Monitoring and performance validation"]
            })]
          })]
        })]
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Section with extensive content to test scrolling and layout.'
      }
    }
  }
};