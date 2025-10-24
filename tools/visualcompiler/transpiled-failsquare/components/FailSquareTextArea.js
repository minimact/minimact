import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const FailSquareTextArea = ({
  value: controlledValue,
  onValueChange,
  placeholder = '',
  rows = 3,
  autoGrow = false,
  maxLength = 0,
  showCounter = false,
  className,
  disabled = false,
  ...additionalAttributes
}) => {
  const [internalValue, setInternalValue] = useState('');
  const textareaRef = useRef(null);

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const currentLength = value?.length ?? 0;
  const isOverLimit = maxLength > 0 && currentLength > maxLength;
  useEffect(() => {
    if (autoGrow && textareaRef.current) {
      adjustTextAreaHeight();
    }
  }, [value, autoGrow]);
  const adjustTextAreaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
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
  const handleKeyUp = () => {
    if (autoGrow) {
      adjustTextAreaHeight();
    }
  };
  const getTextAreaClasses = () => {
    const classes = ['failsquare-textarea', 'w-full', 'p-3', 'border', 'border-gray-300', 'rounded-lg', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent', 'resize-none'];
    if (autoGrow) {
      classes.push('auto-grow');
    }
    if (isOverLimit) {
      classes.push('over-limit', 'border-red-500', 'focus:ring-red-500');
    }
    if (disabled) {
      classes.push('opacity-50', 'cursor-not-allowed');
    }
    return classes.join(' ');
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-textarea-wrapper relative ${className || ''}`,
    children: [showCounter && /*#__PURE__*/_jsxs("div", {
      className: `
            failsquare-textarea-counter absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white border z-10
            ${isOverLimit ? 'over-limit text-red-600 border-red-300' : 'text-gray-600 border-gray-200'}
          `,
      children: [currentLength, maxLength > 0 && ` / ${maxLength}`]
    }), /*#__PURE__*/_jsx("textarea", {
      ref: textareaRef,
      className: getTextAreaClasses(),
      placeholder: placeholder,
      rows: autoGrow ? undefined : rows,
      maxLength: maxLength > 0 ? maxLength : undefined,
      value: value,
      onChange: handleChange,
      onKeyUp: handleKeyUp,
      disabled: disabled,
      style: {
        minHeight: autoGrow ? `${rows * 1.5}rem` : undefined
      },
      ...additionalAttributes
    })]
  });
};
export default FailSquareTextArea;