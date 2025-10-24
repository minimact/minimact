import FailSquareSidebar from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareSidebar.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Layout Components/FailSquareSidebar',
  component: FailSquareSidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main navigation sidebar for FailSquare with collapsible design, merit indicators, notification badges, and user profile integration.'
      }
    }
  },
  argTypes: {
    userName: {
      control: 'text',
      description: 'Name of the current user'
    },
    onNavigate: {
      action: 'navigate',
      description: 'Callback when navigation item is clicked'
    }
  }
};
export default meta;
export const Default = {
  args: {
    userName: 'Dr. Sarah Chen'
  },
  render: args => /*#__PURE__*/_jsx("div", {
    className: "h-screen bg-gray-50",
    children: /*#__PURE__*/_jsx(FailSquareSidebar, {
      ...args
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Default sidebar with user profile and all navigation sections.'
      }
    }
  }
};
export const WithoutUser = {
  args: {},
  render: args => /*#__PURE__*/_jsx("div", {
    className: "h-screen bg-gray-50",
    children: /*#__PURE__*/_jsx(FailSquareSidebar, {
      ...args
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Sidebar without user profile section.'
      }
    }
  }
};
export const FullApplication = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "h-screen flex bg-gray-50",
    children: [/*#__PURE__*/_jsx(FailSquareSidebar, {
      userName: "Dr. Sarah Chen",
      onNavigate: item => console.log('Navigated to:', item)
    }), /*#__PURE__*/_jsx("div", {
      className: "flex-1 p-8",
      children: /*#__PURE__*/_jsxs("div", {
        className: "max-w-4xl",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "text-3xl font-bold text-gray-900 mb-6",
          children: "FailSquare Dashboard"
        }), /*#__PURE__*/_jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "bg-white p-6 rounded-lg shadow-sm border",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-gray-900 mb-2",
              children: "Recent Analyses"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm",
              children: "5 new failure analyses this week"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-white p-6 rounded-lg shadow-sm border",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-gray-900 mb-2",
              children: "Merit Score"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm",
              children: "Current score: 4.2/5.0"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "bg-white p-6 rounded-lg shadow-sm border",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-gray-900 mb-2",
              children: "Community"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm",
              children: "8 new notifications"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-white p-6 rounded-lg shadow-sm border",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-xl font-semibold text-gray-900 mb-4",
            children: "Recent Failure Analyses"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "border-l-4 border-red-500 pl-4",
              children: [/*#__PURE__*/_jsx("h3", {
                className: "font-medium text-gray-900",
                children: "Database Connection Timeout"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Critical failure in production environment affecting 12,000 users"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
                children: [/*#__PURE__*/_jsx("span", {
                  children: "2 hours ago"
                }), /*#__PURE__*/_jsx("span", {
                  children: "Merit: 4.8/5"
                }), /*#__PURE__*/_jsx("span", {
                  children: "15 forks"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border-l-4 border-orange-500 pl-4",
              children: [/*#__PURE__*/_jsx("h3", {
                className: "font-medium text-gray-900",
                children: "API Gateway Rate Limiting"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "High priority issue with external API integration"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
                children: [/*#__PURE__*/_jsx("span", {
                  children: "1 day ago"
                }), /*#__PURE__*/_jsx("span", {
                  children: "Merit: 4.2/5"
                }), /*#__PURE__*/_jsx("span", {
                  children: "8 forks"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "border-l-4 border-yellow-500 pl-4",
              children: [/*#__PURE__*/_jsx("h3", {
                className: "font-medium text-gray-900",
                children: "Frontend Memory Leak"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-gray-600 text-sm mt-1",
                children: "Medium priority React component optimization needed"
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-4 mt-2 text-xs text-gray-500",
                children: [/*#__PURE__*/_jsx("span", {
                  children: "3 days ago"
                }), /*#__PURE__*/_jsx("span", {
                  children: "Merit: 3.9/5"
                }), /*#__PURE__*/_jsx("span", {
                  children: "5 forks"
                })]
              })]
            })]
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Complete application layout with sidebar and main content area.'
      }
    }
  }
};
export const CollapsibleDemo = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "h-screen flex bg-gray-50",
    children: [/*#__PURE__*/_jsx(FailSquareSidebar, {
      userName: "Mike Johnson",
      onNavigate: item => console.log('Navigated to:', item)
    }), /*#__PURE__*/_jsx("div", {
      className: "flex-1 p-8",
      children: /*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg shadow-sm border",
        children: [/*#__PURE__*/_jsx("h2", {
          className: "text-xl font-semibold text-gray-900 mb-4",
          children: "Collapsible Sidebar Demo"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-600 mb-4",
          children: "Click the arrow button on the sidebar to toggle between expanded and collapsed states. The sidebar preserves functionality while saving space when collapsed."
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-2 text-sm text-gray-600",
          children: [/*#__PURE__*/_jsxs("p", {
            children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
              children: "Expanded:"
            }), " Shows full navigation labels and user profile"]
          }), /*#__PURE__*/_jsxs("p", {
            children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
              children: "Collapsed:"
            }), " Shows only icons with preserved functionality"]
          }), /*#__PURE__*/_jsxs("p", {
            children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
              children: "Notifications:"
            }), " Badge counts remain visible in both states"]
          }), /*#__PURE__*/_jsxs("p", {
            children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
              children: "Merit scores:"
            }), " Hidden when collapsed to save space"]
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing collapsible sidebar functionality.'
      }
    }
  }
};
export const NavigationStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "h-screen flex bg-gray-50",
    children: [/*#__PURE__*/_jsx(FailSquareSidebar, {
      userName: "Emily Rodriguez",
      onNavigate: item => console.log('Navigation event:', item)
    }), /*#__PURE__*/_jsx("div", {
      className: "flex-1 p-8",
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-6",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "bg-white p-6 rounded-lg shadow-sm border",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-xl font-semibold text-gray-900 mb-4",
            children: "Navigation Features"
          }), /*#__PURE__*/_jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-6",
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h3", {
                className: "font-medium text-gray-900 mb-3",
                children: "Main Navigation"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "space-y-2 text-sm text-gray-600",
                children: [/*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Home:"
                  }), " Dashboard and overview"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Explore:"
                  }), " Discover new analyses"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Search:"
                  }), " Find specific content"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "My Forks:"
                  }), " Personal analysis forks with merit score"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Idea Tree:"
                  }), " Visualization of analysis relationships"]
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h3", {
                className: "font-medium text-gray-900 mb-3",
                children: "Community Section"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "space-y-2 text-sm text-gray-600",
                children: [/*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Trending:"
                  }), " Popular analyses with notification badge"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "Substacks:"
                  }), " Curated analysis collections"]
                }), /*#__PURE__*/_jsxs("li", {
                  children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
                    children: "People:"
                  }), " Community member profiles"]
                })]
              })]
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-white p-6 rounded-lg shadow-sm border",
          children: [/*#__PURE__*/_jsx("h3", {
            className: "font-medium text-gray-900 mb-3",
            children: "Interactive Elements"
          }), /*#__PURE__*/_jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "p-4 bg-blue-50 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-blue-900 mb-2",
                children: "Merit Scores"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-blue-700 text-sm",
                children: "Yellow badges show your merit score for forked analyses"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "p-4 bg-red-50 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-red-900 mb-2",
                children: "Notifications"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-red-700 text-sm",
                children: "Red badges indicate unread notifications and updates"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "p-4 bg-green-50 rounded",
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium text-green-900 mb-2",
                children: "User Profile"
              }), /*#__PURE__*/_jsx("p", {
                className: "text-green-700 text-sm",
                children: "Quick access to profile and account settings"
              })]
            })]
          })]
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Detailed overview of navigation features and interactive elements.'
      }
    }
  }
};
export const DifferentUsers = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 bg-gray-50 min-h-screen",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold text-gray-900 mb-4",
        children: "Admin User"
      }), /*#__PURE__*/_jsx("div", {
        className: "h-96 border border-gray-300 rounded-lg overflow-hidden",
        children: /*#__PURE__*/_jsx(FailSquareSidebar, {
          userName: "Admin User",
          onNavigate: item => console.log('Admin navigated to:', item)
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold text-gray-900 mb-4",
        children: "Regular User"
      }), /*#__PURE__*/_jsx("div", {
        className: "h-96 border border-gray-300 rounded-lg overflow-hidden",
        children: /*#__PURE__*/_jsx(FailSquareSidebar, {
          userName: "Jane Smith",
          onNavigate: item => console.log('User navigated to:', item)
        })
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of sidebar with different user types.'
      }
    }
  }
};
export const ResponsiveLayout = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-8 bg-gray-50 min-h-screen p-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold text-gray-900 mb-4",
        children: "Desktop Layout"
      }), /*#__PURE__*/_jsx("div", {
        className: "border border-gray-300 rounded-lg overflow-hidden",
        style: {
          height: '400px'
        },
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex h-full",
          children: [/*#__PURE__*/_jsx(FailSquareSidebar, {
            userName: "Desktop User",
            onNavigate: item => console.log('Desktop navigation:', item)
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1 p-6 bg-white",
            children: [/*#__PURE__*/_jsx("h4", {
              className: "font-medium text-gray-900 mb-2",
              children: "Main Content Area"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm",
              children: "Full sidebar with all features visible on desktop screens."
            })]
          })]
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold text-gray-900 mb-4",
        children: "Tablet Layout (Collapsed)"
      }), /*#__PURE__*/_jsx("div", {
        className: "border border-gray-300 rounded-lg overflow-hidden",
        style: {
          height: '300px'
        },
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex h-full",
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              width: '64px'
            },
            children: /*#__PURE__*/_jsx(FailSquareSidebar, {
              userName: "Tablet User",
              onNavigate: item => console.log('Tablet navigation:', item)
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1 p-6 bg-white",
            children: [/*#__PURE__*/_jsx("h4", {
              className: "font-medium text-gray-900 mb-2",
              children: "Tablet Content"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600 text-sm",
              children: "Collapsed sidebar saves space on smaller screens while maintaining functionality."
            })]
          })]
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
export const NotificationStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "h-screen flex bg-gray-50",
    children: [/*#__PURE__*/_jsx(FailSquareSidebar, {
      userName: "Notification Demo",
      onNavigate: item => console.log('Navigation with notifications:', item)
    }), /*#__PURE__*/_jsx("div", {
      className: "flex-1 p-8",
      children: /*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg shadow-sm border",
        children: [/*#__PURE__*/_jsx("h2", {
          className: "text-xl font-semibold text-gray-900 mb-4",
          children: "Notification System"
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-blue-50 border border-blue-200 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-blue-900 mb-2",
              children: "Trending (3 notifications)"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-blue-700 text-sm",
              children: "Red badge indicates 3 new trending analyses in your areas of interest."
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-red-50 border border-red-200 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-red-900 mb-2",
              children: "Notifications (5 notifications)"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-red-700 text-sm",
              children: "Badge shows 5 unread notifications including comments, forks, and mentions."
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-yellow-50 border border-yellow-200 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-yellow-900 mb-2",
              children: "Merit Score (4.2)"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-yellow-700 text-sm",
              children: "Yellow badge on \"My Forks\" shows your current merit score for forked analyses."
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "mt-6 p-4 bg-gray-50 rounded",
          children: /*#__PURE__*/_jsxs("p", {
            className: "text-gray-600 text-sm",
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Note:"
            }), " Notification badges automatically update as new activities occur. Merit scores reflect the quality and engagement of your contributed analyses."]
          })
        })]
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Detailed view of notification badges and merit score system.'
      }
    }
  }
};
export const FixedHeight = {
  args: {
    userName: 'Fixed Height Demo'
  },
  render: args => /*#__PURE__*/_jsx("div", {
    style: {
      height: '600px'
    },
    className: "border border-gray-300 rounded-lg overflow-hidden bg-white",
    children: /*#__PURE__*/_jsx(FailSquareSidebar, {
      ...args
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Sidebar in a fixed height container to show scrollable content area.'
      }
    }
  }
};