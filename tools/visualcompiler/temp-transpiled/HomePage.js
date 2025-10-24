import { useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Row, Col, Space } from 'antd';
import { ThunderboltOutlined, TrophyOutlined, BranchesOutlined } from '@ant-design/icons';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import DashboardPage from 'file://E:/allocation/failsquare-frontend/src/pages/DashboardPage';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from 'file://E:/allocation/failsquare-frontend/src/components/FailSquareButton';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const HomePage = () => {
  const {
    isAuthenticated
  } = useAuth();
  const {
    navigateToTab
  } = useTabNavigation();
  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigateToTab('/dashboard', 'Dashboard', {
        closable: false
      });
    }
  }, [isAuthenticated, navigateToTab]);

  // If authenticated, show dashboard directly
  if (isAuthenticated) {
    return /*#__PURE__*/_jsx(DashboardPage, {});
  }
  return /*#__PURE__*/_jsx(Row, {
    className: "min-h-screen items-center justify-center bg-gray-50",
    children: /*#__PURE__*/_jsxs(Col, {
      span: 16,
      className: "text-center p-8",
      children: [/*#__PURE__*/_jsx("img", {
        src: "/assets/logo-animated.gif",
        alt: "FailSquare",
        className: "w-64 mx-auto mb-8"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-xl text-gray-600 mb-8 max-w-2xl mx-auto",
        children: "Document ambitious failures. Learn from what didn't work. Prevent redundant exploration of dead-ends."
      }), /*#__PURE__*/_jsxs(Space, {
        size: "large",
        className: "mb-16",
        children: [/*#__PURE__*/_jsx(FailSquareButton, {
          type: "primary",
          size: "large",
          onClick: () => navigateToTab('/register', 'Get Started'),
          className: "px-8 py-6 h-auto text-lg",
          children: "Get Started"
        }), /*#__PURE__*/_jsx(FailSquareButton, {
          size: "large",
          onClick: () => navigateToTab('/login', 'Sign In'),
          className: "px-8 py-6 h-auto text-lg",
          children: "Sign In"
        })]
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: [24, 24],
        className: "mt-12",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 8,
          children: /*#__PURE__*/_jsxs(FailSquareCard, {
            className: "h-full hover:shadow-lg transition-shadow",
            children: [/*#__PURE__*/_jsx(ThunderboltOutlined, {
              className: "text-5xl text-blue-500 mb-4"
            }), /*#__PURE__*/_jsx("h3", {
              className: "text-xl font-semibold mb-3",
              children: "Document Rigorously"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Share detailed documentation of approaches that failed, with systematic methodology and quantitative results."
            })]
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 8,
          children: /*#__PURE__*/_jsxs(FailSquareCard, {
            className: "h-full hover:shadow-lg transition-shadow",
            children: [/*#__PURE__*/_jsx(TrophyOutlined, {
              className: "text-5xl text-yellow-500 mb-4"
            }), /*#__PURE__*/_jsx("h3", {
              className: "text-xl font-semibold mb-3",
              children: "Earn Merit"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Get recognized for thorough failure documentation. Clarity, rigor, and reproducibility are rewarded."
            })]
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 8,
          children: /*#__PURE__*/_jsxs(FailSquareCard, {
            className: "h-full hover:shadow-lg transition-shadow",
            children: [/*#__PURE__*/_jsx(BranchesOutlined, {
              className: "text-5xl text-green-500 mb-4"
            }), /*#__PURE__*/_jsx("h3", {
              className: "text-xl font-semibold mb-3",
              children: "Enable Resurrection"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Help identify when conditions change enough to revisit abandoned approaches and turn failures into breakthroughs."
            })]
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "mt-16 p-8 bg-white rounded-lg shadow-md",
        children: [/*#__PURE__*/_jsx("h2", {
          className: "text-2xl font-bold mb-4",
          children: "Why FailSquare?"
        }), /*#__PURE__*/_jsxs("div", {
          className: "text-left max-w-3xl mx-auto space-y-4 text-gray-700",
          children: [/*#__PURE__*/_jsxs("p", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Stop redundant research:"
            }), " Save hundreds of thousands of person-years annually by documenting what doesn't work."]
          }), /*#__PURE__*/_jsxs("p", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Map the explored territory:"
            }), " Build a collective knowledge base of dead-ends, failure modes, and boundary conditions."]
          }), /*#__PURE__*/_jsxs("p", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Resurrect old failures:"
            }), " Track when technological or theoretical advances make yesterday's failures tomorrow's breakthroughs."]
          })]
        })]
      })]
    })
  });
};
export default HomePage;