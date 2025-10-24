import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareNavItem from './FailSquareNavItem';
import { HomeOutlined, CompassOutlined, SearchOutlined, BranchesOutlined, AppstoreOutlined, ThunderboltOutlined, BookOutlined, TeamOutlined, BellOutlined, SettingOutlined, DatabaseOutlined, ApiOutlined, BugOutlined, SecurityScanOutlined, ExperimentOutlined, CodeOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Layout Components/FailSquareNavItem',
  component: FailSquareNavItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Individual navigation item component for FailSquare with merit indicators, notification badges, active states, and collapsible support.'
      }
    }
  },
  argTypes: {
    isCollapsed: {
      control: 'boolean',
      description: 'Whether the navigation is in collapsed state'
    },
    onClick: {
      action: 'nav-item-clicked',
      description: 'Callback when navigation item is clicked'
    },
    item: {
      description: 'Navigation item configuration object'
    }
  }
};
export default meta;
const basicItem = {
  id: 'home',
  label: 'Home',
  icon: /*#__PURE__*/_jsx(HomeOutlined, {})
};
export const Default = {
  args: {
    item: basicItem,
    isCollapsed: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic navigation item with icon and label.'
      }
    }
  }
};
export const Active = {
  args: {
    item: {
      ...basicItem,
      isActive: true
    },
    isCollapsed: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation item in active state with blue highlighting.'
      }
    }
  }
};
export const WithNotification = {
  args: {
    item: {
      id: 'trending',
      label: 'Trending',
      icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
      notificationCount: 5
    },
    isCollapsed: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation item with notification badge.'
      }
    }
  }
};
export const WithMerit = {
  args: {
    item: {
      id: 'forks',
      label: 'My Forks',
      icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
      merit: 4.2
    },
    isCollapsed: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation item with merit score indicator.'
      }
    }
  }
};
export const WithBoth = {
  args: {
    item: {
      id: 'notifications',
      label: 'Notifications',
      icon: /*#__PURE__*/_jsx(BellOutlined, {}),
      merit: 3.8,
      notificationCount: 12
    },
    isCollapsed: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation item with both merit score and notification badge.'
      }
    }
  }
};
export const Collapsed = {
  args: {
    item: {
      id: 'explore',
      label: 'Explore',
      icon: /*#__PURE__*/_jsx(CompassOutlined, {}),
      notificationCount: 3
    },
    isCollapsed: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation item in collapsed state (icon only).'
      }
    }
  }
};
export const NavigationStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-sm bg-white border border-gray-200 rounded-lg p-2",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "px-2 text-sm font-medium text-gray-700",
      children: "Navigation States"
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'home',
        label: 'Home',
        icon: /*#__PURE__*/_jsx(HomeOutlined, {}),
        isActive: true
      },
      onClick: () => console.log('Home clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'explore',
        label: 'Explore',
        icon: /*#__PURE__*/_jsx(CompassOutlined, {})
      },
      onClick: () => console.log('Explore clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'search',
        label: 'Search',
        icon: /*#__PURE__*/_jsx(SearchOutlined, {})
      },
      onClick: () => console.log('Search clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'forks',
        label: 'My Forks',
        icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
        merit: 4.2
      },
      onClick: () => console.log('Forks clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'trending',
        label: 'Trending',
        icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
        notificationCount: 8
      },
      onClick: () => console.log('Trending clicked')
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Collection of navigation items showing different states.'
      }
    }
  }
};
export const FailureCategories = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-sm bg-white border border-gray-200 rounded-lg p-2",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "px-2 text-sm font-medium text-gray-700",
      children: "Failure Categories"
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'database',
        label: 'Database Issues',
        icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
        notificationCount: 5,
        merit: 4.5
      },
      onClick: () => console.log('Database clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'api',
        label: 'API Problems',
        icon: /*#__PURE__*/_jsx(ApiOutlined, {}),
        merit: 3.8
      },
      onClick: () => console.log('API clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'bugs',
        label: 'Bug Reports',
        icon: /*#__PURE__*/_jsx(BugOutlined, {}),
        notificationCount: 12
      },
      onClick: () => console.log('Bugs clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'security',
        label: 'Security Issues',
        icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
        notificationCount: 2,
        merit: 4.9,
        isActive: true
      },
      onClick: () => console.log('Security clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'experiments',
        label: 'Experiments',
        icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
        merit: 3.2
      },
      onClick: () => console.log('Experiments clicked')
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Navigation items for different failure categories with metrics.'
      }
    }
  }
};
export const CollapsedComparison = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-2 gap-8",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "mb-4 text-sm font-medium text-gray-700",
        children: "Expanded Navigation"
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-white border border-gray-200 rounded-lg p-2 space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'home',
            label: 'Home Dashboard',
            icon: /*#__PURE__*/_jsx(HomeOutlined, {}),
            isActive: true
          },
          isCollapsed: false
        }), /*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'forks',
            label: 'My Analysis Forks',
            icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
            merit: 4.2
          },
          isCollapsed: false
        }), /*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'notifications',
            label: 'Notifications',
            icon: /*#__PURE__*/_jsx(BellOutlined, {}),
            notificationCount: 15
          },
          isCollapsed: false
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "mb-4 text-sm font-medium text-gray-700",
        children: "Collapsed Navigation"
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-white border border-gray-200 rounded-lg p-2 space-y-2 w-16",
        children: [/*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'home',
            label: 'Home Dashboard',
            icon: /*#__PURE__*/_jsx(HomeOutlined, {}),
            isActive: true
          },
          isCollapsed: true
        }), /*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'forks',
            label: 'My Analysis Forks',
            icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
            merit: 4.2
          },
          isCollapsed: true
        }), /*#__PURE__*/_jsx(FailSquareNavItem, {
          item: {
            id: 'notifications',
            label: 'Notifications',
            icon: /*#__PURE__*/_jsx(BellOutlined, {}),
            notificationCount: 15
          },
          isCollapsed: true
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of expanded vs collapsed navigation items.'
      }
    }
  }
};
export const HighNotificationCounts = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-sm bg-white border border-gray-200 rounded-lg p-2",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "px-2 text-sm font-medium text-gray-700",
      children: "High Activity Items"
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'critical',
        label: 'Critical Failures',
        icon: /*#__PURE__*/_jsx(BugOutlined, {}),
        notificationCount: 99,
        merit: 4.8
      },
      onClick: () => console.log('Critical failures clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'trending',
        label: 'Trending Analyses',
        icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
        notificationCount: 156
      },
      onClick: () => console.log('Trending clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'mentions',
        label: 'Mentions & Replies',
        icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
        notificationCount: 42
      },
      onClick: () => console.log('Mentions clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'reviews',
        label: 'Peer Reviews',
        icon: /*#__PURE__*/_jsx(BookOutlined, {}),
        notificationCount: 7,
        merit: 4.1
      },
      onClick: () => console.log('Reviews clicked')
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Navigation items with high notification counts and merit scores.'
      }
    }
  }
};
export const TechnicalNavigation = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-sm bg-white border border-gray-200 rounded-lg p-2",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "px-2 text-sm font-medium text-gray-700",
      children: "Technical Categories"
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'infrastructure',
        label: 'Infrastructure',
        icon: /*#__PURE__*/_jsx(AppstoreOutlined, {}),
        merit: 3.9,
        isActive: true
      },
      onClick: () => console.log('Infrastructure clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'backend',
        label: 'Backend Services',
        icon: /*#__PURE__*/_jsx(CodeOutlined, {}),
        notificationCount: 8,
        merit: 4.3
      },
      onClick: () => console.log('Backend clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'database',
        label: 'Database Layer',
        icon: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
        notificationCount: 3,
        merit: 4.7
      },
      onClick: () => console.log('Database clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'security',
        label: 'Security & Auth',
        icon: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
        notificationCount: 1,
        merit: 4.9
      },
      onClick: () => console.log('Security clicked')
    }), /*#__PURE__*/_jsx(FailSquareNavItem, {
      item: {
        id: 'apis',
        label: 'API Integration',
        icon: /*#__PURE__*/_jsx(ApiOutlined, {}),
        merit: 3.7
      },
      onClick: () => console.log('APIs clicked')
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Technical navigation categories with specialized icons and metrics.'
      }
    }
  }
};
export const UserPersonalization = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-6",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-sm bg-white border border-gray-200 rounded-lg p-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "px-2 text-sm font-medium text-gray-700",
        children: "My Workspace"
      }), /*#__PURE__*/_jsx(FailSquareNavItem, {
        item: {
          id: 'my-analyses',
          label: 'My Analyses',
          icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          merit: 4.1,
          isActive: true
        },
        onClick: () => console.log('My analyses clicked')
      }), /*#__PURE__*/_jsx(FailSquareNavItem, {
        item: {
          id: 'my-forks',
          label: 'My Forks',
          icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
          merit: 3.8,
          notificationCount: 5
        },
        onClick: () => console.log('My forks clicked')
      }), /*#__PURE__*/_jsx(FailSquareNavItem, {
        item: {
          id: 'bookmarks',
          label: 'Bookmarked',
          icon: /*#__PURE__*/_jsx(BookOutlined, {})
        },
        onClick: () => console.log('Bookmarks clicked')
      }), /*#__PURE__*/_jsx(FailSquareNavItem, {
        item: {
          id: 'drafts',
          label: 'Draft Analyses',
          icon: /*#__PURE__*/_jsx(CompassOutlined, {}),
          notificationCount: 2
        },
        onClick: () => console.log('Drafts clicked')
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "text-sm text-gray-600 bg-blue-50 p-4 rounded",
      children: [/*#__PURE__*/_jsx("p", {
        className: "font-medium mb-2",
        children: "Merit Score System:"
      }), /*#__PURE__*/_jsxs("ul", {
        className: "space-y-1 text-xs",
        children: [/*#__PURE__*/_jsxs("li", {
          children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
            children: "0-2:"
          }), " Beginner level contributions"]
        }), /*#__PURE__*/_jsxs("li", {
          children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
            children: "2-3:"
          }), " Developing expertise"]
        }), /*#__PURE__*/_jsxs("li", {
          children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
            children: "3-4:"
          }), " Skilled contributor"]
        }), /*#__PURE__*/_jsxs("li", {
          children: ["\u2022 ", /*#__PURE__*/_jsx("strong", {
            children: "4-5:"
          }), " Expert level insights"]
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Personalized navigation items showing user-specific content and merit scores.'
      }
    }
  }
};
export const InteractiveDemo = {
  render: () => {
    const [activeItem, setActiveItem] = React.useState('home');
    const navItems = [{
      id: 'home',
      label: 'Dashboard',
      icon: /*#__PURE__*/_jsx(HomeOutlined, {})
    }, {
      id: 'explore',
      label: 'Explore',
      icon: /*#__PURE__*/_jsx(CompassOutlined, {}),
      notificationCount: 3
    }, {
      id: 'forks',
      label: 'My Forks',
      icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
      merit: 4.2
    }, {
      id: 'trending',
      label: 'Trending',
      icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
      notificationCount: 7,
      merit: 3.9
    }, {
      id: 'settings',
      label: 'Settings',
      icon: /*#__PURE__*/_jsx(SettingOutlined, {})
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "max-w-sm bg-white border border-gray-200 rounded-lg p-2",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "px-2 mb-3 text-sm font-medium text-gray-700",
          children: "Interactive Navigation"
        }), /*#__PURE__*/_jsx("div", {
          className: "space-y-1",
          children: navItems.map(item => /*#__PURE__*/_jsx(FailSquareNavItem, {
            item: {
              ...item,
              isActive: activeItem === item.id
            },
            onClick: () => setActiveItem(item.id)
          }, item.id))
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-green-50 border border-green-200 rounded",
        children: [/*#__PURE__*/_jsxs("p", {
          className: "text-green-800 text-sm",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Active Item:"
          }), " ", navItems.find(item => item.id === activeItem)?.label || 'None']
        }), /*#__PURE__*/_jsx("p", {
          className: "text-green-700 text-xs mt-1",
          children: "Click any navigation item above to see the active state change."
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing navigation item state changes.'
      }
    }
  }
};