import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Button, Alert, Space } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, tokenManager } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const GoogleLinkPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const handleGoogleLink = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Initialize Google Sign-In
      const idToken = await window.initializeGoogleSignIn();
      if (!idToken) {
        setErrorMessage('Google Sign-In was cancelled');
        return;
      }

      // Link the Google account
      const result = await authService.linkGoogleAccount(idToken);
      if (result.accessToken) {
        // Update tokens
        tokenManager.setToken(result.accessToken);
        if (result.refreshToken) {
          tokenManager.setRefreshToken(result.refreshToken);
        }

        // Navigate to return URL or dashboard
        navigate(returnUrl);
      } else {
        setErrorMessage('Failed to link Google account. Please try again.');
      }
    } catch (error) {
      console.error('Failed to link Google account:', error);
      setErrorMessage('An unexpected error occurred while linking Google account.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSkip = () => {
    navigate(returnUrl);
  };
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50 flex items-center justify-center p-4",
    children: /*#__PURE__*/_jsxs(Card, {
      className: "w-full max-w-md shadow-lg",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "text-center mb-8",
        children: [/*#__PURE__*/_jsx(GoogleOutlined, {
          className: "text-6xl text-blue-500 mb-4"
        }), /*#__PURE__*/_jsx("h2", {
          className: "text-2xl font-bold mb-2",
          children: "Link Your Google Account"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-500",
          children: "For enhanced security, your account must be linked to Google"
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "mb-6",
        children: /*#__PURE__*/_jsx(Alert, {
          type: "info",
          message: "Why do I need to link my Google account?",
          description: "Linking your Google account helps us maintain a high level of trust in our community and protect your account with Google's security features.",
          showIcon: true
        })
      }), errorMessage && /*#__PURE__*/_jsx(Alert, {
        type: "error",
        message: errorMessage,
        showIcon: true,
        closable: true,
        onClose: () => setErrorMessage(null),
        className: "mb-4"
      }), /*#__PURE__*/_jsxs(Space, {
        direction: "vertical",
        className: "w-full",
        size: "middle",
        children: [/*#__PURE__*/_jsx(Button, {
          type: "primary",
          size: "large",
          block: true,
          icon: /*#__PURE__*/_jsx(GoogleOutlined, {}),
          onClick: handleGoogleLink,
          loading: isLoading,
          children: "Link Google Account"
        }), /*#__PURE__*/_jsx(Button, {
          type: "link",
          block: true,
          onClick: handleSkip,
          children: "Skip for now"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-8 p-4 bg-gray-50 rounded text-sm text-gray-600",
        children: [/*#__PURE__*/_jsx("h4", {
          className: "font-medium mb-2",
          children: "What happens when I link my account?"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "space-y-1 list-disc list-inside",
          children: [/*#__PURE__*/_jsx("li", {
            children: "Secure sign-in with Google authentication"
          }), /*#__PURE__*/_jsx("li", {
            children: "Protection against unauthorized access"
          }), /*#__PURE__*/_jsx("li", {
            children: "Easy account recovery if you forget your password"
          }), /*#__PURE__*/_jsx("li", {
            children: "No additional passwords to remember"
          })]
        })]
      }), /*#__PURE__*/_jsx("div", {
        className: "mt-6 text-center text-xs text-gray-400",
        children: /*#__PURE__*/_jsx("p", {
          children: "By linking your Google account, you agree to share your basic profile information (name, email) with FailSquare."
        })
      })]
    })
  });
};
export default GoogleLinkPage;