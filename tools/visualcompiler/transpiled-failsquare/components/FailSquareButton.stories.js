import FailSquareButton, { ButtonVariant, ButtonSize } from './FailSquareButton';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, SearchOutlined, DownloadOutlined, ShareAltOutlined, BugOutlined, DatabaseOutlined, ApiOutlined, ExperimentOutlined, HeartOutlined, StarOutlined, SendOutlined, SettingOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareButton',
  component: FailSquareButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Enhanced button component for FailSquare with custom variants including Teal and Intro styles, plus special features for failure documentation workflows.'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(ButtonVariant),
      description: 'Button style variant'
    },
    size: {
      control: 'select',
      options: Object.values(ButtonSize),
      description: 'Button size'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button takes full width'
    },
    intro: {
      control: 'boolean',
      description: 'Special intro button with gradient styling'
    },
    onClick: {
      action: 'button-clicked',
      description: 'Click handler function'
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'HTML button type'
    }
  }
};
export default meta;
export const Primary = {
  args: {
    children: 'Primary Button',
    variant: ButtonVariant.Primary
  },
  parameters: {
    docs: {
      description: {
        story: 'Primary button for main actions.'
      }
    }
  }
};
export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: ButtonVariant.Secondary
  },
  parameters: {
    docs: {
      description: {
        story: 'Secondary button for alternative actions.'
      }
    }
  }
};
export const Teal = {
  args: {
    children: 'Teal Button',
    variant: ButtonVariant.Teal
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom teal variant for special FailSquare actions.'
      }
    }
  }
};
export const Danger = {
  args: {
    children: 'Danger Button',
    variant: ButtonVariant.Danger
  },
  parameters: {
    docs: {
      description: {
        story: 'Danger button for destructive actions.'
      }
    }
  }
};
export const Intro = {
  args: {
    children: 'Get Started with FailSquare',
    intro: true,
    size: ButtonSize.Large
  },
  parameters: {
    docs: {
      description: {
        story: 'Special intro button with gradient styling for landing pages.'
      }
    }
  }
};
export const WithIcons = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex flex-wrap gap-3",
    children: [/*#__PURE__*/_jsx(FailSquareButton, {
      iconName: /*#__PURE__*/_jsx(PlusOutlined, {}),
      variant: ButtonVariant.Primary,
      children: "Create Analysis"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      iconName: /*#__PURE__*/_jsx(EditOutlined, {}),
      variant: ButtonVariant.Secondary,
      children: "Edit"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      iconName: /*#__PURE__*/_jsx(DeleteOutlined, {}),
      variant: ButtonVariant.Danger,
      children: "Delete"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      iconName: /*#__PURE__*/_jsx(SaveOutlined, {}),
      variant: ButtonVariant.Teal,
      children: "Save"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Buttons with icons for different actions.'
      }
    }
  }
};
export const Sizes = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex items-end gap-3",
    children: [/*#__PURE__*/_jsx(FailSquareButton, {
      size: ButtonSize.Small,
      children: "Small"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      size: ButtonSize.Medium,
      children: "Medium"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      size: ButtonSize.Large,
      children: "Large"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Different button sizes available.'
      }
    }
  }
};
export const States = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "flex flex-wrap gap-3",
    children: [/*#__PURE__*/_jsx(FailSquareButton, {
      children: "Normal"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      disabled: true,
      children: "Disabled"
    }), /*#__PURE__*/_jsx(FailSquareButton, {
      fullWidth: true,
      children: "Full Width"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Different button states and modifiers.'
      }
    }
  }
};
export const FailureAnalysisActions = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Primary Actions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(PlusOutlined, {}),
          variant: ButtonVariant.Primary,
          children: "New Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(SaveOutlined, {}),
          variant: ButtonVariant.Teal,
          children: "Publish Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(SearchOutlined, {}),
          variant: ButtonVariant.Secondary,
          children: "Search Failures"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Analysis Tools"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(BugOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Add Bug Report"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(DatabaseOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Database Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(ApiOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "API Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Experiment Fork"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Destructive Actions"
      }), /*#__PURE__*/_jsx("div", {
        className: "flex flex-wrap gap-2",
        children: /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(DeleteOutlined, {}),
          variant: ButtonVariant.Danger,
          size: ButtonSize.Small,
          children: "Delete Analysis"
        })
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Common button combinations for failure analysis workflows.'
      }
    }
  }
};
export const FormActions = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "bg-gray-50 p-4 rounded",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium mb-3",
        children: "Analysis Form"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex justify-end gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          variant: ButtonVariant.Secondary,
          children: "Save Draft"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          variant: ButtonVariant.Primary,
          type: "submit",
          children: "Submit Analysis"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "bg-gray-50 p-4 rounded",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium mb-3",
        children: "Quick Actions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "grid grid-cols-2 gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          fullWidth: true,
          variant: ButtonVariant.Teal,
          children: "Quick Save"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          fullWidth: true,
          variant: ButtonVariant.Secondary,
          children: "Preview"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Form action buttons in typical layouts.'
      }
    }
  }
};
export const SocialActions = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Engagement Actions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(HeartOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Like (24)"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(StarOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Star"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(ShareAltOutlined, {}),
          variant: ButtonVariant.Secondary,
          size: ButtonSize.Small,
          children: "Share"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(SendOutlined, {}),
          variant: ButtonVariant.Teal,
          size: ButtonSize.Small,
          children: "Fork Analysis"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Export & Download"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(DownloadOutlined, {}),
          variant: ButtonVariant.Secondary,
          children: "Download PDF"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(DownloadOutlined, {}),
          variant: ButtonVariant.Secondary,
          children: "Export Data"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Social and sharing action buttons.'
      }
    }
  }
};
export const LoadingStates = {
  render: () => /*#__PURE__*/_jsx("div", {
    className: "space-y-4",
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Loading Simulation"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-wrap gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          disabled: true,
          children: "Publishing..."
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          disabled: true,
          iconName: /*#__PURE__*/_jsx(SaveOutlined, {}),
          children: "Saving..."
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          disabled: true,
          variant: ButtonVariant.Teal,
          children: "Processing Analysis..."
        })]
      })]
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Buttons in loading/disabled states during async operations.'
      }
    }
  }
};
export const IntroButtons = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-6 text-center",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsx(FailSquareButton, {
        intro: true,
        size: ButtonSize.Large,
        children: "Start Your First Analysis"
      }), /*#__PURE__*/_jsx(FailSquareButton, {
        intro: true,
        children: "Join the FailSquare Community"
      }), /*#__PURE__*/_jsx(FailSquareButton, {
        intro: true,
        size: ButtonSize.Small,
        children: "Learn More"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "pt-4 border-t",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700 mb-3",
        children: "Landing Page Actions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex justify-center gap-3",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          intro: true,
          iconName: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
          children: "Try Demo"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          variant: ButtonVariant.Secondary,
          children: "Watch Video"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Special intro buttons with gradient styling for landing pages.'
      }
    }
  }
};
export const ResponsiveLayout = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Mobile Layout"
      }), /*#__PURE__*/_jsxs("div", {
        className: "max-w-xs space-y-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          fullWidth: true,
          iconName: /*#__PURE__*/_jsx(PlusOutlined, {}),
          children: "Create New Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          fullWidth: true,
          variant: ButtonVariant.Secondary,
          children: "Browse Existing"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          fullWidth: true,
          variant: ButtonVariant.Teal,
          children: "Quick Templates"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Desktop Layout"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(PlusOutlined, {}),
          children: "Create New Analysis"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          variant: ButtonVariant.Secondary,
          children: "Browse Existing"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          variant: ButtonVariant.Teal,
          children: "Quick Templates"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          iconName: /*#__PURE__*/_jsx(SettingOutlined, {}),
          variant: ButtonVariant.Secondary,
          children: "Settings"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Responsive button layouts for different screen sizes.'
      }
    }
  }
};