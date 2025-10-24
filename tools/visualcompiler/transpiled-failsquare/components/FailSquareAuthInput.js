import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareAuthInput = ({
  type = 'text',
  placeholder = '',
  value: controlledValue,
  icon,
  onValueChange,
  onBlur,
  className
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleInput = e => {
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
  const handleBlur = e => {
    onBlur?.(e);
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const inputType = type === 'password' && showPassword ? 'text' : type;
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-input-container relative ${className || ''}`,
    children: [icon && /*#__PURE__*/_jsx("div", {
      className: "failsquare-input-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400",
      children: icon
    }), /*#__PURE__*/_jsx("input", {
      type: inputType,
      className: `
          failsquare-input w-full py-3 rounded-lg border border-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${icon ? 'pl-10' : 'pl-4'}
          ${type === 'password' ? 'pr-12' : 'pr-4'}
        `,
      placeholder: placeholder,
      value: value,
      onChange: handleInput,
      onBlur: handleBlur
    }), type === 'password' && /*#__PURE__*/_jsx("button", {
      type: "button",
      className: "failsquare-input-action absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors",
      onClick: togglePasswordVisibility,
      children: showPassword ? /*#__PURE__*/_jsx(EyeInvisibleOutlined, {}) : /*#__PURE__*/_jsx(EyeOutlined, {})
    })]
  });
};
export default FailSquareAuthInput;