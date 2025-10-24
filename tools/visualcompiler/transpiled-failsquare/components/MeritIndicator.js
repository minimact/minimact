import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { StarFilled, HeartFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const MeritIndicator = ({
  score,
  maxStars = 5,
  variant = 'stars',
  size = 'default',
  showTooltip = true,
  showNumeric = true,
  details,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Convert 0-1 score to 0-5 scale for display
  const displayScore = score * maxStars;
  const percentage = (score * 100).toFixed(0);
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return '12px';
      case 'large':
        return '20px';
      default:
        return '16px';
    }
  };
  const renderIcon = index => {
    const Icon = variant === 'hearts' ? HeartFilled : StarFilled;
    const filled = index < Math.floor(displayScore);
    const partial = index === Math.floor(displayScore) && displayScore % 1 > 0;
    const baseStyle = {
      fontSize: getIconSize(),
      marginRight: '2px'
    };
    if (filled) {
      return /*#__PURE__*/_jsx(Icon, {
        style: {
          ...baseStyle,
          color: variant === 'hearts' ? '#ff4d4f' : '#faad14'
        }
      }, index);
    }
    if (partial) {
      const fillPercentage = displayScore % 1 * 100;
      return /*#__PURE__*/_jsxs("span", {
        style: {
          position: 'relative',
          display: 'inline-block'
        },
        children: [/*#__PURE__*/_jsx(Icon, {
          style: {
            ...baseStyle,
            color: '#d9d9d9'
          }
        }), /*#__PURE__*/_jsx(Icon, {
          style: {
            ...baseStyle,
            position: 'absolute',
            left: 0,
            top: 0,
            color: variant === 'hearts' ? '#ff4d4f' : '#faad14',
            clipPath: `polygon(0 0, ${fillPercentage}% 0, ${fillPercentage}% 100%, 0 100%)`
          }
        })]
      }, index);
    }
    return /*#__PURE__*/_jsx(Icon, {
      style: {
        ...baseStyle,
        color: '#d9d9d9'
      }
    }, index);
  };
  const renderDetails = () => {
    if (!details) return null;
    return /*#__PURE__*/_jsxs("div", {
      className: "mt-2 p-2 bg-gray-50 rounded border text-xs",
      children: [/*#__PURE__*/_jsx("div", {
        className: "font-semibold mb-1",
        children: "Merit Breakdown:"
      }), Object.entries(details).map(([key, value]) => /*#__PURE__*/_jsxs("div", {
        className: "flex justify-between",
        children: [/*#__PURE__*/_jsxs("span", {
          className: "capitalize",
          children: [key, ":"]
        }), /*#__PURE__*/_jsxs("span", {
          children: [(value * 100).toFixed(0), "%"]
        })]
      }, key))]
    });
  };
  const indicator = /*#__PURE__*/_jsxs("div", {
    className: `inline-flex items-center gap-2 ${getSizeClass()} ${className || ''}`,
    onMouseEnter: () => setShowDetails(true),
    onMouseLeave: () => setShowDetails(false),
    children: [/*#__PURE__*/_jsx("div", {
      className: "flex items-center",
      children: Array.from({
        length: maxStars
      }, (_, index) => renderIcon(index))
    }), showNumeric && /*#__PURE__*/_jsxs("span", {
      className: "text-gray-600 font-medium",
      children: [score.toFixed(2), " (", percentage, "%)"]
    }), details && showDetails && /*#__PURE__*/_jsx("div", {
      className: "absolute z-10 mt-8 left-0",
      children: renderDetails()
    })]
  });
  if (showTooltip) {
    const tooltipTitle = details ? /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsxs("div", {
        children: ["Merit Score: ", percentage, "%"]
      }), Object.entries(details).map(([key, value]) => /*#__PURE__*/_jsxs("div", {
        children: [key, ": ", (value * 100).toFixed(0), "%"]
      }, key))]
    }) : `Merit Score: ${percentage}%`;
    return /*#__PURE__*/_jsx(Tooltip, {
      title: tooltipTitle,
      placement: "top",
      children: indicator
    });
  }
  return /*#__PURE__*/_jsx("div", {
    className: "relative",
    children: indicator
  });
};
export default MeritIndicator;