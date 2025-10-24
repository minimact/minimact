import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareSearchInput = ({
  value: controlledValue,
  onValueChange,
  onSearch,
  placeholder = 'Search...',
  className
}) => {
  const [internalValue, setInternalValue] = useState('');

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
  const handleKeyUp = e => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };
  const clear = () => {
    const newValue = '';
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
    className: `failsquare-search-input relative ${className || ''}`,
    children: /*#__PURE__*/_jsxs("div", {
      className: "relative",
      children: [/*#__PURE__*/_jsx(SearchOutlined, {
        className: "failsquare-search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      }), /*#__PURE__*/_jsx("input", {
        type: "text",
        className: "failsquare-search-field w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        placeholder: placeholder,
        value: value,
        onChange: handleInput,
        onKeyUp: handleKeyUp
      }), value && /*#__PURE__*/_jsx("button", {
        className: "failsquare-search-clear absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors",
        onClick: clear,
        type: "button",
        children: /*#__PURE__*/_jsx(CloseOutlined, {})
      })]
    })
  });
};
export default FailSquareSearchInput;