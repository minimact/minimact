import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { ClockCircleOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquarePlaceholder = ({
  icon,
  title = 'Feature Coming Soon',
  description = 'This feature is currently under development.',
  className
}) => {
  const defaultIcon = /*#__PURE__*/_jsx(ClockCircleOutlined, {
    className: "w-12 h-12 text-gray-400"
  });
  return /*#__PURE__*/_jsx("div", {
    className: `failsquare-placeholder ${className || ''}`,
    children: /*#__PURE__*/_jsxs("div", {
      className: "failsquare-placeholder-content flex flex-col items-center justify-center text-center p-8",
      children: [/*#__PURE__*/_jsx("div", {
        className: "failsquare-placeholder-icon mb-4",
        children: icon || defaultIcon
      }), /*#__PURE__*/_jsxs("div", {
        className: "failsquare-placeholder-text",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "failsquare-placeholder-title text-lg font-semibold text-gray-900 mb-2",
          children: title
        }), /*#__PURE__*/_jsx("p", {
          className: "failsquare-placeholder-description text-gray-600 max-w-md",
          children: description
        })]
      })]
    })
  });
};
export default FailSquarePlaceholder;