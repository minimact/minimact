import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareAuthInput from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareAuthInput.js';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined, GlobalOutlined, TeamOutlined, SafetyCertificateOutlined, KeyOutlined, IdcardOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareAuthInput',
  component: FailSquareAuthInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Authentication input component for FailSquare with password visibility toggle, icon support, and both controlled and uncontrolled modes.'
      }
    }
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'tel', 'url'],
      description: 'Input type'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    value: {
      control: 'text',
      description: 'Controlled value'
    },
    icon: {
      description: 'Icon to display (React node)'
    },
    onValueChange: {
      action: 'value-changed',
      description: 'Callback when input value changes'
    },
    onBlur: {
      action: 'input-blurred',
      description: 'Callback when input loses focus'
    }
  }
};
export default meta;
export const Default = {
  args: {
    placeholder: 'Enter text here...',
    type: 'text'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic auth input without icon.'
      }
    }
  }
};
export const WithIcon = {
  args: {
    placeholder: 'Enter your username',
    type: 'text',
    icon: /*#__PURE__*/_jsx(UserOutlined, {})
  },
  parameters: {
    docs: {
      description: {
        story: 'Auth input with icon for better visual identification.'
      }
    }
  }
};
export const Password = {
  args: {
    placeholder: 'Enter your password',
    type: 'password',
    icon: /*#__PURE__*/_jsx(LockOutlined, {})
  },
  parameters: {
    docs: {
      description: {
        story: 'Password input with visibility toggle functionality.'
      }
    }
  }
};
export const Email = {
  args: {
    placeholder: 'Enter your email address',
    type: 'email',
    icon: /*#__PURE__*/_jsx(MailOutlined, {})
  },
  parameters: {
    docs: {
      description: {
        story: 'Email input with validation type and mail icon.'
      }
    }
  }
};
export const LoginForm = {
  render: () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md mx-auto space-y-4",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-xl font-semibold mb-6 text-center",
        children: "Sign In to FailSquare"
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "email",
        placeholder: "Email address",
        icon: /*#__PURE__*/_jsx(MailOutlined, {}),
        value: email,
        onValueChange: setEmail
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "password",
        placeholder: "Password",
        icon: /*#__PURE__*/_jsx(LockOutlined, {}),
        value: password,
        onValueChange: setPassword
      }), /*#__PURE__*/_jsx("div", {
        className: "pt-2",
        children: /*#__PURE__*/_jsx("button", {
          className: "w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors",
          children: "Sign In"
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-600 text-center",
        children: ["Current values: Email: \"", email, "\", Password: \"", password.replace(/./g, '•'), "\""]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete login form using controlled FailSquareAuthInput components.'
      }
    }
  }
};
export const RegistrationForm = {
  render: () => {
    const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      organization: ''
    });
    const updateField = field => value => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "max-w-md mx-auto space-y-4",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "text-xl font-semibold mb-6 text-center",
        children: "Join FailSquare"
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "text",
        placeholder: "Username",
        icon: /*#__PURE__*/_jsx(UserOutlined, {}),
        value: formData.username,
        onValueChange: updateField('username')
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "email",
        placeholder: "Email address",
        icon: /*#__PURE__*/_jsx(MailOutlined, {}),
        value: formData.email,
        onValueChange: updateField('email')
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "text",
        placeholder: "Organization (optional)",
        icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
        value: formData.organization,
        onValueChange: updateField('organization')
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "password",
        placeholder: "Password",
        icon: /*#__PURE__*/_jsx(LockOutlined, {}),
        value: formData.password,
        onValueChange: updateField('password')
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "password",
        placeholder: "Confirm password",
        icon: /*#__PURE__*/_jsx(SafetyCertificateOutlined, {}),
        value: formData.confirmPassword,
        onValueChange: updateField('confirmPassword')
      }), /*#__PURE__*/_jsx("div", {
        className: "pt-2",
        children: /*#__PURE__*/_jsx("button", {
          className: "w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors",
          children: "Create Account"
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Registration form with multiple controlled inputs.'
      }
    }
  }
};
export const InputTypes = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-md mx-auto",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Different Input Types"
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "text",
      placeholder: "Text input",
      icon: /*#__PURE__*/_jsx(UserOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "email",
      placeholder: "Email input",
      icon: /*#__PURE__*/_jsx(MailOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "password",
      placeholder: "Password input",
      icon: /*#__PURE__*/_jsx(LockOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "tel",
      placeholder: "Phone number",
      icon: /*#__PURE__*/_jsx(PhoneOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "url",
      placeholder: "Website URL",
      icon: /*#__PURE__*/_jsx(GlobalOutlined, {})
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Various input types with appropriate icons.'
      }
    }
  }
};
export const SecurityInputs = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-md mx-auto",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Security & Authentication"
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "password",
      placeholder: "Current password",
      icon: /*#__PURE__*/_jsx(LockOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "password",
      placeholder: "New password",
      icon: /*#__PURE__*/_jsx(KeyOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "password",
      placeholder: "Confirm new password",
      icon: /*#__PURE__*/_jsx(SafetyCertificateOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "text",
      placeholder: "Two-factor authentication code",
      icon: /*#__PURE__*/_jsx(IdcardOutlined, {})
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Security-related inputs for password changes and 2FA.'
      }
    }
  }
};
export const UncontrolledMode = {
  render: () => {
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md mx-auto",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Uncontrolled Inputs"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "These inputs manage their own state internally."
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "text",
        placeholder: "Uncontrolled username",
        icon: /*#__PURE__*/_jsx(UserOutlined, {}),
        onValueChange: value => console.log('Username changed:', value)
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "email",
        placeholder: "Uncontrolled email",
        icon: /*#__PURE__*/_jsx(MailOutlined, {}),
        onValueChange: value => console.log('Email changed:', value)
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "password",
        placeholder: "Uncontrolled password",
        icon: /*#__PURE__*/_jsx(LockOutlined, {}),
        onValueChange: value => console.log('Password changed:', value)
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled mode where inputs manage their own state.'
      }
    }
  }
};
export const WithValidation = {
  render: () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const validateEmail = value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) {
        setEmailError('Email is required');
      } else if (!emailRegex.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    };
    const validatePassword = value => {
      if (!value) {
        setPasswordError('Password is required');
      } else if (value.length < 8) {
        setPasswordError('Password must be at least 8 characters');
      } else {
        setPasswordError('');
      }
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md mx-auto",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Validation Example"
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(FailSquareAuthInput, {
          type: "email",
          placeholder: "Email address",
          icon: /*#__PURE__*/_jsx(MailOutlined, {}),
          value: email,
          onValueChange: value => {
            setEmail(value);
            validateEmail(value);
          },
          onBlur: () => validateEmail(email),
          className: emailError ? 'border-red-500' : ''
        }), emailError && /*#__PURE__*/_jsx("p", {
          className: "text-red-500 text-sm mt-1",
          children: emailError
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(FailSquareAuthInput, {
          type: "password",
          placeholder: "Password",
          icon: /*#__PURE__*/_jsx(LockOutlined, {}),
          value: password,
          onValueChange: value => {
            setPassword(value);
            validatePassword(value);
          },
          onBlur: () => validatePassword(password),
          className: passwordError ? 'border-red-500' : ''
        }), passwordError && /*#__PURE__*/_jsx("p", {
          className: "text-red-500 text-sm mt-1",
          children: passwordError
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-600",
        children: [/*#__PURE__*/_jsx("p", {
          children: "\u2713 Real-time validation"
        }), /*#__PURE__*/_jsx("p", {
          children: "\u2713 Validation on blur"
        }), /*#__PURE__*/_jsx("p", {
          children: "\u2713 Error state styling"
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Input validation with error states and messages.'
      }
    }
  }
};
export const PasswordStrength = {
  render: () => {
    const [password, setPassword] = useState('');
    const getPasswordStrength = pwd => {
      let strength = 0;
      if (pwd.length >= 8) strength++;
      if (/[a-z]/.test(pwd)) strength++;
      if (/[A-Z]/.test(pwd)) strength++;
      if (/[0-9]/.test(pwd)) strength++;
      if (/[^A-Za-z0-9]/.test(pwd)) strength++;
      return strength;
    };
    const strength = getPasswordStrength(password);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md mx-auto",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Password Strength Indicator"
      }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
        type: "password",
        placeholder: "Enter a strong password",
        icon: /*#__PURE__*/_jsx(LockOutlined, {}),
        value: password,
        onValueChange: setPassword
      }), password && /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex justify-between text-sm",
          children: [/*#__PURE__*/_jsx("span", {
            children: "Password Strength:"
          }), /*#__PURE__*/_jsx("span", {
            className: `font-medium ${strength >= 3 ? 'text-green-600' : 'text-orange-600'}`,
            children: strengthLabels[strength]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "flex space-x-1",
          children: [1, 2, 3, 4, 5].map(level => /*#__PURE__*/_jsx("div", {
            className: `h-2 flex-1 rounded ${level <= strength ? strengthColors[strength] : 'bg-gray-200'}`
          }, level))
        }), /*#__PURE__*/_jsxs("ul", {
          className: "text-xs text-gray-600 space-y-1",
          children: [/*#__PURE__*/_jsx("li", {
            className: password.length >= 8 ? 'text-green-600' : '',
            children: "\u2713 At least 8 characters"
          }), /*#__PURE__*/_jsx("li", {
            className: /[a-z]/.test(password) ? 'text-green-600' : '',
            children: "\u2713 Lowercase letter"
          }), /*#__PURE__*/_jsx("li", {
            className: /[A-Z]/.test(password) ? 'text-green-600' : '',
            children: "\u2713 Uppercase letter"
          }), /*#__PURE__*/_jsx("li", {
            className: /[0-9]/.test(password) ? 'text-green-600' : '',
            children: "\u2713 Number"
          }), /*#__PURE__*/_jsx("li", {
            className: /[^A-Za-z0-9]/.test(password) ? 'text-green-600' : '',
            children: "\u2713 Special character"
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Password input with strength indicator and requirements checklist.'
      }
    }
  }
};
export const AccessibilityFeatures = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-md mx-auto",
    children: [/*#__PURE__*/_jsx("h4", {
      className: "font-medium text-gray-700",
      children: "Accessibility Features"
    }), /*#__PURE__*/_jsx("p", {
      className: "text-sm text-gray-600",
      children: "Inputs with proper focus management and keyboard navigation."
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "text",
      placeholder: "Tab to navigate (1)",
      icon: /*#__PURE__*/_jsx(UserOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "email",
      placeholder: "Focus ring and outline (2)",
      icon: /*#__PURE__*/_jsx(MailOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareAuthInput, {
      type: "password",
      placeholder: "Screen reader compatible (3)",
      icon: /*#__PURE__*/_jsx(LockOutlined, {})
    }), /*#__PURE__*/_jsxs("div", {
      className: "text-sm text-gray-600 bg-gray-50 p-3 rounded",
      children: [/*#__PURE__*/_jsx("p", {
        children: /*#__PURE__*/_jsx("strong", {
          children: "Accessibility features:"
        })
      }), /*#__PURE__*/_jsxs("ul", {
        className: "list-disc list-inside space-y-1 mt-2",
        children: [/*#__PURE__*/_jsx("li", {
          children: "Keyboard navigation support"
        }), /*#__PURE__*/_jsx("li", {
          children: "Focus ring indicators"
        }), /*#__PURE__*/_jsx("li", {
          children: "Screen reader compatibility"
        }), /*#__PURE__*/_jsx("li", {
          children: "Password visibility toggle"
        })]
      })]
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstration of accessibility features and keyboard navigation.'
      }
    }
  }
};