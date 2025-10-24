import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { TabProvider } from './contexts/TabContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SubmitFailurePage from './pages/SubmitFailurePage';
import SquaresExplorerPage from './pages/SquaresExplorerPage';
import SquareViewPage from './pages/SquareViewPage';
import FailureViewPage from './pages/FailureViewPage';
import ProfilePage from './pages/ProfilePage';
import EditFailurePage from './pages/EditFailurePage';
import MeritHistoryPage from './pages/MeritHistoryPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FailureHistoryPage from './pages/FailureHistoryPage';
import TwoFactorSetupPage from './pages/TwoFactorSetupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GoogleLinkPage from './pages/GoogleLinkPage';
import SecurityAuditPage from './pages/SecurityAuditPage';
import LogListPage from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/pages/LogListPage.js';
import './App.css';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function App() {
  return /*#__PURE__*/_jsx(ConfigProvider, {
    theme: {
      token: {
        colorPrimary: '#1890ff'
      }
    },
    children: /*#__PURE__*/_jsx(AuthProvider, {
      children: /*#__PURE__*/_jsx(TabProvider, {
        children: /*#__PURE__*/_jsx(BrowserRouter, {
          children: /*#__PURE__*/_jsxs(Routes, {
            children: [/*#__PURE__*/_jsx(Route, {
              path: "/",
              element: /*#__PURE__*/_jsx(HomePage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/login",
              element: /*#__PURE__*/_jsx(LoginPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/register",
              element: /*#__PURE__*/_jsx(RegisterPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/verify-email",
              element: /*#__PURE__*/_jsx(VerifyEmailPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/account/link-google",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(GoogleLinkPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/dashboard",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(DashboardPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/submit",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(SubmitFailurePage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/explore",
              element: /*#__PURE__*/_jsx(SquaresExplorerPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/squares",
              element: /*#__PURE__*/_jsx(SquaresExplorerPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/squares/:slug",
              element: /*#__PURE__*/_jsx(SquareViewPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/failures/:id",
              element: /*#__PURE__*/_jsx(FailureViewPage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/failures/:id/edit",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(EditFailurePage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/failures/:id/history",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(FailureHistoryPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/users/:username",
              element: /*#__PURE__*/_jsx(ProfilePage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/profile",
              element: /*#__PURE__*/_jsx(ProfilePage, {})
            }), /*#__PURE__*/_jsx(Route, {
              path: "/merit-history",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(MeritHistoryPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/onboarding",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(OnboardingPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/admin",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(AdminDashboardPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/analytics",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(AnalyticsPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/admin/security",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(SecurityAuditPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/admin/logs",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(LogListPage, {})
              })
            }), /*#__PURE__*/_jsx(Route, {
              path: "/auth/2fa-setup",
              element: /*#__PURE__*/_jsx(ProtectedRoute, {
                children: /*#__PURE__*/_jsx(TwoFactorSetupPage, {})
              })
            })]
          })
        })
      })
    })
  });
}
export default App;