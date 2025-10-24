import { BrowserRouter } from 'react-router-dom';
import { Card, Typography } from 'antd';
import ProtectedRoute from 'file://E:/allocation/failsquare/failsquare-frontend/src/components/ProtectedRoute.js';
import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Title,
  Text
} = Typography;

// Mock AuthContext for Storybook

const MockAuthContext = createContext(undefined);
const MockAuthProvider = ({
  children,
  isAuthenticated,
  isLoading
}) => {
  const mockValue = {
    user: isAuthenticated ? {
      id: 'user-123',
      email: 'john.doe@example.com',
      username: 'johndoe',
      displayName: 'John Doe',
      meritScore: 0.78
    } : null,
    isAuthenticated,
    isLoading,
    error: null,
    login: async () => true,
    register: async () => true,
    logout: async () => {},
    refreshUser: async () => {}
  };
  return /*#__PURE__*/_jsx(MockAuthContext.Provider, {
    value: mockValue,
    children: children
  });
};
const meta = {
  title: 'FailSquare/ProtectedRoute',
  component: ProtectedRoute,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A route wrapper component that protects pages requiring authentication. Shows loading state, redirects to login when not authenticated, or renders children when authenticated.'
      }
    }
  },
  decorators: [Story => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(Story, {})
  })]
};
export default meta;
// Sample protected content
const ProtectedContent = () => /*#__PURE__*/_jsx("div", {
  className: "min-h-screen bg-gray-50 p-8",
  children: /*#__PURE__*/_jsxs(Card, {
    className: "max-w-4xl mx-auto",
    children: [/*#__PURE__*/_jsx(Title, {
      level: 2,
      children: "\uD83C\uDF89 Welcome to FailSquare Dashboard"
    }), /*#__PURE__*/_jsx(Text, {
      children: "This is protected content that only authenticated users can see. You've successfully accessed the FailSquare platform where you can document, browse, and learn from scientific and technical failures."
    }), /*#__PURE__*/_jsxs("div", {
      className: "mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
      children: [/*#__PURE__*/_jsxs(Card, {
        size: "small",
        className: "text-center",
        children: [/*#__PURE__*/_jsx(Title, {
          level: 4,
          children: "\uD83D\uDCDD Document Failures"
        }), /*#__PURE__*/_jsx(Text, {
          children: "Share your research failures with the community"
        })]
      }), /*#__PURE__*/_jsxs(Card, {
        size: "small",
        className: "text-center",
        children: [/*#__PURE__*/_jsx(Title, {
          level: 4,
          children: "\uD83D\uDD0D Browse Research"
        }), /*#__PURE__*/_jsx(Text, {
          children: "Explore documented failures to avoid repeated work"
        })]
      }), /*#__PURE__*/_jsxs(Card, {
        size: "small",
        className: "text-center",
        children: [/*#__PURE__*/_jsx(Title, {
          level: 4,
          children: "\u26A1 Resurrect Ideas"
        }), /*#__PURE__*/_jsx(Text, {
          children: "Find approaches ready for revival with new technology"
        })]
      })]
    })]
  })
});
export const Authenticated = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(MockAuthProvider, {
      isAuthenticated: true,
      isLoading: false,
      children: /*#__PURE__*/_jsx(ProtectedRoute, {
        children: /*#__PURE__*/_jsx(ProtectedContent, {})
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'When user is authenticated, the protected content is rendered normally.'
      }
    },
    // Mock the useAuth hook to return authenticated state
    msw: {
      handlers: []
    }
  }
};
export const Loading = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(MockAuthProvider, {
      isAuthenticated: false,
      isLoading: true,
      children: /*#__PURE__*/_jsx(ProtectedRoute, {
        children: /*#__PURE__*/_jsx(ProtectedContent, {})
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Loading state shown while authentication status is being determined.'
      }
    }
  }
};
export const NotAuthenticated = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(MockAuthProvider, {
      isAuthenticated: false,
      isLoading: false,
      children: /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsxs("div", {
          className: "mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded",
          children: [/*#__PURE__*/_jsx(Text, {
            strong: true,
            children: "Note:"
          }), " In a real app, this would redirect to /login. In Storybook, we show a placeholder redirect message."]
        }), /*#__PURE__*/_jsx(ProtectedRoute, {
          children: /*#__PURE__*/_jsx(ProtectedContent, {})
        })]
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'When user is not authenticated, redirects to login page (in real app) or shows redirect message (in Storybook).'
      }
    }
  }
};

// Different types of protected content
export const WithFailureSubmissionForm = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(MockAuthProvider, {
      isAuthenticated: true,
      isLoading: false,
      children: /*#__PURE__*/_jsx(ProtectedRoute, {
        children: /*#__PURE__*/_jsx("div", {
          className: "min-h-screen bg-gray-50 p-8",
          children: /*#__PURE__*/_jsxs(Card, {
            className: "max-w-4xl mx-auto",
            children: [/*#__PURE__*/_jsx(Title, {
              level: 2,
              children: "Submit New Failure Documentation"
            }), /*#__PURE__*/_jsx(Text, {
              className: "text-gray-600 mb-6 block",
              children: "Document your research failure to help the scientific community avoid redundant work."
            }), /*#__PURE__*/_jsxs("div", {
              className: "space-y-6",
              children: [/*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx(Text, {
                  strong: true,
                  children: "Failure Title:"
                }), /*#__PURE__*/_jsx("div", {
                  className: "mt-2 p-3 border border-gray-300 rounded bg-gray-50",
                  children: "Neural Network Tensor-as-Vector Architecture"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx(Text, {
                  strong: true,
                  children: "Domain:"
                }), /*#__PURE__*/_jsx("div", {
                  className: "mt-2 p-3 border border-gray-300 rounded bg-gray-50",
                  children: "Machine Learning"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx(Text, {
                  strong: true,
                  children: "Approach Description:"
                }), /*#__PURE__*/_jsx("div", {
                  className: "mt-2 p-3 border border-gray-300 rounded bg-gray-50 h-24",
                  children: "[Markdown editor would be here...]"
                })]
              })]
            })]
          })
        })
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Example of protecting a failure submission form that requires authentication.'
      }
    }
  }
};
export const WithUserProfile = {
  render: () => /*#__PURE__*/_jsx(BrowserRouter, {
    children: /*#__PURE__*/_jsx(MockAuthProvider, {
      isAuthenticated: true,
      isLoading: false,
      children: /*#__PURE__*/_jsx(ProtectedRoute, {
        children: /*#__PURE__*/_jsx("div", {
          className: "min-h-screen bg-gray-50 p-8",
          children: /*#__PURE__*/_jsxs(Card, {
            className: "max-w-4xl mx-auto",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-4 mb-6",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl",
                children: "JD"
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx(Title, {
                  level: 2,
                  className: "mb-0",
                  children: "John Doe"
                }), /*#__PURE__*/_jsx(Text, {
                  className: "text-gray-600",
                  children: "@johndoe \u2022 Merit Score: 78%"
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-3 gap-6",
              children: [/*#__PURE__*/_jsxs(Card, {
                size: "small",
                className: "text-center",
                children: [/*#__PURE__*/_jsx(Title, {
                  level: 3,
                  className: "text-blue-600",
                  children: "12"
                }), /*#__PURE__*/_jsx(Text, {
                  children: "Failures Documented"
                })]
              }), /*#__PURE__*/_jsxs(Card, {
                size: "small",
                className: "text-center",
                children: [/*#__PURE__*/_jsx(Title, {
                  level: 3,
                  className: "text-green-600",
                  children: "3"
                }), /*#__PURE__*/_jsx(Text, {
                  children: "Approaches Resurrected"
                })]
              }), /*#__PURE__*/_jsxs(Card, {
                size: "small",
                className: "text-center",
                children: [/*#__PURE__*/_jsx(Title, {
                  level: 3,
                  className: "text-purple-600",
                  children: "156"
                }), /*#__PURE__*/_jsx(Text, {
                  children: "Community Impact"
                })]
              })]
            })]
          })
        })
      })
    })
  }),
  parameters: {
    docs: {
      description: {
        story: 'Example of protecting a user profile page with personal statistics.'
      }
    }
  }
};