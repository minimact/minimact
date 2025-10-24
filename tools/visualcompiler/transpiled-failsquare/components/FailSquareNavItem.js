import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Badge } from 'antd';
import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareNavItem = ({
  item,
  isCollapsed = false,
  onClick,
  className
}) => {
  const getNavItemClasses = () => {
    const classes = ['failsquare-nav-item', 'w-full', 'flex', 'items-center', 'gap-3', 'px-4', 'py-3', 'text-left', 'border-none', 'bg-transparent', 'cursor-pointer', 'transition-colors', 'hover:bg-gray-100'];
    if (item.isActive) {
      classes.push('failsquare-nav-item-active', 'bg-blue-50', 'text-blue-600', 'border-r-2', 'border-blue-600');
    } else {
      classes.push('text-gray-700');
    }
    return classes.join(' ');
  };
  return /*#__PURE__*/_jsxs("button", {
    className: `${getNavItemClasses()} ${className || ''}`,
    onClick: onClick,
    children: [/*#__PURE__*/_jsx("div", {
      className: "flex-shrink-0 w-5 h-5 flex items-center justify-center",
      children: item.notificationCount && item.notificationCount > 0 ? /*#__PURE__*/_jsx(Badge, {
        count: item.notificationCount,
        size: "small",
        children: item.icon
      }) : item.icon
    }), !isCollapsed && /*#__PURE__*/_jsxs("div", {
      className: "failsquare-nav-item-content flex-1 flex items-center justify-between",
      children: [/*#__PURE__*/_jsx("span", {
        className: "font-medium",
        children: item.label
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-2",
        children: [item.merit !== undefined && /*#__PURE__*/_jsx(MeritIndicator, {
          score: item.merit / 5 // Convert 0-5 scale to 0-1 scale
          ,
          variant: "stars",
          size: "small",
          showNumeric: false,
          showTooltip: true,
          maxStars: 5
        }), item.notificationCount && item.notificationCount > 0 && /*#__PURE__*/_jsx("div", {
          className: "failsquare-notification-badge bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center",
          children: item.notificationCount
        })]
      })]
    })]
  });
};
export default FailSquareNavItem;