import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareCheckbox from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareCheckbox.js';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareCheckbox',
  component: FailSquareCheckbox,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Custom checkbox component for FailSquare with both controlled and uncontrolled modes, custom styling, and accessibility features.'
      }
    }
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Controlled checked state'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled'
    },
    onCheckedChange: {
      action: 'checked-changed',
      description: 'Callback when checked state changes'
    },
    children: {
      control: 'text',
      description: 'Label content'
    }
  }
};
export default meta;
export const Default = {
  args: {
    children: 'Default checkbox'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic checkbox with label.'
      }
    }
  }
};
export const Checked = {
  args: {
    children: 'Checked checkbox',
    checked: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkbox in checked state.'
      }
    }
  }
};
export const Disabled = {
  args: {
    children: 'Disabled checkbox',
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled checkbox that cannot be interacted with.'
      }
    }
  }
};
export const DisabledChecked = {
  args: {
    children: 'Disabled checked checkbox',
    checked: true,
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled checkbox in checked state.'
      }
    }
  }
};
export const WithoutLabel = {
  args: {
    checked: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkbox without any label text.'
      }
    }
  }
};
export const ControlledExample = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs(FailSquareCheckbox, {
        checked: checked,
        onCheckedChange: setChecked,
        children: ["Controlled checkbox (checked: ", checked.toString(), ")"]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setChecked(true),
          className: "px-3 py-1 bg-blue-600 text-white rounded text-sm",
          children: "Check"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setChecked(false),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Uncheck"
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled checkbox with external state management.'
      }
    }
  }
};
export const UncontrolledExample = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Uncontrolled Checkboxes"
    }), /*#__PURE__*/_jsx("p", {
      className: "text-sm text-gray-600",
      children: "These checkboxes manage their own state internally."
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
        onCheckedChange: checked => console.log('Checkbox 1:', checked),
        children: "Uncontrolled checkbox 1"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        onCheckedChange: checked => console.log('Checkbox 2:', checked),
        children: "Uncontrolled checkbox 2"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        onCheckedChange: checked => console.log('Checkbox 3:', checked),
        children: "Uncontrolled checkbox 3"
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled checkboxes that manage their own state.'
      }
    }
  }
};
export const AnalysisSettings = {
  render: () => {
    const [settings, setSettings] = useState({
      includeStackTrace: true,
      includeLogs: false,
      includeMetrics: true,
      includeTimeline: false,
      notifyOnCompletion: true
    });
    const updateSetting = key => checked => {
      setSettings(prev => ({
        ...prev,
        [key]: checked
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md space-y-4",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Analysis Settings"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: settings.includeStackTrace,
          onCheckedChange: updateSetting('includeStackTrace'),
          children: "Include stack traces in analysis"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: settings.includeLogs,
          onCheckedChange: updateSetting('includeLogs'),
          children: "Include application logs"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: settings.includeMetrics,
          onCheckedChange: updateSetting('includeMetrics'),
          children: "Include performance metrics"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: settings.includeTimeline,
          onCheckedChange: updateSetting('includeTimeline'),
          children: "Generate failure timeline"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: settings.notifyOnCompletion,
          onCheckedChange: updateSetting('notifyOnCompletion'),
          children: "Notify me when analysis is complete"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-6 p-4 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Current Settings:"
        }), /*#__PURE__*/_jsx("pre", {
          className: "mt-2 text-xs",
          children: JSON.stringify(settings, null, 2)
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkboxes for configuring failure analysis settings.'
      }
    }
  }
};
export const FilterOptions = {
  render: () => {
    const [filters, setFilters] = useState({
      showCritical: true,
      showHigh: true,
      showMedium: false,
      showLow: false,
      showResolved: false,
      showUnresolved: true
    });
    const updateFilter = key => checked => {
      setFilters(prev => ({
        ...prev,
        [key]: checked
      }));
    };
    const activeFilters = Object.entries(filters).filter(([_, checked]) => checked).length;
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center justify-between",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-gray-700",
          children: "Filter Failures"
        }), /*#__PURE__*/_jsxs("span", {
          className: "text-sm text-blue-600",
          children: [activeFilters, " active filters"]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h5", {
            className: "text-sm font-medium text-gray-600 mb-2",
            children: "Severity"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-2",
            children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showCritical,
              onCheckedChange: updateFilter('showCritical'),
              children: /*#__PURE__*/_jsxs("span", {
                className: "flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-3 h-3 bg-red-500 rounded-full"
                }), "Critical failures"]
              })
            }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showHigh,
              onCheckedChange: updateFilter('showHigh'),
              children: /*#__PURE__*/_jsxs("span", {
                className: "flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-3 h-3 bg-orange-500 rounded-full"
                }), "High priority failures"]
              })
            }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showMedium,
              onCheckedChange: updateFilter('showMedium'),
              children: /*#__PURE__*/_jsxs("span", {
                className: "flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-3 h-3 bg-yellow-500 rounded-full"
                }), "Medium priority failures"]
              })
            }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showLow,
              onCheckedChange: updateFilter('showLow'),
              children: /*#__PURE__*/_jsxs("span", {
                className: "flex items-center gap-2",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-3 h-3 bg-green-500 rounded-full"
                }), "Low priority failures"]
              })
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h5", {
            className: "text-sm font-medium text-gray-600 mb-2",
            children: "Status"
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-2",
            children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showResolved,
              onCheckedChange: updateFilter('showResolved'),
              children: "Show resolved failures"
            }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
              checked: filters.showUnresolved,
              onCheckedChange: updateFilter('showUnresolved'),
              children: "Show unresolved failures"
            })]
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkboxes used for filtering failure lists with visual indicators.'
      }
    }
  }
};
export const Permissions = {
  render: () => {
    const [permissions, setPermissions] = useState({
      viewAnalyses: true,
      createAnalyses: true,
      editAnalyses: false,
      deleteAnalyses: false,
      manageTeam: false,
      adminAccess: false
    });
    const updatePermission = key => checked => {
      setPermissions(prev => ({
        ...prev,
        [key]: checked
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md space-y-4",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "User Permissions"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: permissions.viewAnalyses,
          onCheckedChange: updatePermission('viewAnalyses'),
          children: "View failure analyses"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: permissions.createAnalyses,
          onCheckedChange: updatePermission('createAnalyses'),
          children: "Create new analyses"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: permissions.editAnalyses,
          onCheckedChange: updatePermission('editAnalyses'),
          children: "Edit existing analyses"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: permissions.deleteAnalyses,
          onCheckedChange: updatePermission('deleteAnalyses'),
          className: "text-red-600",
          children: "Delete analyses (destructive)"
        }), /*#__PURE__*/_jsxs("div", {
          className: "border-t pt-3 mt-4",
          children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
            checked: permissions.manageTeam,
            onCheckedChange: updatePermission('manageTeam'),
            children: "Manage team members"
          }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
            checked: permissions.adminAccess,
            onCheckedChange: updatePermission('adminAccess'),
            className: "text-red-600",
            children: "Administrative access"
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "\u26A0\uFE0F Note:"
        }), " Administrative access grants full system permissions."]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Permission checkboxes with warning indicators for sensitive options.'
      }
    }
  }
};
export const Terms = {
  render: () => {
    const [agreements, setAgreements] = useState({
      terms: false,
      privacy: false,
      marketing: false,
      analytics: false
    });
    const updateAgreement = key => checked => {
      setAgreements(prev => ({
        ...prev,
        [key]: checked
      }));
    };
    const canProceed = agreements.terms && agreements.privacy;
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md space-y-4",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Terms and Agreements"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: agreements.terms,
          onCheckedChange: updateAgreement('terms'),
          children: /*#__PURE__*/_jsxs("span", {
            children: ["I agree to the", ' ', /*#__PURE__*/_jsx("a", {
              href: "#",
              className: "text-blue-600 underline",
              children: "Terms of Service"
            }), ' ', /*#__PURE__*/_jsx("span", {
              className: "text-red-500",
              children: "*"
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: agreements.privacy,
          onCheckedChange: updateAgreement('privacy'),
          children: /*#__PURE__*/_jsxs("span", {
            children: ["I agree to the", ' ', /*#__PURE__*/_jsx("a", {
              href: "#",
              className: "text-blue-600 underline",
              children: "Privacy Policy"
            }), ' ', /*#__PURE__*/_jsx("span", {
              className: "text-red-500",
              children: "*"
            })]
          })
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: agreements.marketing,
          onCheckedChange: updateAgreement('marketing'),
          children: "I want to receive marketing emails about FailSquare updates"
        }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: agreements.analytics,
          onCheckedChange: updateAgreement('analytics'),
          children: "Allow anonymous usage analytics to help improve FailSquare"
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "pt-4",
        children: /*#__PURE__*/_jsx("button", {
          disabled: !canProceed,
          className: `w-full py-3 rounded text-center font-medium transition-colors ${canProceed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`,
          children: "Create Account"
        })
      }), /*#__PURE__*/_jsxs("p", {
        className: "text-xs text-gray-500",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-red-500",
          children: "*"
        }), " Required fields"]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Terms and conditions checkboxes with required field validation.'
      }
    }
  }
};
export const AccessibilityDemo = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-md",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Accessibility Features"
    }), /*#__PURE__*/_jsx("p", {
      className: "text-sm text-gray-600",
      children: "Tab through these checkboxes and use spacebar to toggle."
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-3",
      children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Keyboard navigation support"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Screen reader compatible"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        children: "Focus indicators"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        disabled: true,
        children: "Disabled state handling"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "text-sm text-gray-600 bg-gray-50 p-3 rounded",
      children: [/*#__PURE__*/_jsx("p", {
        children: /*#__PURE__*/_jsx("strong", {
          children: "Accessibility features:"
        })
      }), /*#__PURE__*/_jsxs("ul", {
        className: "list-disc list-inside space-y-1 mt-2",
        children: [/*#__PURE__*/_jsx("li", {
          children: "Keyboard navigation (Tab/Shift+Tab)"
        }), /*#__PURE__*/_jsx("li", {
          children: "Spacebar to toggle"
        }), /*#__PURE__*/_jsx("li", {
          children: "Screen reader announcements"
        }), /*#__PURE__*/_jsx("li", {
          children: "Focus management"
        }), /*#__PURE__*/_jsx("li", {
          children: "Proper ARIA attributes"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstration of accessibility features and keyboard interaction.'
      }
    }
  }
};
export const CustomStyling = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Custom Styled Checkboxes"
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-3",
      children: [/*#__PURE__*/_jsx(FailSquareCheckbox, {
        className: "text-blue-600 font-medium",
        children: "Blue themed checkbox"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        className: "text-green-600 font-medium",
        children: "Green themed checkbox"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        className: "text-red-600 font-medium",
        children: "Red themed checkbox"
      }), /*#__PURE__*/_jsx(FailSquareCheckbox, {
        className: "text-purple-600 font-medium",
        children: "Purple themed checkbox"
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "mt-6 p-4 bg-blue-50 border border-blue-200 rounded",
      children: /*#__PURE__*/_jsx(FailSquareCheckbox, {
        className: "text-blue-800",
        children: "Checkbox in colored container"
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Checkboxes with custom styling and color themes.'
      }
    }
  }
};