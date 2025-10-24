import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Input, Button, Alert, Steps, Spin, Typography } from 'antd';
import { SafetyOutlined, QrcodeOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Step
} = Steps;
const {
  Title,
  Paragraph,
  Text
} = Typography;
const TwoFactorSetupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    initializeSetup();
  }, []);
  const initializeSetup = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/2fa/setup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      // });
      // const data = await response.json();

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = {
        qrCodeUrl: 'otpauth://totp/FailSquare:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FailSquare',
        sharedKey: 'JBSWY3DPEHPK3PXP'
      };
      setSetupData(mockData);
      setCurrentStep(1);
    } catch (err) {
      console.error('Failed to setup 2FA:', err);
      setError('Failed to initialize two-factor authentication setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const getQrCodeImageUrl = qrCodeUrl => {
    // Using Google Charts API to generate QR code
    return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(qrCodeUrl)}`;
  };
  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    try {
      setVerifying(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/2fa/verify', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code: verificationCode }),
      // });
      // const result = await response.json();

      // Mock verification
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success (in reality, check response)
      const isValid = verificationCode.length === 6;
      if (isValid) {
        setCurrentStep(2);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      console.error('Failed to verify code:', err);
      setError('Failed to verify the code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50 flex items-center justify-center p-4",
    children: /*#__PURE__*/_jsxs(Card, {
      className: "w-full max-w-2xl shadow-lg",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "text-center mb-6",
        children: [/*#__PURE__*/_jsx(SafetyOutlined, {
          className: "text-5xl text-blue-500 mb-4"
        }), /*#__PURE__*/_jsx(Title, {
          level: 2,
          children: "Two-Factor Authentication Setup"
        }), /*#__PURE__*/_jsx(Paragraph, {
          className: "text-gray-600",
          children: "Add an extra layer of security to your account"
        })]
      }), /*#__PURE__*/_jsxs(Steps, {
        current: currentStep,
        className: "mb-8",
        children: [/*#__PURE__*/_jsx(Step, {
          title: "Initialize",
          icon: /*#__PURE__*/_jsx(SafetyOutlined, {})
        }), /*#__PURE__*/_jsx(Step, {
          title: "Scan QR Code",
          icon: /*#__PURE__*/_jsx(QrcodeOutlined, {})
        }), /*#__PURE__*/_jsx(Step, {
          title: "Verify",
          icon: /*#__PURE__*/_jsx(CheckOutlined, {})
        })]
      }), loading ? /*#__PURE__*/_jsx("div", {
        className: "text-center py-12",
        children: /*#__PURE__*/_jsx(Spin, {
          size: "large",
          tip: "Initializing two-factor authentication..."
        })
      }) : currentStep === 2 ? /*#__PURE__*/_jsx(Alert, {
        message: "Two-Factor Authentication Enabled!",
        description: "Your account is now protected with two-factor authentication. You'll be redirected to the dashboard shortly.",
        type: "success",
        showIcon: true,
        icon: /*#__PURE__*/_jsx(CheckOutlined, {})
      }) : setupData ? /*#__PURE__*/_jsxs("div", {
        className: "space-y-6",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx(Title, {
            level: 4,
            children: "Step 1: Install an Authenticator App"
          }), /*#__PURE__*/_jsx(Paragraph, {
            children: "Install an authenticator app on your mobile device if you haven't already. We recommend:"
          }), /*#__PURE__*/_jsxs("ul", {
            className: "list-disc list-inside space-y-1 text-gray-600",
            children: [/*#__PURE__*/_jsx("li", {
              children: "Google Authenticator (iOS / Android)"
            }), /*#__PURE__*/_jsx("li", {
              children: "Microsoft Authenticator (iOS / Android)"
            }), /*#__PURE__*/_jsx("li", {
              children: "Authy (iOS / Android)"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx(Title, {
            level: 4,
            children: "Step 2: Scan the QR Code"
          }), /*#__PURE__*/_jsx(Paragraph, {
            children: "Open your authenticator app and scan this QR code:"
          }), /*#__PURE__*/_jsx("div", {
            className: "flex justify-center p-6 bg-white border rounded",
            children: /*#__PURE__*/_jsx("img", {
              src: getQrCodeImageUrl(setupData.qrCodeUrl),
              alt: "QR Code",
              className: "w-64 h-64"
            })
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx(Title, {
            level: 4,
            children: "Step 3: Manual Entry (Alternative)"
          }), /*#__PURE__*/_jsx(Paragraph, {
            children: "If you can't scan the QR code, manually enter this key in your authenticator app:"
          }), /*#__PURE__*/_jsx(Alert, {
            message: /*#__PURE__*/_jsx("div", {
              className: "text-center",
              children: /*#__PURE__*/_jsx(Text, {
                code: true,
                className: "text-lg",
                children: setupData.sharedKey
              })
            }),
            type: "info"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx(Title, {
            level: 4,
            children: "Step 4: Verify Setup"
          }), /*#__PURE__*/_jsx(Paragraph, {
            children: "Enter the 6-digit code shown in your authenticator app:"
          }), /*#__PURE__*/_jsx(Input, {
            size: "large",
            placeholder: "Enter 6-digit code",
            value: verificationCode,
            onChange: e => setVerificationCode(e.target.value.replace(/\D/g, '')),
            maxLength: 6,
            className: "text-center text-2xl tracking-widest",
            onPressEnter: handleVerify
          })]
        }), error && /*#__PURE__*/_jsx(Alert, {
          message: "Verification Failed",
          description: error,
          type: "error",
          showIcon: true,
          closable: true,
          onClose: () => setError(null)
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex justify-between pt-4",
          children: [/*#__PURE__*/_jsx(Button, {
            onClick: () => navigate('/dashboard'),
            children: "Cancel"
          }), /*#__PURE__*/_jsx(Button, {
            type: "primary",
            size: "large",
            onClick: handleVerify,
            loading: verifying,
            disabled: verificationCode.length !== 6,
            children: "Verify and Enable 2FA"
          })]
        }), /*#__PURE__*/_jsx(Alert, {
          message: "Security Tip",
          description: "Save your backup codes in a secure location. You'll need them if you lose access to your authenticator app.",
          type: "warning",
          showIcon: true,
          className: "mt-4"
        })]
      }) : /*#__PURE__*/_jsx(Alert, {
        message: "Setup Failed",
        description: error || 'Failed to initialize two-factor authentication.',
        type: "error",
        showIcon: true,
        action: /*#__PURE__*/_jsx(Button, {
          size: "small",
          onClick: initializeSetup,
          children: "Try Again"
        })
      })]
    })
  });
};
export default TwoFactorSetupPage;