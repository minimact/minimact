import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { DownOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareSelect = ({
  value: controlledValue,
  onValueChange,
  placeholder = '',
  options,
  className,
  disabled = false,
  ...additionalAttributes
}) => {
  const [internalValue, setInternalValue] = useState('');

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleChange = e => {
    const newValue = e.target.value;
    if (controlledValue !== undefined) {
      // Controlled mode
      onValueChange?.(newValue);
    } else {
      // Uncontrolled mode
      setInternalValue(newValue);
      onValueChange?.(newValue);
    }
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-select-container relative ${className || ''}`,
    children: [/*#__PURE__*/_jsxs("select", {
      className: `
          failsquare-select w-full appearance-none py-3 pl-4 pr-10 rounded-lg border border-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `,
      value: value,
      onChange: handleChange,
      disabled: disabled,
      ...additionalAttributes,
      children: [placeholder && /*#__PURE__*/_jsx("option", {
        value: "",
        disabled: true,
        children: placeholder
      }), options.map((option, index) => /*#__PURE__*/_jsx("option", {
        value: option.value,
        children: option.label
      }, `${option.value}-${index}`))]
    }), /*#__PURE__*/_jsx("div", {
      className: "failsquare-select-arrow absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none",
      children: /*#__PURE__*/_jsx(DownOutlined, {
        className: "text-gray-400"
      })
    })]
  });
};
export default FailSquareSelect;