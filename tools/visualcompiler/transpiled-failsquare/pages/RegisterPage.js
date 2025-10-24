import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Form, Alert, Steps } from 'antd';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from '../components/FailSquareButton';
import FailSquareAuthInput from '../components/FailSquareAuthInput';
import FailSquareTextArea from '../components/FailSquareTextArea';
import FailSquareSelect from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareSelect.js';
import { UserOutlined, LockOutlined, MailOutlined, GoogleOutlined, ProfileOutlined, ExperimentOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { authService, tokenManager } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DOMAIN_OPTIONS = ['Machine Learning', 'Quantum Computing', 'Distributed Systems', 'Cryptography', 'Computer Vision', 'Natural Language Processing', 'Robotics', 'Blockchain', 'Bioinformatics', 'Hardware Design', 'Other'];
const EXPERTISE_LEVELS = [{
  value: 'beginner',
  label: 'Beginner'
}, {
  value: 'intermediate',
  label: 'Intermediate'
}, {
  value: 'advanced',
  label: 'Advanced'
}, {
  value: 'expert',
  label: 'Expert'
}];
const RegisterPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accountForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [interestsForm] = Form.useForm();
  const {
    navigateToTab
  } = useTabNavigation();
  const {
    register
  } = useAuth();
  const [formData, setFormData] = useState({});
  const handleAccountNext = async () => {
    try {
      const values = await accountForm.validateFields();
      setFormData(prev => ({
        ...prev,
        account: values
      }));
      setCurrentStep(1);
      setError(null);
    } catch (err) {
      console.error('Account validation failed:', err);
    }
  };
  const handleProfileNext = async () => {
    try {
      const values = await profileForm.validateFields();
      setFormData(prev => ({
        ...prev,
        profile: values
      }));
      setCurrentStep(2);
      setError(null);
    } catch (err) {
      console.error('Profile validation failed:', err);
    }
  };
  const handleFinalSubmit = async () => {
    try {
      await interestsForm.validateFields();
      setLoading(true);
      setError(null);
      if (!formData.account) {
        setError('Account information is missing');
        return;
      }
      const success = await register(formData.account.email, formData.account.username, formData.account.password);
      if (success) {
        // TODO: Send profile and interests data to backend
        navigateToTab('/dashboard', 'Dashboard', {
          closable: false
        });
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      // Call the Google Sign-In utility
      const idToken = await window.initializeGoogleSignIn();
      if (!idToken) {
        setError('Google Sign-In was cancelled');
        setLoading(false);
        return;
      }

      // Call our API with the ID token to verify and get user info
      const result = await authService.googleSignIn(idToken);
      if (result.accessToken) {
        // Store tokens
        tokenManager.setToken(result.accessToken);
        if (result.refreshToken) {
          tokenManager.setRefreshToken(result.refreshToken);
        }

        // Pre-fill form with Google data
        accountForm.setFieldsValue({
          email: result.user.email,
          username: result.user.username || result.user.email.split('@')[0]
        });
        profileForm.setFieldsValue({
          displayName: result.user.displayName || result.user.username,
          bio: result.user.bio
        });

        // Store token for later use during registration
        localStorage.setItem('pendingGoogleToken', idToken);

        // Check if user needs to link their Google account
        if (result.requiresGoogleLink) {
          navigateToTab('/account/link-google', 'Link Google Account', {
            closable: false
          });
          return;
        }

        // Move to profile step
        setCurrentStep(1);
      } else {
        setError('Google sign-up failed');
      }
    } catch (err) {
      setError('An error occurred during Google sign-up. Please try again.');
      console.error('Google signup error:', err);
    } finally {
      setLoading(false);
    }
  };
  const steps = [{
    title: 'Account',
    icon: /*#__PURE__*/_jsx(UserOutlined, {})
  }, {
    title: 'Profile',
    icon: /*#__PURE__*/_jsx(ProfileOutlined, {})
  }, {
    title: 'Interests',
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {})
  }];
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50 flex items-center justify-center p-4",
    children: /*#__PURE__*/_jsxs(FailSquareCard, {
      className: "w-full max-w-2xl shadow-lg",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "text-center mb-6",
        children: [/*#__PURE__*/_jsx("img", {
          src: "/assets/logo-animated.gif",
          alt: "FailSquare",
          className: "w-48 mx-auto mb-4"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-600",
          children: "Create an account to start documenting failures"
        })]
      }), /*#__PURE__*/_jsx(Steps, {
        current: currentStep,
        items: steps,
        className: "mb-8"
      }), error && /*#__PURE__*/_jsx(Alert, {
        message: error,
        type: "error",
        closable: true,
        onClose: () => setError(null),
        className: "mb-4"
      }), currentStep === 0 && /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsxs(Form, {
          form: accountForm,
          name: "account",
          layout: "vertical",
          size: "large",
          children: [/*#__PURE__*/_jsx(Form.Item, {
            name: "email",
            label: "Email",
            rules: [{
              required: true,
              message: 'Please enter your email'
            }, {
              type: 'email',
              message: 'Please enter a valid email'
            }],
            children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
              type: "email",
              icon: /*#__PURE__*/_jsx(MailOutlined, {}),
              placeholder: "your.email@example.com"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            name: "username",
            label: "Username",
            rules: [{
              required: true,
              message: 'Please enter a username'
            }, {
              min: 3,
              message: 'Username must be at least 3 characters'
            }, {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: 'Username can only contain letters, numbers, hyphens, and underscores'
            }],
            children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
              icon: /*#__PURE__*/_jsx(UserOutlined, {}),
              placeholder: "username"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            name: "password",
            label: "Password",
            rules: [{
              required: true,
              message: 'Please enter a password'
            }, {
              min: 8,
              message: 'Password must be at least 8 characters'
            }],
            children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
              type: "password",
              icon: /*#__PURE__*/_jsx(LockOutlined, {}),
              placeholder: "Create a strong password"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            name: "confirmPassword",
            label: "Confirm Password",
            dependencies: ['password'],
            rules: [{
              required: true,
              message: 'Please confirm your password'
            }, ({
              getFieldValue
            }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              }
            })],
            children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
              type: "password",
              icon: /*#__PURE__*/_jsx(LockOutlined, {}),
              placeholder: "Confirm your password"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            children: /*#__PURE__*/_jsx(FailSquareButton, {
              type: "primary",
              onClick: handleAccountNext,
              block: true,
              size: "large",
              children: "Next"
            })
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "text-center mt-4",
          children: /*#__PURE__*/_jsx(FailSquareButton, {
            icon: /*#__PURE__*/_jsx(GoogleOutlined, {}),
            onClick: handleGoogleSignup,
            block: true,
            size: "large",
            children: "Sign up with Google"
          })
        })]
      }), currentStep === 1 && /*#__PURE__*/_jsx("div", {
        children: /*#__PURE__*/_jsxs(Form, {
          form: profileForm,
          name: "profile",
          layout: "vertical",
          size: "large",
          children: [/*#__PURE__*/_jsx(Form.Item, {
            name: "displayName",
            label: "Display Name",
            rules: [{
              required: true,
              message: 'Please enter your display name'
            }],
            children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
              placeholder: "How should we address you?",
              maxLength: 50
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            name: "bio",
            label: "Bio (Optional)",
            help: "Tell the community a bit about yourself",
            children: /*#__PURE__*/_jsx(FailSquareTextArea, {
              rows: 4,
              placeholder: "e.g., I'm a researcher exploring quantum computing and distributed systems...",
              maxLength: 500,
              showCount: true
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex gap-2",
              children: [/*#__PURE__*/_jsx(FailSquareButton, {
                onClick: () => setCurrentStep(0),
                block: true,
                size: "large",
                children: "Back"
              }), /*#__PURE__*/_jsx(FailSquareButton, {
                type: "primary",
                onClick: handleProfileNext,
                block: true,
                size: "large",
                children: "Next"
              })]
            })
          })]
        })
      }), currentStep === 2 && /*#__PURE__*/_jsx("div", {
        children: /*#__PURE__*/_jsxs(Form, {
          form: interestsForm,
          name: "interests",
          layout: "vertical",
          size: "large",
          children: [/*#__PURE__*/_jsx(Form.Item, {
            name: "domains",
            label: "Areas of Interest",
            rules: [{
              required: true,
              message: 'Please select at least one domain'
            }],
            children: /*#__PURE__*/_jsx(FailSquareSelect, {
              mode: "multiple",
              placeholder: "Select domains you're interested in",
              options: DOMAIN_OPTIONS.map(domain => ({
                label: domain,
                value: domain
              }))
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            name: "expertise",
            label: "Overall Expertise Level",
            rules: [{
              required: true,
              message: 'Please select your expertise level'
            }],
            children: /*#__PURE__*/_jsx(FailSquareSelect, {
              placeholder: "Select your expertise level",
              options: EXPERTISE_LEVELS
            })
          }), /*#__PURE__*/_jsx(Alert, {
            message: "Why we ask",
            description: "This helps us personalize your feed and connect you with relevant failure documentation in your areas of interest.",
            type: "info",
            showIcon: true,
            className: "mb-4"
          }), /*#__PURE__*/_jsx(Form.Item, {
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex gap-2",
              children: [/*#__PURE__*/_jsx(FailSquareButton, {
                onClick: () => setCurrentStep(1),
                block: true,
                size: "large",
                children: "Back"
              }), /*#__PURE__*/_jsx(FailSquareButton, {
                type: "primary",
                onClick: handleFinalSubmit,
                loading: loading,
                block: true,
                size: "large",
                children: "Create Account"
              })]
            })
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-center mt-6 pt-4 border-t",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-gray-600",
          children: "Already have an account? "
        }), /*#__PURE__*/_jsx(Link, {
          to: "/login",
          className: "text-blue-500 hover:text-blue-600",
          children: "Sign in"
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "text-center mt-2",
        children: /*#__PURE__*/_jsx(Link, {
          to: "/",
          className: "text-gray-500 hover:text-gray-600 text-sm",
          children: "Back to home"
        })
      })]
    })
  });
};
export default RegisterPage;