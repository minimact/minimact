import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareCheckbox = ({
  checked: controlledChecked,
  onCheckedChange,
  children,
  className,
  disabled = false,
  ...additionalAttributes
}) => {
  const [internalChecked, setInternalChecked] = useState(false);

  // Use controlled value if provided, otherwise use internal state
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;
  const handleChange = e => {
    const newChecked = e.target.checked;
    if (controlledChecked !== undefined) {
      // Controlled mode
      onCheckedChange?.(newChecked);
    } else {
      // Uncontrolled mode
      setInternalChecked(newChecked);
      onCheckedChange?.(newChecked);
    }
  };
  return /*#__PURE__*/_jsxs("label", {
    className: `failsquare-checkbox flex items-center gap-3 cursor-pointer ${className || ''}`,
    children: [/*#__PURE__*/_jsx("input", {
      type: "checkbox",
      checked: checked,
      onChange: handleChange,
      disabled: disabled,
      className: "sr-only",
      ...additionalAttributes
    }), /*#__PURE__*/_jsx("span", {
      className: `
        failsquare-checkbox-mark relative w-5 h-5 border-2 rounded transition-all
        ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `,
      children: checked && /*#__PURE__*/_jsx("svg", {
        className: "absolute inset-0 w-full h-full text-white p-0.5",
        viewBox: "0 0 16 16",
        fill: "currentColor",
        children: /*#__PURE__*/_jsx("path", {
          d: "M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
        })
      })
    }), children && /*#__PURE__*/_jsx("span", {
      className: `failsquare-checkbox-label select-none ${disabled ? 'opacity-50' : ''}`,
      children: children
    })]
  });
};
export default FailSquareCheckbox;