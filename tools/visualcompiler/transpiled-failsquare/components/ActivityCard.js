import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button, Typography } from 'antd';
import { ClockCircleOutlined, BranchesOutlined, MessageOutlined } from '@ant-design/icons';
import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Text,
  Title
} = Typography;
const ActivityCard = ({
  title,
  type,
  merit,
  timestamp,
  content,
  forks,
  replies,
  className
}) => {
  return /*#__PURE__*/_jsxs("div", {
    className: `bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${className || ''}`,
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-start justify-between mb-3",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(Title, {
          level: 5,
          className: "mb-1",
          children: title
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3 text-sm text-gray-600",
          children: [/*#__PURE__*/_jsx("span", {
            className: "font-medium",
            children: type
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-1",
            children: [/*#__PURE__*/_jsx(ClockCircleOutlined, {}), /*#__PURE__*/_jsx("span", {
              children: timestamp
            })]
          })]
        })]
      }), /*#__PURE__*/_jsx(MeritIndicator, {
        score: merit / 5 // Convert 0-5 scale to 0-1 scale
        ,
        variant: "hearts",
        maxStars: 5,
        showNumeric: true,
        showTooltip: true
      })]
    }), content && /*#__PURE__*/_jsx("div", {
      className: "mb-4",
      children: /*#__PURE__*/_jsx(Text, {
        className: "text-gray-700",
        children: content
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex items-center gap-3",
      children: [/*#__PURE__*/_jsxs(Button, {
        type: "default",
        size: "small",
        icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
        className: "flex items-center gap-1",
        children: [forks, " Forks"]
      }), /*#__PURE__*/_jsxs(Button, {
        type: "default",
        size: "small",
        icon: /*#__PURE__*/_jsx(MessageOutlined, {}),
        className: "flex items-center gap-1",
        children: [replies, " Replies"]
      })]
    })]
  });
};
export default ActivityCard;