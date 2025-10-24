import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareCard = ({
  children,
  headerContent,
  footerContent,
  interactive = false,
  fullWidth = false,
  onClick,
  className
}) => {
  const getCardClasses = () => {
    const classes = ['failsquare-card', 'bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow-sm'];
    if (interactive) {
      classes.push('failsquare-card-interactive', 'hover:shadow-md', 'transition-shadow', 'cursor-pointer', 'hover:border-gray-300');
    }
    return classes.join(' ');
  };
  const getContentClasses = () => {
    const classes = ['failsquare-card-content'];
    if (fullWidth) {
      classes.push('display-block-override', 'w-full');
    }
    return classes.join(' ');
  };
  const cardElement = /*#__PURE__*/_jsx("div", {
    className: `${getCardClasses()} ${className || ''}`,
    onClick: onClick,
    children: /*#__PURE__*/_jsx("div", {
      className: "failsquare-card-body p-6",
      children: /*#__PURE__*/_jsx("div", {
        className: getContentClasses(),
        children: /*#__PURE__*/_jsxs("div", {
          children: [headerContent && /*#__PURE__*/_jsx("div", {
            className: "failsquare-card-header mb-4",
            children: headerContent
          }), children, footerContent && /*#__PURE__*/_jsx("div", {
            className: "failsquare-card-footer mt-4",
            children: footerContent
          })]
        })
      })
    })
  });
  return cardElement;
};
export default FailSquareCard;