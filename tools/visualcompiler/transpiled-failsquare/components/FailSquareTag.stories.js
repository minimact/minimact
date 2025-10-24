import FailSquareTag from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareTag.js';
import { BugOutlined, ExperimentOutlined, DatabaseOutlined, ApiOutlined, CloudOutlined, SecurityScanOutlined, MobileOutlined, CodeOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquareTag',
  component: FailSquareTag,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Interactive tag component for FailSquare. Used for categorizing failures, showing keywords, and creating filterable labels.'
      }
    }
  },
  argTypes: {
    interactive: {
      control: 'boolean',
      description: 'Makes the tag clickable with hover effects'
    },
    onClick: {
      action: 'tag-clicked',
      description: 'Callback when interactive tag is clicked'
    }
  }
};
export default meta;
export const Default = {
  args: {
    children: 'Machine Learning'
  }
};
export const WithIcon = {
  args: {
    iconName: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
    children: 'Experimental'
  },
  parameters: {
    docs: {
      description: {
        story: 'Tag with an icon for better visual categorization.'
      }
    }
  }
};
export const Interactive = {
  args: {
    interactive: true,
    iconName: /*#__PURE__*/_jsx(BugOutlined, {}),
    children: 'Bug Report',
    onClick: () => console.log('Bug Report tag clicked!')
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive tag that responds to clicks.'
      }
    }
  }
};
export const FailureCategories = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex flex-wrap gap-2",
    children: [/*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
      children: "Database"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(ApiOutlined, {}),
      children: "API"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(CloudOutlined, {}),
      children: "Infrastructure"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
      children: "Security"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(MobileOutlined, {}),
      children: "Frontend"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(CodeOutlined, {}),
      children: "Backend"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Collection of interactive tags for different failure categories.'
      }
    }
  }
};
export const Severity = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex flex-wrap gap-2",
    children: [/*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-red-100 text-red-800 border-red-200",
      children: "Critical"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-orange-100 text-orange-800 border-orange-200",
      children: "High"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      children: "Medium"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-green-100 text-green-800 border-green-200",
      children: "Low"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-gray-100 text-gray-800 border-gray-200",
      children: "Info"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Tags with different colors to indicate severity levels.'
      }
    }
  }
};
export const Technologies = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-3",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "text-sm font-medium text-gray-700 mb-2",
        children: "Frontend Technologies"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "React"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "TypeScript"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Tailwind CSS"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Ant Design"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "text-sm font-medium text-gray-700 mb-2",
        children: "Backend Technologies"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Node.js"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Express"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "PostgreSQL"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Redis"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "text-sm font-medium text-gray-700 mb-2",
        children: "Infrastructure"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "AWS"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Docker"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Kubernetes"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "Nginx"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Organized tags for different technology categories.'
      }
    }
  }
};
export const FilterTags = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "text-sm font-medium text-gray-700 mb-2",
        children: "Active Filters:"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          iconName: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
          className: "bg-blue-100 text-blue-800 border-blue-200",
          onClick: () => console.log('Remove Database filter'),
          children: "Database \xD7"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          className: "bg-red-100 text-red-800 border-red-200",
          onClick: () => console.log('Remove Critical filter'),
          children: "Critical \xD7"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          className: "bg-green-100 text-green-800 border-green-200",
          onClick: () => console.log('Remove Last Week filter'),
          children: "Last Week \xD7"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx("h4", {
        className: "text-sm font-medium text-gray-700 mb-2",
        children: "Available Filters:"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          iconName: /*#__PURE__*/_jsx(ApiOutlined, {}),
          children: "API"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          iconName: /*#__PURE__*/_jsx(CloudOutlined, {}),
          children: "Infrastructure"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          iconName: /*#__PURE__*/_jsx(SecurityScanOutlined, {}),
          children: "Security"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "High Priority"
        }), /*#__PURE__*/_jsx(FailSquareTag, {
          interactive: true,
          children: "This Month"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Tags used as filters with active and available states.'
      }
    }
  }
};
export const LongText = {
  args: {
    interactive: true,
    children: 'Very Long Technology Name That Might Wrap'
  },
  parameters: {
    docs: {
      description: {
        story: 'Tag with longer text to test wrapping behavior.'
      }
    }
  }
};
export const Mixed = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex flex-wrap gap-2",
    children: [/*#__PURE__*/_jsx(FailSquareTag, {
      children: "Static Tag"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      children: "Interactive Tag"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      iconName: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      children: "With Icon"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      interactive: true,
      iconName: /*#__PURE__*/_jsx(BugOutlined, {}),
      children: "Interactive + Icon"
    }), /*#__PURE__*/_jsx(FailSquareTag, {
      className: "bg-purple-100 text-purple-800 border-purple-200",
      children: "Custom Style"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Mix of different tag configurations and styles.'
      }
    }
  }
};