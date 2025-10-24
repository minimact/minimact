import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareTag = ({
  children,
  iconName,
  interactive = false,
  onClick,
  className
}) => {
  const getTagClasses = () => {
    const classes = ['failsquare-tag', 'inline-flex', 'items-center', 'gap-1', 'px-2', 'py-1', 'text-xs', 'font-medium', 'bg-gray-100', 'text-gray-800', 'rounded'];
    if (interactive) {
      classes.push('failsquare-tag-interactive', 'hover:bg-gray-200', 'cursor-pointer', 'transition-colors', 'hover:text-gray-900');
    }
    return classes.join(' ');
  };
  const handleClick = event => {
    if (interactive && onClick) {
      onClick(event);
    }
  };
  return /*#__PURE__*/_jsxs("span", {
    className: `${getTagClasses()} ${className || ''}`,
    onClick: handleClick,
    children: [iconName && /*#__PURE__*/_jsx("span", {
      className: "failsquare-tag-icon",
      children: iconName
    }), children]
  });
};
export default FailSquareTag;