import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareFormField = ({
  id,
  label,
  helperText,
  required = false,
  hasError = false,
  errorMessage,
  children,
  className
}) => {
  const getFieldClasses = () => {
    const classes = ['failsquare-form-field'];
    if (hasError) {
      classes.push('has-error');
    }
    return classes.join(' ');
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `${getFieldClasses()} ${className || ''}`,
    children: [label && /*#__PURE__*/_jsxs("label", {
      className: "failsquare-form-label block text-sm font-medium text-gray-700 mb-1",
      htmlFor: id,
      children: [label, required && /*#__PURE__*/_jsx("span", {
        className: "failsquare-required text-red-500 ml-1",
        children: "*"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "failsquare-form-control",
      children: [children, helperText && /*#__PURE__*/_jsx("div", {
        className: "failsquare-helper-text text-sm text-gray-500 mt-1",
        children: helperText
      }), hasError && errorMessage && /*#__PURE__*/_jsxs("div", {
        className: "failsquare-error-message flex items-center gap-1 text-sm text-red-600 mt-1",
        children: [/*#__PURE__*/_jsx(ExclamationCircleOutlined, {}), errorMessage]
      })]
    })]
  });
};
export default FailSquareFormField;