import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareRadioGroup from './FailSquareRadioGroup';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareRadioGroup',
  component: FailSquareRadioGroup,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Radio button group component for FailSquare with custom styling, controlled and uncontrolled modes, and accessibility features.'
      }
    }
  },
  argTypes: {
    name: {
      control: 'text',
      description: 'Name attribute for the radio group'
    },
    value: {
      control: 'text',
      description: 'Controlled selected value'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the entire radio group is disabled'
    },
    onValueChange: {
      action: 'value-changed',
      description: 'Callback when selection changes'
    },
    options: {
      description: 'Array of radio options'
    }
  }
};
export default meta;
const basicOptions = [{
  value: 'option1',
  label: 'Option 1'
}, {
  value: 'option2',
  label: 'Option 2'
}, {
  value: 'option3',
  label: 'Option 3'
}];
export const Default = {
  args: {
    name: 'default-radio-group',
    options: basicOptions
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic radio group with three options.'
      }
    }
  }
};
export const Selected = {
  args: {
    name: 'selected-radio-group',
    options: basicOptions,
    value: 'option2'
  },
  parameters: {
    docs: {
      description: {
        story: 'Radio group with pre-selected option.'
      }
    }
  }
};
export const Disabled = {
  args: {
    name: 'disabled-radio-group',
    options: basicOptions,
    value: 'option1',
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled radio group that cannot be interacted with.'
      }
    }
  }
};
export const ControlledExample = {
  render: () => {
    const [selectedValue, setSelectedValue] = useState('medium');
    const severityOptions = [{
      value: 'low',
      label: 'Low Severity'
    }, {
      value: 'medium',
      label: 'Medium Severity'
    }, {
      value: 'high',
      label: 'High Severity'
    }, {
      value: 'critical',
      label: 'Critical Severity'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Severity Level"
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "severity",
        value: selectedValue,
        onValueChange: setSelectedValue,
        options: severityOptions
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue('critical'),
          className: "px-3 py-1 bg-red-600 text-white rounded text-sm",
          children: "Set Critical"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue('low'),
          className: "px-3 py-1 bg-green-600 text-white rounded text-sm",
          children: "Set Low"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue(''),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Selected:"
        }), " ", selectedValue || 'None']
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled radio group with external state management.'
      }
    }
  }
};
export const FailureCategories = {
  render: () => {
    const [category, setCategory] = useState('');
    const categoryOptions = [{
      value: 'infrastructure',
      label: 'Infrastructure Failure'
    }, {
      value: 'application',
      label: 'Application Error'
    }, {
      value: 'database',
      label: 'Database Issue'
    }, {
      value: 'network',
      label: 'Network Problem'
    }, {
      value: 'security',
      label: 'Security Incident'
    }, {
      value: 'performance',
      label: 'Performance Degradation'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Category"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the primary category that best describes this failure."
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "failure-category",
        value: category,
        onValueChange: setCategory,
        options: categoryOptions
      }), category && /*#__PURE__*/_jsx("div", {
        className: "p-4 bg-blue-50 border border-blue-200 rounded",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-sm text-blue-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Selected Category:"
          }), " ", categoryOptions.find(opt => opt.value === category)?.label]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Radio group for selecting failure categories with feedback.'
      }
    }
  }
};
export const AnalysisType = {
  render: () => {
    const [analysisType, setAnalysisType] = useState('');
    const analysisOptions = [{
      value: 'root-cause',
      label: 'Root Cause Analysis'
    }, {
      value: 'post-mortem',
      label: 'Post-Mortem Report'
    }, {
      value: 'incident-response',
      label: 'Incident Response Documentation'
    }, {
      value: 'lessons-learned',
      label: 'Lessons Learned Summary'
    }, {
      value: 'preventive-measures',
      label: 'Preventive Measures Plan'
    }];
    const getDescription = type => {
      const descriptions = {
        'root-cause': 'Deep dive into the fundamental cause of the failure',
        'post-mortem': 'Comprehensive review of what happened and why',
        'incident-response': 'Documentation of response actions and timeline',
        'lessons-learned': 'Key takeaways and insights from the failure',
        'preventive-measures': 'Action plan to prevent similar failures'
      };
      return descriptions[type] || '';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Analysis Type"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Choose the type of failure analysis you want to create."
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "analysis-type",
        value: analysisType,
        onValueChange: setAnalysisType,
        options: analysisOptions
      }), analysisType && /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-green-50 border border-green-200 rounded",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium text-green-800 mb-1",
          children: analysisOptions.find(opt => opt.value === analysisType)?.label
        }), /*#__PURE__*/_jsx("p", {
          className: "text-sm text-green-700",
          children: getDescription(analysisType)
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Radio group for selecting analysis type with dynamic descriptions.'
      }
    }
  }
};
export const Urgency = {
  render: () => {
    const [urgency, setUrgency] = useState('');
    const urgencyOptions = [{
      value: 'immediate',
      label: '🔥 Immediate (< 1 hour)'
    }, {
      value: 'urgent',
      label: '⚡ Urgent (< 4 hours)'
    }, {
      value: 'normal',
      label: '📅 Normal (< 24 hours)'
    }, {
      value: 'low',
      label: '📝 Low Priority (< 1 week)'
    }];
    const getUrgencyColor = urgencyValue => {
      const colors = {
        'immediate': 'bg-red-50 border-red-200 text-red-800',
        'urgent': 'bg-orange-50 border-orange-200 text-orange-800',
        'normal': 'bg-blue-50 border-blue-200 text-blue-800',
        'low': 'bg-gray-50 border-gray-200 text-gray-800'
      };
      return colors[urgencyValue] || 'bg-gray-50 border-gray-200 text-gray-800';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Response Urgency"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "How quickly does this failure need to be addressed?"
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "urgency",
        value: urgency,
        onValueChange: setUrgency,
        options: urgencyOptions
      }), urgency && /*#__PURE__*/_jsxs("div", {
        className: `p-4 border rounded ${getUrgencyColor(urgency)}`,
        children: [/*#__PURE__*/_jsx("p", {
          className: "font-medium",
          children: urgencyOptions.find(opt => opt.value === urgency)?.label
        }), /*#__PURE__*/_jsx("p", {
          className: "text-sm mt-1",
          children: "Priority level selected for failure response timeline."
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Urgency selection with emoji indicators and color-coded feedback.'
      }
    }
  }
};
export const NotificationSettings = {
  render: () => {
    const [frequency, setFrequency] = useState('daily');
    const frequencyOptions = [{
      value: 'immediate',
      label: 'Immediate notifications'
    }, {
      value: 'hourly',
      label: 'Hourly digest'
    }, {
      value: 'daily',
      label: 'Daily summary'
    }, {
      value: 'weekly',
      label: 'Weekly report'
    }, {
      value: 'none',
      label: 'No notifications'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Notification Frequency"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "How often would you like to receive failure analysis notifications?"
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "notification-frequency",
        value: frequency,
        onValueChange: setFrequency,
        options: frequencyOptions
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Current setting:"
        }), " ", frequencyOptions.find(opt => opt.value === frequency)?.label]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification frequency settings with user preferences.'
      }
    }
  }
};
export const AccessLevel = {
  render: () => {
    const [accessLevel, setAccessLevel] = useState('');
    const accessOptions = [{
      value: 'public',
      label: 'Public - Anyone can view this analysis'
    }, {
      value: 'team',
      label: 'Team Only - Visible to team members'
    }, {
      value: 'organization',
      label: 'Organization - Visible within organization'
    }, {
      value: 'private',
      label: 'Private - Only visible to you'
    }];
    const getAccessIcon = level => {
      const icons = {
        'public': '🌍',
        'team': '👥',
        'organization': '🏢',
        'private': '🔒'
      };
      return icons[level] || '';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Access Level"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Who should be able to view this failure analysis?"
      }), /*#__PURE__*/_jsx("div", {
        className: "space-y-2",
        children: accessOptions.map(option => /*#__PURE__*/_jsxs("label", {
          className: "failsquare-radio flex items-start gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50",
          children: [/*#__PURE__*/_jsx("input", {
            type: "radio",
            name: "access-level",
            value: option.value,
            checked: accessLevel === option.value,
            onChange: () => setAccessLevel(option.value),
            className: "sr-only"
          }), /*#__PURE__*/_jsx("span", {
            className: `
                  relative w-5 h-5 border-2 rounded-full transition-all mt-0.5
                  ${accessLevel === option.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:border-gray-400'}
                `,
            children: accessLevel === option.value && /*#__PURE__*/_jsx("span", {
              className: "absolute inset-1 bg-white rounded-full"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex-1",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-2",
              children: [/*#__PURE__*/_jsx("span", {
                children: getAccessIcon(option.value)
              }), /*#__PURE__*/_jsx("span", {
                className: "font-medium",
                children: option.label.split(' - ')[0]
              })]
            }), /*#__PURE__*/_jsx("p", {
              className: "text-sm text-gray-600 mt-1",
              children: option.label.split(' - ')[1]
            })]
          })]
        }, option.value))
      }), accessLevel && /*#__PURE__*/_jsx("div", {
        className: "p-4 bg-blue-50 border border-blue-200 rounded",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-sm text-blue-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Selected:"
          }), " ", accessOptions.find(opt => opt.value === accessLevel)?.label]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom styled radio group with detailed options and descriptions.'
      }
    }
  }
};
export const YesNoDecision = {
  render: () => {
    const [includeMetrics, setIncludeMetrics] = useState('');
    const [includeTimeline, setIncludeTimeline] = useState('yes');
    const [shareWithTeam, setShareWithTeam] = useState('');
    const yesNoOptions = [{
      value: 'yes',
      label: 'Yes'
    }, {
      value: 'no',
      label: 'No'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Analysis Configuration"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Include performance metrics?"
          }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
            name: "include-metrics",
            value: includeMetrics,
            onValueChange: setIncludeMetrics,
            options: yesNoOptions
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Generate failure timeline?"
          }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
            name: "include-timeline",
            value: includeTimeline,
            onValueChange: setIncludeTimeline,
            options: yesNoOptions
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Share analysis with team automatically?"
          }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
            name: "share-with-team",
            value: shareWithTeam,
            onValueChange: setShareWithTeam,
            options: yesNoOptions
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Configuration Summary:"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "mt-2 space-y-1",
          children: [/*#__PURE__*/_jsxs("li", {
            children: ["Metrics: ", includeMetrics || 'Not selected']
          }), /*#__PURE__*/_jsxs("li", {
            children: ["Timeline: ", includeTimeline]
          }), /*#__PURE__*/_jsxs("li", {
            children: ["Share: ", shareWithTeam || 'Not selected']
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple yes/no radio groups for configuration settings.'
      }
    }
  }
};
export const LongOptions = {
  render: () => {
    const [methodology, setMethodology] = useState('');
    const methodologyOptions = [{
      value: 'five-whys',
      label: 'Five Whys Analysis - Ask "why" five times to drill down to the root cause of the problem'
    }, {
      value: 'fishbone',
      label: 'Fishbone Diagram - Systematic approach to identify potential causes across categories like people, process, technology, and environment'
    }, {
      value: 'fault-tree',
      label: 'Fault Tree Analysis - Top-down deductive approach that uses Boolean logic to analyze undesired states'
    }, {
      value: 'timeline',
      label: 'Timeline Analysis - Chronological reconstruction of events leading up to and following the failure'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Analysis Methodology"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Choose the methodology you want to use for this failure analysis."
      }), /*#__PURE__*/_jsx(FailSquareRadioGroup, {
        name: "methodology",
        value: methodology,
        onValueChange: setMethodology,
        options: methodologyOptions
      }), methodology && /*#__PURE__*/_jsx("div", {
        className: "p-4 bg-purple-50 border border-purple-200 rounded",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-sm text-purple-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Selected methodology:"
          }), " ", methodologyOptions.find(opt => opt.value === methodology)?.label]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Radio group with longer option labels that wrap properly.'
      }
    }
  }
};