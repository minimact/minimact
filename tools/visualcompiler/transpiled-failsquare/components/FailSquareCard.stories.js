import FailSquareCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareCard.js';
import { Button, Avatar, Tag } from 'antd';
import { UserOutlined, HeartOutlined, ShareAltOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquareCard',
  component: FailSquareCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Versatile card component for FailSquare. Supports headers, footers, interactive states, and various content layouts for failure documentation display.'
      }
    }
  },
  argTypes: {
    interactive: {
      control: 'boolean',
      description: 'Makes the card clickable with hover effects'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Content takes full width of the card'
    },
    onClick: {
      action: 'card-clicked',
      description: 'Callback when interactive card is clicked'
    }
  }
};
export default meta;
export const Default = {
  args: {
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "Default Card Content"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "This is a basic card with some content. Perfect for displaying failure documentation, user information, or any structured content in FailSquare."
      })]
    })
  }
};
export const WithHeader = {
  args: {
    headerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-xl font-bold",
        children: "Failure Analysis Report"
      }), /*#__PURE__*/_jsx(Tag, {
        color: "red",
        children: "Critical"
      })]
    }),
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("p", {
        className: "text-gray-700 mb-4",
        children: "Comprehensive analysis of the distributed system failure that occurred on March 15th. This report covers root causes, impact assessment, and prevention strategies."
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-2",
        children: [/*#__PURE__*/_jsx(Avatar, {
          size: "small",
          icon: /*#__PURE__*/_jsx(UserOutlined, {})
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-600",
          children: "Dr. Sarah Chen"
        })]
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with header content for titles and metadata.'
      }
    }
  }
};
export const WithFooter = {
  args: {
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "Machine Learning Model Failure"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600 mb-4",
        children: "Investigation into why our CNN failed to converge during training on the medical imaging dataset."
      })]
    }),
    footerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-4",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-500",
          children: "Merit Score: 4.2/5"
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-500",
          children: "12 Forks"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx(Button, {
          size: "small",
          icon: /*#__PURE__*/_jsx(HeartOutlined, {}),
          children: "Like"
        }), /*#__PURE__*/_jsx(Button, {
          size: "small",
          icon: /*#__PURE__*/_jsx(ShareAltOutlined, {}),
          children: "Share"
        })]
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with footer for actions and metadata.'
      }
    }
  }
};
export const HeaderAndFooter = {
  args: {
    headerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-3",
        children: [/*#__PURE__*/_jsx(Avatar, {
          src: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("div", {
            className: "font-semibold",
            children: "Dr. Sarah Chen"
          }), /*#__PURE__*/_jsx("div", {
            className: "text-sm text-gray-500",
            children: "2 hours ago"
          })]
        })]
      }), /*#__PURE__*/_jsx(Tag, {
        color: "blue",
        children: "Documentation"
      })]
    }),
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "API Gateway Timeout Investigation"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "Deep dive into the API gateway timeout issues we experienced during peak traffic. Includes analysis of request patterns, infrastructure bottlenecks, and proposed solutions."
      })]
    }),
    footerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-4",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-500",
          children: "Merit: 3.8/5"
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-500",
          children: "8 replies"
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-500",
          children: "15 forks"
        })]
      }), /*#__PURE__*/_jsx(Button, {
        type: "primary",
        size: "small",
        children: "View Details"
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete card with both header and footer sections.'
      }
    }
  }
};
export const Interactive = {
  args: {
    interactive: true,
    onClick: () => console.log('Card clicked!'),
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "Click Me!"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "This card is interactive. Hover over it to see the effect and click to trigger an action. Perfect for failure documentation that links to detailed views."
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive card with hover effects and click handler.'
      }
    }
  }
};
export const FullWidth = {
  args: {
    fullWidth: true,
    children: /*#__PURE__*/_jsxs("div", {
      className: "w-full",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "Full Width Content"
      }), /*#__PURE__*/_jsx("div", {
        className: "w-full bg-gray-100 p-4 rounded",
        children: /*#__PURE__*/_jsx("p", {
          className: "text-gray-600",
          children: "This content spans the full width of the card container. Useful for displaying wide content like code blocks, charts, or detailed technical diagrams."
        })
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with full-width content layout.'
      }
    }
  }
};
export const InteractiveWithHeaderFooter = {
  args: {
    interactive: true,
    onClick: () => console.log('Failure report clicked!'),
    headerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-xl font-bold",
        children: "Database Migration Failure"
      }), /*#__PURE__*/_jsx(Tag, {
        color: "orange",
        children: "High Priority"
      })]
    }),
    children: /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("p", {
        className: "text-gray-700 mb-3",
        children: "Critical failure during database migration that resulted in data corruption. Click to view the complete post-mortem analysis."
      }), /*#__PURE__*/_jsx("div", {
        className: "text-sm text-gray-500",
        children: "Impact: 30,000 users affected \u2022 Duration: 4 hours"
      })]
    }),
    footerContent: /*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-2",
        children: [/*#__PURE__*/_jsx(Avatar, {
          size: "small",
          icon: /*#__PURE__*/_jsx(UserOutlined, {})
        }), /*#__PURE__*/_jsx("span", {
          className: "text-sm text-gray-600",
          children: "Engineering Team"
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "text-sm text-gray-500",
        children: "Merit: 4.9/5"
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete interactive card combining all features.'
      }
    }
  }
};
export const MinimalContent = {
  args: {
    children: /*#__PURE__*/_jsxs("div", {
      className: "text-center py-8",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-lg font-semibold text-gray-500",
        children: "No Content Yet"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-400 text-sm",
        children: "This failure analysis is still being documented."
      })]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with minimal content for empty states.'
      }
    }
  }
};

// Layout example showing multiple cards
export const CardGrid = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
    children: [/*#__PURE__*/_jsx(FailSquareCard, {
      interactive: true,
      headerContent: /*#__PURE__*/_jsx("h3", {
        className: "font-semibold",
        children: "API Failure #1"
      }),
      children: /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "Authentication service timeout"
      })
    }), /*#__PURE__*/_jsx(FailSquareCard, {
      interactive: true,
      headerContent: /*#__PURE__*/_jsx("h3", {
        className: "font-semibold",
        children: "Database Issue"
      }),
      children: /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "Connection pool exhaustion"
      })
    }), /*#__PURE__*/_jsx(FailSquareCard, {
      interactive: true,
      headerContent: /*#__PURE__*/_jsx("h3", {
        className: "font-semibold",
        children: "UI Bug"
      }),
      children: /*#__PURE__*/_jsx("p", {
        className: "text-gray-600",
        children: "React component render error"
      })
    })]
  }),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Example grid layout with multiple cards.'
      }
    }
  }
};