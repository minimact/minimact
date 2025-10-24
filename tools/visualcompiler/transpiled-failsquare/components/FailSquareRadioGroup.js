import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareRadioGroup = ({
  name,
  value: controlledValue,
  onValueChange,
  options,
  className,
  disabled = false
}) => {
  const [internalValue, setInternalValue] = useState('');

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleChange = newValue => {
    if (controlledValue !== undefined) {
      // Controlled mode
      onValueChange?.(newValue);
    } else {
      // Uncontrolled mode
      setInternalValue(newValue);
      onValueChange?.(newValue);
    }
  };
  return /*#__PURE__*/_jsx("div", {
    className: `failsquare-radio-group space-y-3 ${className || ''}`,
    children: options.map((option, index) => /*#__PURE__*/_jsxs("label", {
      className: `failsquare-radio flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      children: [/*#__PURE__*/_jsx("input", {
        type: "radio",
        name: name,
        value: option.value,
        checked: value === option.value,
        onChange: () => handleChange(option.value),
        disabled: disabled,
        className: "sr-only"
      }), /*#__PURE__*/_jsx("span", {
        className: `
              failsquare-radio-mark relative w-5 h-5 border-2 rounded-full transition-all
              ${value === option.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:border-gray-400'}
              ${disabled ? 'opacity-50' : ''}
            `,
        children: value === option.value && /*#__PURE__*/_jsx("span", {
          className: "absolute inset-1 bg-white rounded-full"
        })
      }), /*#__PURE__*/_jsx("span", {
        className: `failsquare-radio-label select-none ${disabled ? 'opacity-50' : ''}`,
        children: option.label
      })]
    }, `${option.value}-${index}`))
  });
};
export default FailSquareRadioGroup;