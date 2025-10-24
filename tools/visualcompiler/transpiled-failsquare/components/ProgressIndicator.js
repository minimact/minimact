import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Progress, Typography } from 'antd';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Text
} = Typography;
const ProgressIndicator = ({
  current,
  total,
  title = 'Progress',
  showPercentage = true,
  showStepCount = true,
  size = 'default',
  strokeColor,
  className,
  type = 'circle',
  width = 120
}) => {
  const percentage = Math.round(current / total * 100);
  const getStrokeColor = () => {
    if (strokeColor) return strokeColor;
    if (percentage >= 90) return '#52c41a'; // green
    if (percentage >= 75) return '#73d13d'; // light green
    if (percentage >= 50) return '#1890ff'; // blue
    if (percentage >= 25) return '#faad14'; // yellow
    return '#f5222d'; // red
  };
  const getProgressSize = () => {
    switch (size) {
      case 'small':
        return 80;
      case 'large':
        return 160;
      default:
        return width;
    }
  };
  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 'text-lg';
      case 'large':
        return 'text-6xl';
      default:
        return 'text-4xl';
    }
  };
  if (type === 'line') {
    return /*#__PURE__*/_jsx(Card, {
      title: title,
      className: className,
      size: size === 'small' ? 'small' : 'default',
      children: /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex justify-between text-sm",
          children: [/*#__PURE__*/_jsx(Text, {
            children: "Progress"
          }), /*#__PURE__*/_jsxs(Text, {
            strong: true,
            children: [showPercentage && `${percentage}%`, showPercentage && showStepCount && ' • ', showStepCount && `${current}/${total}`]
          })]
        }), /*#__PURE__*/_jsx(Progress, {
          percent: percentage,
          strokeColor: getStrokeColor(),
          size: size === 'small' ? 'small' : 'default',
          showInfo: false
        })]
      })
    });
  }
  return /*#__PURE__*/_jsx(Card, {
    title: title,
    className: className,
    size: size === 'small' ? 'small' : 'default',
    children: /*#__PURE__*/_jsx("div", {
      className: "text-center",
      children: /*#__PURE__*/_jsx(Progress, {
        type: "circle",
        percent: percentage,
        strokeColor: getStrokeColor(),
        width: getProgressSize(),
        format: () => /*#__PURE__*/_jsxs("div", {
          className: "flex flex-col items-center",
          children: [showPercentage && /*#__PURE__*/_jsxs("div", {
            className: `font-bold text-blue-500 ${getFontSize()}`,
            children: [percentage, "%"]
          }), showStepCount && /*#__PURE__*/_jsxs("div", {
            className: `text-gray-500 mt-1 ${size === 'small' ? 'text-xs' : 'text-sm'}`,
            children: [current, " of ", total]
          })]
        })
      })
    })
  });
};
export default ProgressIndicator;