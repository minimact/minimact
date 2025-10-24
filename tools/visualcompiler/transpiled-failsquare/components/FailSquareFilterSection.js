import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { DownOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareFilterSection = ({
  title,
  icon,
  defaultOpen = false,
  children,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-filter-section ${className || ''}`,
    children: [/*#__PURE__*/_jsxs("button", {
      className: "failsquare-section-header w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors border-none cursor-pointer rounded-t-lg",
      onClick: toggleOpen,
      children: [/*#__PURE__*/_jsxs("div", {
        className: "failsquare-section-title flex items-center gap-2",
        children: [icon && /*#__PURE__*/_jsx("span", {
          className: "text-gray-600",
          children: icon
        }), /*#__PURE__*/_jsx("span", {
          className: "font-medium text-gray-900",
          children: title
        })]
      }), /*#__PURE__*/_jsx(DownOutlined, {
        className: `text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`
      })]
    }), isOpen && /*#__PURE__*/_jsx("div", {
      className: "failsquare-section-content p-4 border border-t-0 border-gray-200 rounded-b-lg bg-white",
      children: children
    })]
  });
};
export default FailSquareFilterSection;