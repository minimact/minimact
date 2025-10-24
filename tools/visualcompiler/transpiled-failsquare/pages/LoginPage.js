import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Form, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { authService, tokenManager } from '../services/api';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from '../components/FailSquareButton';
import FailSquareAuthInput from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailSquareAuthInput.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {
    navigateToTab
  } = useTabNavigation();
  const {
    login
  } = useAuth();
  const handleSubmit = async values => {
    setLoading(true);
    setError(null);
    try {
      const success = await login(values.email, values.password);
      if (success) {
        navigateToTab('/dashboard', 'Dashboard', {
          closable: false
        });
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Call the Google Sign-In utility
      const idToken = await window.initializeGoogleSignIn();
      if (!idToken) {
        setError('Google Sign-In failed');
        return;
      }

      // Call our API with the ID token
      const result = await authService.googleSignIn(idToken);
      if (result.accessToken) {
        // Store tokens
        tokenManager.setToken(result.accessToken);
        if (result.refreshToken) {
          tokenManager.setRefreshToken(result.refreshToken);
        }

        // Check if user needs to link their Google account
        if (result.requiresGoogleLink) {
          navigateToTab('/account/link-google', 'Link Google Account', {
            closable: false
          });
          return;
        }

        // Update auth context and navigate to dashboard
        await login(result.user.email, ''); // This will set the user in context
        navigateToTab('/dashboard', 'Dashboard', {
          closable: false
        });
      } else {
        setError('Google login failed');
      }
    } catch (err) {
      setError('An error occurred during Google login. Please try again.');
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50 flex items-center justify-center p-4",
    children: /*#__PURE__*/_jsxs(FailSquareCard, {
      className: "w-full max-w-md shadow-lg",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "text-center mb-6",
        children: [/*#__PURE__*/_jsx("img", {
          src: "/assets/logo-animated.gif",
          alt: "FailSquare",
          className: "w-48 mx-auto mb-4"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-600",
          children: "Sign in to document your failures"
        })]
      }), error && /*#__PURE__*/_jsx(Alert, {
        message: error,
        type: "error",
        closable: true,
        onClose: () => setError(null),
        className: "mb-4"
      }), /*#__PURE__*/_jsxs(Form, {
        name: "login",
        onFinish: handleSubmit,
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
            icon: /*#__PURE__*/_jsx(UserOutlined, {}),
            placeholder: "your.email@example.com"
          })
        }), /*#__PURE__*/_jsx(Form.Item, {
          name: "password",
          label: "Password",
          rules: [{
            required: true,
            message: 'Please enter your password'
          }],
          children: /*#__PURE__*/_jsx(FailSquareAuthInput, {
            type: "password",
            icon: /*#__PURE__*/_jsx(LockOutlined, {}),
            placeholder: "Enter your password"
          })
        }), /*#__PURE__*/_jsx(Form.Item, {
          children: /*#__PURE__*/_jsx(FailSquareButton, {
            type: "primary",
            htmlType: "submit",
            loading: loading,
            block: true,
            size: "large",
            children: "Sign In"
          })
        })]
      }), /*#__PURE__*/_jsx(Divider, {
        children: "Or"
      }), /*#__PURE__*/_jsx(FailSquareButton, {
        icon: /*#__PURE__*/_jsx(GoogleOutlined, {}),
        onClick: handleGoogleLogin,
        block: true,
        size: "large",
        className: "mb-4",
        children: "Sign in with Google"
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-center mt-4",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-gray-600",
          children: "Don't have an account? "
        }), /*#__PURE__*/_jsx(Link, {
          to: "/register",
          className: "text-blue-500 hover:text-blue-600",
          children: "Sign up"
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
export default LoginPage;