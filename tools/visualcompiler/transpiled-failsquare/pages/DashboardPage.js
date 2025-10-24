import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Row, Col, Avatar, Space, Statistic, Skeleton } from 'antd';
import { ClockCircleOutlined, ExperimentOutlined, RiseOutlined, FireOutlined, EditOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { failuresService } from '../services/api';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareTag from '../components/FailSquareTag';
import FailSquareButton from '../components/FailSquareButton';
import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DashboardPage = () => {
  const {
    navigateToTab
  } = useTabNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [failures, setFailures] = useState([]);
  useEffect(() => {
    loadFailures();
  }, []);
  const loadFailures = async () => {
    setIsLoading(true);
    try {
      const recentFailures = await failuresService.getTopFailures(6, 'recent');
      setFailures(recentFailures);
    } catch (error) {
      console.error('Error loading failures:', error);
      setFailures([]);
    } finally {
      setIsLoading(false);
    }
  };
  return /*#__PURE__*/_jsxs(MainLayout, {
    children: [/*#__PURE__*/_jsx("div", {
      className: "mb-6",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-center justify-between",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center space-x-4",
          children: [/*#__PURE__*/_jsx(Avatar, {
            size: 64,
            style: {
              backgroundColor: '#1890ff'
            },
            children: "U"
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h1", {
              className: "text-3xl font-bold text-gray-900 mb-1",
              children: "Welcome to FailSquare!"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-600",
              children: "Document ambitious failures. Learn from what didn't work."
            })]
          })]
        }), /*#__PURE__*/_jsx(Space, {
          children: /*#__PURE__*/_jsx(FailSquareButton, {
            type: "primary",
            icon: /*#__PURE__*/_jsx(EditOutlined, {}),
            onClick: () => navigateToTab('/submit', 'Submit Failure'),
            children: "New Failure"
          })
        })]
      })
    }), /*#__PURE__*/_jsxs(Row, {
      gutter: [16, 16],
      className: "mb-6",
      children: [/*#__PURE__*/_jsx(Col, {
        span: 6,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Statistic, {
            title: "Total Failures",
            value: 1247,
            prefix: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
            valueStyle: {
              color: '#1890ff'
            }
          })
        })
      }), /*#__PURE__*/_jsx(Col, {
        span: 6,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Statistic, {
            title: "Resurrected",
            value: 43,
            prefix: /*#__PURE__*/_jsx(RiseOutlined, {}),
            valueStyle: {
              color: '#52c41a'
            }
          })
        })
      }), /*#__PURE__*/_jsx(Col, {
        span: 6,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Statistic, {
            title: "This Week",
            value: 28,
            prefix: /*#__PURE__*/_jsx(ClockCircleOutlined, {}),
            valueStyle: {
              color: '#faad14'
            }
          })
        })
      }), /*#__PURE__*/_jsx(Col, {
        span: 6,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Statistic, {
            title: "High Merit",
            value: 312,
            prefix: /*#__PURE__*/_jsx(FireOutlined, {}),
            valueStyle: {
              color: '#f5222d'
            }
          })
        })
      })]
    }), /*#__PURE__*/_jsx("h2", {
      className: "text-xl font-semibold mb-4",
      children: "Recent Failure Documentation"
    }), isLoading ? /*#__PURE__*/_jsx(Row, {
      gutter: [16, 16],
      children: [1, 2, 3].map(i => /*#__PURE__*/_jsx(Col, {
        span: 8,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            paragraph: {
              rows: 6
            }
          })
        })
      }, i))
    }) : /*#__PURE__*/_jsx(Row, {
      gutter: [16, 16],
      children: failures.slice(0, 3).map(failure => /*#__PURE__*/_jsx(Col, {
        span: 8,
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          hoverable: true,
          className: "h-full cursor-pointer",
          onClick: () => navigateToTab(`/failures/${failure.id}`, failure.title),
          footer: /*#__PURE__*/_jsxs("div", {
            className: "flex items-center justify-between",
            children: [/*#__PURE__*/_jsx(FailSquareButton, {
              type: "link",
              size: "small",
              children: "View Details"
            }), /*#__PURE__*/_jsx(MeritIndicator, {
              score: failure.meritScore,
              variant: "numeric",
              size: "small"
            })]
          }),
          children: /*#__PURE__*/_jsxs("div", {
            className: "space-y-3",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-start justify-between",
              children: [/*#__PURE__*/_jsx("h3", {
                className: "text-lg font-medium flex-1 mr-2",
                children: failure.title
              }), failure.isResurrected && /*#__PURE__*/_jsx(FailSquareTag, {
                category: "success",
                className: "ml-2",
                children: "Resurrected"
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "space-y-2 text-sm",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "text-gray-600",
                children: [/*#__PURE__*/_jsx("strong", {
                  children: "Domain:"
                }), " ", failure.domain]
              }), /*#__PURE__*/_jsxs("div", {
                className: "text-gray-600",
                children: [/*#__PURE__*/_jsx("strong", {
                  children: "Author:"
                }), " ", failure.authorUsername]
              }), /*#__PURE__*/_jsxs("div", {
                className: "text-gray-600",
                children: [/*#__PURE__*/_jsx("strong", {
                  children: "Failure Mode:"
                }), " ", failure.primaryFailureMode]
              }), /*#__PURE__*/_jsxs("div", {
                className: "text-gray-600",
                children: [/*#__PURE__*/_jsx("strong", {
                  children: "Exploration:"
                }), " ", failure.explorationDurationDays, " days"]
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "flex flex-wrap gap-1 mt-3",
              children: failure.tags.map(tag => /*#__PURE__*/_jsx(FailSquareTag, {
                category: "technology",
                size: "small",
                children: tag
              }, tag))
            })]
          })
        })
      }, failure.id))
    })]
  });
};
export default DashboardPage;