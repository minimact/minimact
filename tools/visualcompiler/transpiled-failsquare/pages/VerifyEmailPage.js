import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Spin, Result, Button, Space } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);
  const verifyEmail = async verificationToken => {
    try {
      setIsVerifying(true);
      setErrorMessage(null);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
      // const result = await response.json();

      // Mock verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success (in reality, check response)
      const success = verificationToken.length > 10;
      if (success) {
        setVerificationSuccess(true);
      } else {
        setErrorMessage('The verification link is invalid or has expired.');
      }
    } catch (error) {
      console.error('Email verification failed:', error);
      setErrorMessage('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      setErrorMessage(null);

      // Try to get email from localStorage or state
      const email = localStorage.getItem('pendingVerificationEmail');
      if (!email) {
        setErrorMessage('Email address not found. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/resend-verification', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      // Mock resend
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      setErrorMessage(null);
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Failed to resend verification:', error);
      setErrorMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };
  const renderContent = () => {
    if (isVerifying) {
      return /*#__PURE__*/_jsx("div", {
        className: "text-center py-12",
        children: /*#__PURE__*/_jsx(Spin, {
          size: "large",
          tip: "Verifying your email..."
        })
      });
    }
    if (verificationSuccess) {
      return /*#__PURE__*/_jsx(Result, {
        status: "success",
        title: "Email Verified!",
        subTitle: "Your email has been successfully verified. You can now access all features.",
        extra: [/*#__PURE__*/_jsx(Button, {
          type: "primary",
          onClick: () => navigate('/dashboard'),
          children: "Go to Dashboard"
        }, "home")]
      });
    }
    if (token && errorMessage) {
      return /*#__PURE__*/_jsx(Result, {
        status: "error",
        title: "Verification Failed",
        subTitle: errorMessage,
        extra: [/*#__PURE__*/_jsxs(Space, {
          children: [/*#__PURE__*/_jsx(Button, {
            onClick: handleResendVerification,
            loading: isResending,
            children: "Resend Verification Email"
          }), /*#__PURE__*/_jsx(Button, {
            type: "primary",
            onClick: () => navigate('/'),
            children: "Go to Homepage"
          })]
        }, "actions")]
      });
    }

    // Default state: No token, just showing instructions
    return /*#__PURE__*/_jsxs("div", {
      className: "text-center py-8",
      children: [/*#__PURE__*/_jsx(MailOutlined, {
        className: "text-6xl text-blue-500 mb-4"
      }), /*#__PURE__*/_jsx("h2", {
        className: "text-2xl font-bold mb-2",
        children: "Check Your Email"
      }), /*#__PURE__*/_jsxs("p", {
        className: "text-gray-500 mb-8",
        children: ["We've sent a verification link to your email address.", /*#__PURE__*/_jsx("br", {}), "Please click the link to verify your account."]
      }), errorMessage && /*#__PURE__*/_jsx("div", {
        className: "mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700",
        children: errorMessage
      }), /*#__PURE__*/_jsxs(Space, {
        children: [/*#__PURE__*/_jsx(Button, {
          onClick: handleResendVerification,
          loading: isResending,
          children: "Resend Verification Email"
        }), /*#__PURE__*/_jsx(Button, {
          type: "link",
          onClick: () => navigate('/'),
          children: "Skip for now"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-8 text-sm text-gray-400",
        children: [/*#__PURE__*/_jsx("p", {
          children: "Didn't receive the email?"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "mt-2 space-y-1",
          children: [/*#__PURE__*/_jsx("li", {
            children: "Check your spam or junk folder"
          }), /*#__PURE__*/_jsx("li", {
            children: "Make sure you entered the correct email address"
          }), /*#__PURE__*/_jsx("li", {
            children: "Wait a few minutes and try resending"
          })]
        })]
      })]
    });
  };
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50 flex items-center justify-center p-4",
    children: /*#__PURE__*/_jsx(Card, {
      className: "w-full max-w-lg shadow-lg",
      children: renderContent()
    })
  });
};
export default VerifyEmailPage;