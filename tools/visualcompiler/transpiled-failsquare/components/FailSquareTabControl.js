import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Individual Tab component
export const FailSquareTab = ({
  children
}) => {
  // This component's content is rendered by the TabControl
  return /*#__PURE__*/_jsx(_Fragment, {
    children: children
  });
};

// Main TabControl component
const FailSquareTabControl = ({
  children,
  className,
  onTabChange,
  defaultActiveIndex = 0
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

  // Extract tab information from children
  const tabs = [];
  const tabChildren = [];
  Children.forEach(children, child => {
    if (isValidElement(child) && child.type === FailSquareTab) {
      const {
        title,
        icon,
        children: tabContent
      } = child.props;
      tabs.push({
        title,
        icon,
        content: tabContent
      });
      tabChildren.push(tabContent);
    }
  });
  const setActive = useCallback(async index => {
    if (activeIndex !== index) {
      setActiveIndex(index);
      onTabChange?.(index);
    }
  }, [activeIndex, onTabChange]);
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-tabs ${className || ''}`,
    children: [/*#__PURE__*/_jsx("div", {
      className: "failsquare-tabs-list flex border-b border-gray-200",
      role: "tablist",
      children: tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return /*#__PURE__*/_jsxs("button", {
          onClick: () => setActive(index),
          className: `
                failsquare-tab-button flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors
                ${isActive ? 'active text-blue-600 border-blue-600' : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'}
              `,
          role: "tab",
          "aria-selected": isActive,
          "aria-controls": `tab-panel-${index}`,
          children: [tab.icon && /*#__PURE__*/_jsx("div", {
            className: "failsquare-tab-icon",
            children: tab.icon
          }), /*#__PURE__*/_jsx("span", {
            className: "failsquare-tab-text",
            children: tab.title
          })]
        }, index);
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "failsquare-tab-panels",
      children: activeIndex < tabs.length && /*#__PURE__*/_jsx("div", {
        id: `tab-panel-${activeIndex}`,
        className: "failsquare-tab-panel active py-4",
        role: "tabpanel",
        children: tabs[activeIndex].content
      })
    })]
  });
};
export default FailSquareTabControl;