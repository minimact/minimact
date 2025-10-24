import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Tag, Space, Typography, Button, Tooltip } from 'antd';
import { EyeOutlined, HeartOutlined, MessageOutlined, ExperimentOutlined, ClockCircleOutlined, UserOutlined, ArrowRightOutlined, WarningOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Title,
  Text,
  Paragraph
} = Typography;
const FailureCard = ({
  title,
  approach,
  failureMode,
  domain,
  author,
  createdAt,
  explorationDuration,
  meritScore,
  engagement,
  technologies,
  isResurrected = false,
  revivalYear,
  onView,
  onLike,
  onComment,
  className
}) => {
  const getMeritScoreColor = score => {
    if (score >= 0.9) return 'gold';
    if (score >= 0.79) return 'green';
    if (score >= 0.59) return 'blue';
    if (score >= 0.29) return 'orange';
    return 'red';
  };
  const getMeritScoreLabel = score => {
    if (score >= 0.9) return 'Exceptional';
    if (score >= 0.79) return 'High Value';
    if (score >= 0.59) return 'Solid';
    if (score >= 0.29) return 'Basic Merit';
    return 'Low Signal';
  };
  return /*#__PURE__*/_jsx(Card, {
    className: `failure-card hover:shadow-lg transition-shadow duration-200 ${className || ''}`,
    hoverable: true,
    onClick: onView,
    actions: [/*#__PURE__*/_jsx(Button, {
      type: "text",
      icon: /*#__PURE__*/_jsx(EyeOutlined, {}),
      onClick: e => {
        e.stopPropagation();
        onView?.();
      },
      children: engagement.views
    }), /*#__PURE__*/_jsx(Button, {
      type: "text",
      icon: /*#__PURE__*/_jsx(HeartOutlined, {}),
      onClick: e => {
        e.stopPropagation();
        onLike?.();
      },
      children: engagement.likes
    }), /*#__PURE__*/_jsx(Button, {
      type: "text",
      icon: /*#__PURE__*/_jsx(MessageOutlined, {}),
      onClick: e => {
        e.stopPropagation();
        onComment?.();
      },
      children: engagement.comments
    }), /*#__PURE__*/_jsx(Button, {
      type: "primary",
      size: "small",
      icon: /*#__PURE__*/_jsx(ArrowRightOutlined, {}),
      onClick: e => {
        e.stopPropagation();
        onView?.();
      },
      children: "View Details"
    })],
    children: /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsx("div", {
        className: "flex justify-between items-start",
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex-1",
          children: [/*#__PURE__*/_jsx(Title, {
            level: 4,
            className: "mb-2 text-gray-900",
            children: title
          }), /*#__PURE__*/_jsxs(Space, {
            wrap: true,
            children: [/*#__PURE__*/_jsx(Tag, {
              color: "blue",
              children: domain
            }), /*#__PURE__*/_jsxs(Tag, {
              color: getMeritScoreColor(meritScore),
              children: [getMeritScoreLabel(meritScore), " (", (meritScore * 100).toFixed(0), "%)"]
            }), isResurrected && /*#__PURE__*/_jsx(Tooltip, {
              title: `Successfully resurrected ${revivalYear ? `in ${revivalYear}` : 'recently'}`,
              children: /*#__PURE__*/_jsx(Tag, {
                color: "green",
                icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
                children: "Resurrected"
              })
            })]
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(Text, {
          strong: true,
          className: "text-gray-700",
          children: "Approach:"
        }), /*#__PURE__*/_jsx(Paragraph, {
          className: "mt-1 text-gray-600",
          ellipsis: {
            rows: 2
          },
          children: approach
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-red-50 border border-red-200 rounded-lg p-3",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-2",
          children: [/*#__PURE__*/_jsx(WarningOutlined, {
            className: "text-red-500"
          }), /*#__PURE__*/_jsx(Text, {
            strong: true,
            className: "text-red-700",
            children: "Primary Failure Mode:"
          })]
        }), /*#__PURE__*/_jsx(Text, {
          className: "text-red-600 text-sm",
          children: failureMode
        })]
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(Text, {
          strong: true,
          className: "text-gray-700",
          children: "Technologies:"
        }), /*#__PURE__*/_jsx("div", {
          className: "mt-2",
          children: /*#__PURE__*/_jsxs(Space, {
            wrap: true,
            children: [technologies.slice(0, 4).map(tech => /*#__PURE__*/_jsx(Tag, {
              className: "text-xs",
              children: tech
            }, tech)), technologies.length > 4 && /*#__PURE__*/_jsxs(Tag, {
              className: "text-xs",
              children: ["+", technologies.length - 4, " more"]
            })]
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-100",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-4",
          children: [/*#__PURE__*/_jsxs(Space, {
            children: [/*#__PURE__*/_jsx(UserOutlined, {}), /*#__PURE__*/_jsx(Text, {
              className: "text-sm",
              children: author.name
            })]
          }), explorationDuration && /*#__PURE__*/_jsxs(Space, {
            children: [/*#__PURE__*/_jsx(ClockCircleOutlined, {}), /*#__PURE__*/_jsxs(Text, {
              className: "text-sm",
              children: [explorationDuration, "d exploration"]
            })]
          })]
        }), /*#__PURE__*/_jsx(Text, {
          className: "text-sm",
          children: formatDistanceToNow(createdAt, {
            addSuffix: true
          })
        })]
      })]
    })
  });
};
export default FailureCard;