import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { DownOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareExpandableSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
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
    className: `failsquare-expandable-section ${className || ''}`,
    children: [/*#__PURE__*/_jsxs("button", {
      className: "failsquare-expandable-header w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-none cursor-pointer",
      onClick: toggleOpen,
      children: [/*#__PURE__*/_jsxs("div", {
        className: "failsquare-expandable-title flex items-center gap-3",
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
      className: "failsquare-expandable-content p-4 border-t border-gray-200",
      children: children
    })]
  });
};
export default FailSquareExpandableSection;