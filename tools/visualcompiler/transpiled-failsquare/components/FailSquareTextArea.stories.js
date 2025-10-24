import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareTextArea from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareTextArea.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareTextArea',
  component: FailSquareTextArea,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Advanced textarea component for FailSquare with auto-grow functionality, character counter, controlled and uncontrolled modes, and accessibility features.'
      }
    }
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Controlled value'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    rows: {
      control: 'number',
      description: 'Number of rows (when not auto-growing)'
    },
    autoGrow: {
      control: 'boolean',
      description: 'Enable auto-growing height based on content'
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character limit (0 for no limit)'
    },
    showCounter: {
      control: 'boolean',
      description: 'Show character counter'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled'
    },
    onValueChange: {
      action: 'value-changed',
      description: 'Callback when value changes'
    }
  }
};
export default meta;
export const Default = {
  args: {
    placeholder: 'Enter your text here...',
    rows: 3
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic textarea with placeholder.'
      }
    }
  }
};
export const WithCounter = {
  args: {
    placeholder: 'Enter your text here...',
    rows: 3,
    showCounter: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Textarea with character counter.'
      }
    }
  }
};
export const WithMaxLength = {
  args: {
    placeholder: 'Enter your text here (max 100 characters)...',
    rows: 3,
    maxLength: 100,
    showCounter: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Textarea with maximum character limit and counter.'
      }
    }
  }
};
export const AutoGrow = {
  args: {
    placeholder: 'Start typing and watch the textarea grow...',
    rows: 2,
    autoGrow: true,
    showCounter: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Auto-growing textarea that expands with content.'
      }
    }
  }
};
export const Disabled = {
  args: {
    placeholder: 'This textarea is disabled...',
    value: 'This is disabled content that cannot be edited.',
    rows: 3,
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled textarea that cannot be interacted with.'
      }
    }
  }
};
export const ControlledExample = {
  render: () => {
    const [description, setDescription] = useState('');
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Description"
      }), /*#__PURE__*/_jsx(FailSquareTextArea, {
        placeholder: "Describe the failure in detail...",
        value: description,
        onValueChange: setDescription,
        rows: 4,
        maxLength: 500,
        showCounter: true
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setDescription('Database connection timeout occurred during peak traffic hours.'),
          className: "px-3 py-1 bg-blue-600 text-white rounded text-sm",
          children: "Set Sample Text"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setDescription(''),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Current length:"
        }), " ", description.length, " characters"]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled textarea with external state management.'
      }
    }
  }
};
export const FailureReport = {
  render: () => {
    const [report, setReport] = useState({
      summary: '',
      impact: '',
      rootCause: '',
      resolution: ''
    });
    const updateField = field => value => {
      setReport(prev => ({
        ...prev,
        [field]: value
      }));
    };
    const totalChars = Object.values(report).join('').length;
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Analysis Report"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Executive Summary"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Provide a brief executive summary of the failure...",
            value: report.summary,
            onValueChange: updateField('summary'),
            rows: 3,
            maxLength: 250,
            showCounter: true
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Business Impact"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Describe the business impact and affected users...",
            value: report.impact,
            onValueChange: updateField('impact'),
            rows: 4,
            autoGrow: true,
            maxLength: 500,
            showCounter: true
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Root Cause Analysis"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Detailed analysis of what caused the failure...",
            value: report.rootCause,
            onValueChange: updateField('rootCause'),
            rows: 5,
            autoGrow: true,
            maxLength: 1000,
            showCounter: true
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Resolution Steps"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Steps taken to resolve the failure and prevent recurrence...",
            value: report.resolution,
            onValueChange: updateField('resolution'),
            rows: 4,
            autoGrow: true,
            maxLength: 800,
            showCounter: true
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-blue-50 border border-blue-200 rounded",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium text-blue-800 mb-2",
          children: "Report Summary"
        }), /*#__PURE__*/_jsxs("div", {
          className: "grid grid-cols-2 gap-4 text-sm text-blue-700",
          children: [/*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Total characters:"
              }), " ", totalChars]
            }), /*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Summary:"
              }), " ", report.summary.length, "/250"]
            }), /*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Impact:"
              }), " ", report.impact.length, "/500"]
            })]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Root Cause:"
              }), " ", report.rootCause.length, "/1000"]
            }), /*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Resolution:"
              }), " ", report.resolution.length, "/800"]
            }), /*#__PURE__*/_jsxs("p", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Completion:"
              }), " ", Math.round(totalChars / 2550 * 100), "%"]
            })]
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete failure report form with multiple textareas.'
      }
    }
  }
};
export const CodeSnippets = {
  render: () => {
    const [snippets, setSnippets] = useState({
      errorLog: '',
      stackTrace: '',
      config: ''
    });
    const updateSnippet = field => value => {
      setSnippets(prev => ({
        ...prev,
        [field]: value
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-3xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Technical Details"
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Error Log"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Paste error logs here...",
            value: snippets.errorLog,
            onValueChange: updateSnippet('errorLog'),
            rows: 6,
            autoGrow: true,
            className: "font-mono text-sm"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Stack Trace"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Paste stack trace here...",
            value: snippets.stackTrace,
            onValueChange: updateSnippet('stackTrace'),
            rows: 8,
            autoGrow: true,
            className: "font-mono text-sm"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-2",
            children: "Configuration"
          }), /*#__PURE__*/_jsx(FailSquareTextArea, {
            placeholder: "Paste relevant configuration here...",
            value: snippets.config,
            onValueChange: updateSnippet('config'),
            rows: 4,
            autoGrow: true,
            className: "font-mono text-sm",
            showCounter: true
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "p-4 bg-gray-50 rounded text-sm",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-gray-600",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Tip:"
          }), " These textareas use monospace font for better code readability."]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Textareas for code snippets with monospace font styling.'
      }
    }
  }
};
export const CommentSystem = {
  render: () => {
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([{
      id: 1,
      author: 'Dr. Sarah Chen',
      text: 'Great analysis! I had a similar issue last month.'
    }, {
      id: 2,
      author: 'Mike Johnson',
      text: 'The root cause analysis is spot on. We should implement those prevention measures.'
    }]);
    const addComment = () => {
      if (comment.trim()) {
        setComments(prev => [...prev, {
          id: prev.length + 1,
          author: 'You',
          text: comment
        }]);
        setComment('');
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Discussion"
      }), /*#__PURE__*/_jsx("div", {
        className: "space-y-4",
        children: comments.map(c => /*#__PURE__*/_jsxs("div", {
          className: "bg-gray-50 p-4 rounded-lg",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium",
              children: c.author.charAt(0)
            }), /*#__PURE__*/_jsx("span", {
              className: "font-medium text-gray-700",
              children: c.author
            })]
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-700",
            children: c.text
          })]
        }, c.id))
      }), /*#__PURE__*/_jsxs("div", {
        className: "border-t pt-6",
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Add a comment"
        }), /*#__PURE__*/_jsx(FailSquareTextArea, {
          placeholder: "Share your thoughts, questions, or insights...",
          value: comment,
          onValueChange: setComment,
          rows: 3,
          autoGrow: true,
          maxLength: 500,
          showCounter: true
        }), /*#__PURE__*/_jsxs("div", {
          className: "mt-3 flex justify-between items-center",
          children: [/*#__PURE__*/_jsx("p", {
            className: "text-xs text-gray-500",
            children: "Be respectful and constructive in your feedback."
          }), /*#__PURE__*/_jsx("button", {
            onClick: addComment,
            disabled: !comment.trim(),
            className: `px-4 py-2 rounded text-sm font-medium transition-colors ${comment.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`,
            children: "Post Comment"
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Comment system with auto-growing textarea and validation.'
      }
    }
  }
};
export const UncontrolledExample = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-lg",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Uncontrolled Textareas"
    }), /*#__PURE__*/_jsx("p", {
      className: "text-sm text-gray-600",
      children: "These textareas manage their own state internally."
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Basic Notes"
        }), /*#__PURE__*/_jsx(FailSquareTextArea, {
          placeholder: "Enter your notes...",
          rows: 3,
          onValueChange: value => console.log('Notes changed:', value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Auto-growing Comments"
        }), /*#__PURE__*/_jsx(FailSquareTextArea, {
          placeholder: "Start typing to see auto-grow...",
          rows: 2,
          autoGrow: true,
          showCounter: true,
          onValueChange: value => console.log('Comments changed:', value)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: "Limited Text (50 chars)"
        }), /*#__PURE__*/_jsx(FailSquareTextArea, {
          placeholder: "Limited to 50 characters...",
          rows: 2,
          maxLength: 50,
          showCounter: true,
          onValueChange: value => console.log('Limited text changed:', value)
        })]
      })]
    }), /*#__PURE__*/_jsx("p", {
      className: "text-xs text-gray-500",
      children: "Check the browser console to see value changes."
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled textareas that manage their own state.'
      }
    }
  }
};
export const ValidationStates = {
  render: () => {
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');
    const validateFeedback = value => {
      if (!value.trim()) {
        setError('Feedback is required');
      } else if (value.length < 10) {
        setError('Feedback must be at least 10 characters');
      } else if (value.length > 500) {
        setError('Feedback must not exceed 500 characters');
      } else {
        setError('');
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Feedback Form"
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsxs("label", {
          className: "block text-sm font-medium text-gray-600 mb-2",
          children: ["Your Feedback ", /*#__PURE__*/_jsx("span", {
            className: "text-red-500",
            children: "*"
          })]
        }), /*#__PURE__*/_jsx(FailSquareTextArea, {
          placeholder: "Please provide detailed feedback...",
          value: feedback,
          onValueChange: value => {
            setFeedback(value);
            validateFeedback(value);
          },
          rows: 4,
          autoGrow: true,
          maxLength: 500,
          showCounter: true,
          className: error ? 'border-red-500 focus:ring-red-500' : ''
        }), error && /*#__PURE__*/_jsx("p", {
          className: "text-red-500 text-sm mt-1",
          children: error
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => {
            const sample = 'This is sample feedback that meets the minimum requirements for validation.';
            setFeedback(sample);
            validateFeedback(sample);
          },
          className: "px-3 py-1 bg-green-600 text-white rounded text-sm",
          children: "Valid Sample"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => {
            const sample = 'Too short';
            setFeedback(sample);
            validateFeedback(sample);
          },
          className: "px-3 py-1 bg-red-600 text-white rounded text-sm",
          children: "Invalid Sample"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => {
            setFeedback('');
            setError('');
          },
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-600 bg-gray-50 p-3 rounded",
        children: [/*#__PURE__*/_jsx("p", {
          children: /*#__PURE__*/_jsx("strong", {
            children: "Validation rules:"
          })
        }), /*#__PURE__*/_jsxs("ul", {
          className: "list-disc list-inside space-y-1 mt-2",
          children: [/*#__PURE__*/_jsx("li", {
            children: "Required field"
          }), /*#__PURE__*/_jsx("li", {
            children: "Minimum 10 characters"
          }), /*#__PURE__*/_jsx("li", {
            children: "Maximum 500 characters"
          }), /*#__PURE__*/_jsx("li", {
            children: "Real-time validation"
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Textarea with validation states and error handling.'
      }
    }
  }
};
export const LargeContent = {
  render: () => {
    const [content, setContent] = useState('');
    const sampleContent = `# Database Migration Failure Analysis

## Executive Summary

On March 15th, 2024, at 14:30 UTC, our production database migration process failed during a routine update to add new indexes for improved query performance. The failure resulted in a 45-minute service outage affecting approximately 12,000 active users.

## Timeline

**14:30 UTC** - Migration script initiated
**14:32 UTC** - First error messages appeared in logs
**14:35 UTC** - Database connections began timing out
**14:37 UTC** - Service health checks failed, load balancer removed servers
**14:40 UTC** - Full service outage declared
**14:45 UTC** - Emergency rollback procedure initiated
**15:05 UTC** - Database restored to previous state
**15:15 UTC** - Service fully operational

## Root Cause Analysis

The migration script contained a deadlock condition when attempting to create indexes on tables with active connections. The script did not properly:

1. Acquire necessary table locks before beginning
2. Set appropriate timeout values for long-running operations
3. Include rollback procedures for partial failures

## Business Impact

- **Duration**: 45 minutes total outage
- **Users Affected**: ~12,000 active users
- **Revenue Impact**: Estimated $23,000 in lost transactions
- **Customer Support**: 156 support tickets created
- **SLA Breach**: Exceeded 99.9% uptime commitment for March

## Prevention Measures

1. **Testing Protocol**: All migration scripts must be tested on production-sized datasets
2. **Rollback Planning**: Every migration requires a tested rollback procedure
3. **Monitoring**: Enhanced monitoring for migration processes
4. **Communication**: Improved incident communication procedures
5. **Review Process**: Database changes require additional peer review

## Lessons Learned

This incident highlighted gaps in our database migration process and the importance of comprehensive testing with production-scale data. The team has implemented new safeguards and will conduct a quarterly review of all database procedures.`;
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-4xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Comprehensive Report"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Large content example with auto-growing textarea."
      }), /*#__PURE__*/_jsx(FailSquareTextArea, {
        placeholder: "Enter your comprehensive failure analysis report...",
        value: content,
        onValueChange: setContent,
        rows: 10,
        autoGrow: true,
        showCounter: true,
        className: "text-sm"
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setContent(sampleContent),
          className: "px-3 py-1 bg-blue-600 text-white rounded text-sm",
          children: "Load Sample Report"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setContent(''),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Content stats:"
        }), " ", content.length, " characters, ", content.split('\n').length, " lines"]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Textarea handling large content with auto-grow functionality.'
      }
    }
  }
};