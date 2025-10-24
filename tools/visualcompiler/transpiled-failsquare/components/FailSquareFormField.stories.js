import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareFormField from './FailSquareFormField';
import FailSquareAuthInput from './FailSquareAuthInput';
import FailSquareSelect from './FailSquareSelect';
import FailSquareTextArea from './FailSquareTextArea';
import FailSquareCheckbox from './FailSquareCheckbox';
import FailSquareRadioGroup from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareRadioGroup.js';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareFormField',
  component: FailSquareFormField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Form field wrapper component for FailSquare that provides consistent labeling, validation, helper text, and error message display for all form inputs.'
      }
    }
  },
  argTypes: {
    id: {
      control: 'text',
      description: 'HTML id for the form field'
    },
    label: {
      control: 'text',
      description: 'Field label text'
    },
    helperText: {
      control: 'text',
      description: 'Helper text shown below the input'
    },
    required: {
      control: 'boolean',
      description: 'Whether the field is required (shows asterisk)'
    },
    hasError: {
      control: 'boolean',
      description: 'Whether the field has a validation error'
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display when hasError is true'
    },
    children: {
      description: 'Form input component(s) to wrap'
    }
  }
};
export default meta;
export const WithTextInput = {
  args: {
    id: 'username',
    label: 'Username',
    helperText: 'Choose a unique username for your account',
    required: true,
    children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
      id: "username",
      placeholder: "Enter your username",
      icon: /*#__PURE__*/_jsx(UserOutlined, {})
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field wrapping a text input with label and helper text.'
      }
    }
  }
};
export const WithError = {
  args: {
    id: 'email',
    label: 'Email Address',
    required: true,
    hasError: true,
    errorMessage: 'Please enter a valid email address',
    children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
      id: "email",
      type: "email",
      placeholder: "Enter your email",
      icon: /*#__PURE__*/_jsx(MailOutlined, {}),
      className: "border-red-500 focus:ring-red-500"
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field in error state with error message.'
      }
    }
  }
};
export const WithSelect = {
  args: {
    id: 'severity',
    label: 'Failure Severity',
    helperText: 'Select the severity level of this failure',
    required: true,
    children: /*#__PURE__*/_jsx(FailSquareSelect, {
      placeholder: "Choose severity level...",
      options: [{
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
      }]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field wrapping a select dropdown.'
      }
    }
  }
};
export const WithTextArea = {
  args: {
    id: 'description',
    label: 'Failure Description',
    helperText: 'Provide a detailed description of what happened',
    required: true,
    children: /*#__PURE__*/_jsx(FailSquareTextArea, {
      id: "description",
      placeholder: "Describe the failure in detail...",
      rows: 4,
      maxLength: 500,
      showCounter: true
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field wrapping a textarea.'
      }
    }
  }
};
export const WithCheckbox = {
  args: {
    id: 'terms',
    children: /*#__PURE__*/_jsx(FailSquareCheckbox, {
      children: "I agree to the Terms of Service and Privacy Policy"
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field wrapping a checkbox (no separate label needed).'
      }
    }
  }
};
export const WithRadioGroup = {
  args: {
    id: 'urgency',
    label: 'Response Urgency',
    helperText: 'How quickly does this need to be addressed?',
    children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
      name: "urgency",
      options: [{
        value: 'immediate',
        label: 'Immediate (< 1 hour)'
      }, {
        value: 'urgent',
        label: 'Urgent (< 4 hours)'
      }, {
        value: 'normal',
        label: 'Normal (< 24 hours)'
      }, {
        value: 'low',
        label: 'Low Priority (< 1 week)'
      }]
    })
  },
  parameters: {
    docs: {
      description: {
        story: 'Form field wrapping a radio group.'
      }
    }
  }
};
export const CompleteForm = {
  render: () => {
    const [formData, setFormData] = useState({
      title: '',
      category: '',
      severity: '',
      description: '',
      impact: '',
      urgent: false
    });
    const [errors, setErrors] = useState({});
    const updateField = field => value => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    };
    const validateForm = () => {
      const newErrors = {};
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.category) {
        newErrors.category = 'Please select a category';
      }
      if (!formData.severity) {
        newErrors.severity = 'Please select a severity level';
      }
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 20) {
        newErrors.description = 'Description must be at least 20 characters';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = e => {
      e.preventDefault();
      if (validateForm()) {
        console.log('Form submitted:', formData);
        alert('Form submitted successfully!');
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-2xl space-y-6",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-xl font-bold text-gray-800",
        children: "Create Failure Analysis"
      }), /*#__PURE__*/_jsxs("form", {
        onSubmit: handleSubmit,
        className: "space-y-6",
        children: [/*#__PURE__*/_jsx(FailSquareFormField, {
          id: "title",
          label: "Failure Title",
          helperText: "A clear, concise title for this failure",
          required: true,
          hasError: !!errors.title,
          errorMessage: errors.title,
          children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
            id: "title",
            placeholder: "e.g., Database Connection Timeout",
            value: formData.title,
            onValueChange: updateField('title'),
            className: errors.title ? 'border-red-500 focus:ring-red-500' : ''
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "category",
          label: "Failure Category",
          helperText: "Select the category that best describes this failure",
          required: true,
          hasError: !!errors.category,
          errorMessage: errors.category,
          children: /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Choose a category...",
            value: formData.category,
            onValueChange: updateField('category'),
            options: [{
              value: 'infrastructure',
              label: 'Infrastructure'
            }, {
              value: 'application',
              label: 'Application'
            }, {
              value: 'database',
              label: 'Database'
            }, {
              value: 'network',
              label: 'Network'
            }, {
              value: 'security',
              label: 'Security'
            }]
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "severity",
          label: "Severity Level",
          required: true,
          hasError: !!errors.severity,
          errorMessage: errors.severity,
          children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
            name: "severity",
            value: formData.severity,
            onValueChange: updateField('severity'),
            options: [{
              value: 'low',
              label: 'Low - Minor impact'
            }, {
              value: 'medium',
              label: 'Medium - Moderate impact'
            }, {
              value: 'high',
              label: 'High - Significant impact'
            }, {
              value: 'critical',
              label: 'Critical - Severe impact'
            }]
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "description",
          label: "Failure Description",
          helperText: "Provide a detailed description of what happened (minimum 20 characters)",
          required: true,
          hasError: !!errors.description,
          errorMessage: errors.description,
          children: /*#__PURE__*/_jsx(FailSquareTextArea, {
            id: "description",
            placeholder: "Describe what happened, when it occurred, and what the impact was...",
            value: formData.description,
            onValueChange: updateField('description'),
            rows: 4,
            autoGrow: true,
            maxLength: 1000,
            showCounter: true,
            className: errors.description ? 'border-red-500 focus:ring-red-500' : ''
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "impact",
          label: "Business Impact",
          helperText: "Optional: Describe the business or user impact",
          children: /*#__PURE__*/_jsx(FailSquareTextArea, {
            id: "impact",
            placeholder: "e.g., 500 users affected, 2 hours downtime, $5000 revenue loss...",
            value: formData.impact,
            onValueChange: updateField('impact'),
            rows: 3,
            maxLength: 500,
            showCounter: true
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "urgent",
          children: /*#__PURE__*/_jsx(FailSquareCheckbox, {
            checked: formData.urgent,
            onCheckedChange: updateField('urgent'),
            children: "This is an urgent failure requiring immediate attention"
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex gap-4 pt-4",
          children: [/*#__PURE__*/_jsx("button", {
            type: "submit",
            className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",
            children: "Create Analysis"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            onClick: () => {
              setFormData({
                title: '',
                category: '',
                severity: '',
                description: '',
                impact: '',
                urgent: false
              });
              setErrors({});
            },
            className: "px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors",
            children: "Reset Form"
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-gray-50 rounded-lg",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium text-gray-700 mb-2",
          children: "Form Data Preview:"
        }), /*#__PURE__*/_jsx("pre", {
          className: "text-sm text-gray-600",
          children: JSON.stringify(formData, null, 2)
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete form using multiple form fields with validation.'
      }
    }
  }
};
export const ValidationStates = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-6 max-w-lg",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Form Field Validation States"
    }), /*#__PURE__*/_jsx(FailSquareFormField, {
      id: "valid-field",
      label: "Valid Field",
      helperText: "This field has no errors",
      children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
        id: "valid-field",
        placeholder: "Enter some text...",
        value: "Valid input"
      })
    }), /*#__PURE__*/_jsx(FailSquareFormField, {
      id: "error-field",
      label: "Field with Error",
      required: true,
      hasError: true,
      errorMessage: "This field is required and must be at least 5 characters long",
      children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
        id: "error-field",
        placeholder: "Enter text...",
        value: "123",
        className: "border-red-500 focus:ring-red-500"
      })
    }), /*#__PURE__*/_jsx(FailSquareFormField, {
      id: "required-field",
      label: "Required Field",
      helperText: "This field is marked as required",
      required: true,
      children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
        id: "required-field",
        placeholder: "This field is required..."
      })
    }), /*#__PURE__*/_jsx(FailSquareFormField, {
      id: "helper-field",
      label: "Field with Helper Text",
      helperText: "This helper text provides additional context and guidance for the user",
      children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
        id: "helper-field",
        placeholder: "Enter some text..."
      })
    }), /*#__PURE__*/_jsx(FailSquareFormField, {
      id: "no-label-field",
      helperText: "This field has no label, just helper text",
      children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
        id: "no-label-field",
        placeholder: "No label field..."
      })
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Different validation states and configurations for form fields.'
      }
    }
  }
};
export const PasswordField = {
  render: () => {
    const [passwords, setPasswords] = useState({
      current: '',
      new: '',
      confirm: ''
    });
    const [errors, setErrors] = useState({});
    const updatePassword = field => value => {
      setPasswords(prev => ({
        ...prev,
        [field]: value
      }));

      // Real-time validation
      const newErrors = {
        ...errors
      };
      if (field === 'new') {
        if (value.length > 0 && value.length < 8) {
          newErrors.new = 'Password must be at least 8 characters';
        } else {
          delete newErrors.new;
        }
      }
      if (field === 'confirm' || field === 'new' && passwords.confirm) {
        const newPassword = field === 'new' ? value : passwords.new;
        const confirmPassword = field === 'confirm' ? value : passwords.confirm;
        if (confirmPassword && newPassword !== confirmPassword) {
          newErrors.confirm = 'Passwords do not match';
        } else {
          delete newErrors.confirm;
        }
      }
      setErrors(newErrors);
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Change Password"
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "current-password",
        label: "Current Password",
        required: true,
        children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
          id: "current-password",
          type: "password",
          placeholder: "Enter current password",
          icon: /*#__PURE__*/_jsx(LockOutlined, {}),
          value: passwords.current,
          onValueChange: updatePassword('current')
        })
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "new-password",
        label: "New Password",
        helperText: "Must be at least 8 characters long",
        required: true,
        hasError: !!errors.new,
        errorMessage: errors.new,
        children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
          id: "new-password",
          type: "password",
          placeholder: "Enter new password",
          icon: /*#__PURE__*/_jsx(LockOutlined, {}),
          value: passwords.new,
          onValueChange: updatePassword('new'),
          className: errors.new ? 'border-red-500 focus:ring-red-500' : ''
        })
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "confirm-password",
        label: "Confirm New Password",
        required: true,
        hasError: !!errors.confirm,
        errorMessage: errors.confirm,
        children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
          id: "confirm-password",
          type: "password",
          placeholder: "Confirm new password",
          icon: /*#__PURE__*/_jsx(LockOutlined, {}),
          value: passwords.confirm,
          onValueChange: updatePassword('confirm'),
          className: errors.confirm ? 'border-red-500 focus:ring-red-500' : ''
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "pt-4",
        children: /*#__PURE__*/_jsx("button", {
          disabled: Object.keys(errors).length > 0 || !passwords.current || !passwords.new || !passwords.confirm,
          className: `w-full py-3 rounded-lg transition-colors ${Object.keys(errors).length === 0 && passwords.current && passwords.new && passwords.confirm ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`,
          children: "Update Password"
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Password change form with real-time validation.'
      }
    }
  }
};
export const ContactForm = {
  render: () => {
    const [contact, setContact] = useState({
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: '',
      newsletter: false
    });
    const updateContact = field => value => {
      setContact(prev => ({
        ...prev,
        [field]: value
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-6 max-w-2xl",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Contact Support"
      }), /*#__PURE__*/_jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
        children: [/*#__PURE__*/_jsx(FailSquareFormField, {
          id: "contact-name",
          label: "Full Name",
          required: true,
          children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
            id: "contact-name",
            placeholder: "Enter your full name",
            icon: /*#__PURE__*/_jsx(UserOutlined, {}),
            value: contact.name,
            onValueChange: updateContact('name')
          })
        }), /*#__PURE__*/_jsx(FailSquareFormField, {
          id: "contact-email",
          label: "Email Address",
          required: true,
          children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
            id: "contact-email",
            type: "email",
            placeholder: "Enter your email",
            icon: /*#__PURE__*/_jsx(MailOutlined, {}),
            value: contact.email,
            onValueChange: updateContact('email')
          })
        })]
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "contact-subject",
        label: "Subject",
        required: true,
        children: /*#__PURE__*/_jsx(FailSquareSelect, {
          placeholder: "Select a subject...",
          value: contact.subject,
          onValueChange: updateContact('subject'),
          options: [{
            value: 'bug-report',
            label: 'Bug Report'
          }, {
            value: 'feature-request',
            label: 'Feature Request'
          }, {
            value: 'technical-support',
            label: 'Technical Support'
          }, {
            value: 'billing',
            label: 'Billing Question'
          }, {
            value: 'other',
            label: 'Other'
          }]
        })
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "contact-priority",
        label: "Priority Level",
        helperText: "How urgent is this request?",
        children: /*#__PURE__*/_jsx(FailSquareRadioGroup, {
          name: "priority",
          value: contact.priority,
          onValueChange: updateContact('priority'),
          options: [{
            value: 'low',
            label: 'Low - General inquiry'
          }, {
            value: 'medium',
            label: 'Medium - Issue affecting work'
          }, {
            value: 'high',
            label: 'High - Blocking critical functions'
          }, {
            value: 'urgent',
            label: 'Urgent - System down'
          }]
        })
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "contact-message",
        label: "Message",
        helperText: "Please provide as much detail as possible",
        required: true,
        children: /*#__PURE__*/_jsx(FailSquareTextArea, {
          id: "contact-message",
          placeholder: "Describe your issue or question in detail...",
          value: contact.message,
          onValueChange: updateContact('message'),
          rows: 6,
          autoGrow: true,
          maxLength: 2000,
          showCounter: true
        })
      }), /*#__PURE__*/_jsx(FailSquareFormField, {
        id: "contact-newsletter",
        children: /*#__PURE__*/_jsx(FailSquareCheckbox, {
          checked: contact.newsletter,
          onCheckedChange: updateContact('newsletter'),
          children: "Subscribe to our newsletter for product updates and tips"
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-4 pt-4",
        children: [/*#__PURE__*/_jsx("button", {
          className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",
          children: "Send Message"
        }), /*#__PURE__*/_jsx("button", {
          className: "px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors",
          children: "Save Draft"
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Contact form using various form fields and layouts.'
      }
    }
  }
};