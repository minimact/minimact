import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button, Select } from 'antd';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Option
} = Select;
const FailSquareActiveFilters = ({
  activeFilters = [],
  onRemoveFilter,
  onAdvancedFilters,
  sortOption: controlledSortOption,
  onSortOptionChange,
  className
}) => {
  const [internalSortOption, setInternalSortOption] = useState('merit');

  // Use controlled value if provided, otherwise use internal state
  const sortOption = controlledSortOption !== undefined ? controlledSortOption : internalSortOption;
  const removeFilter = filter => {
    onRemoveFilter?.(filter);
  };
  const handleSortChange = value => {
    if (controlledSortOption !== undefined) {
      // Controlled mode
      onSortOptionChange?.(value);
    } else {
      // Uncontrolled mode
      setInternalSortOption(value);
      onSortOptionChange?.(value);
    }
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `failsquare-active-filters ${className || ''}`,
    children: [activeFilters.length > 0 && /*#__PURE__*/_jsx("div", {
      className: "failsquare-filter-chips flex flex-wrap gap-2 mb-4",
      children: activeFilters.map(filter => /*#__PURE__*/_jsxs("button", {
        className: "failsquare-filter-chip flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors border-none cursor-pointer",
        onClick: () => removeFilter(filter),
        children: [/*#__PURE__*/_jsx("span", {
          children: filter.label
        }), /*#__PURE__*/_jsx(CloseOutlined, {
          className: "w-3 h-3"
        })]
      }, `${filter.id}-${filter.type}`))
    }), /*#__PURE__*/_jsxs("div", {
      className: "failsquare-filter-controls flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "failsquare-sort-control flex items-center gap-2",
        children: [/*#__PURE__*/_jsx("span", {
          className: "text-gray-600 text-sm",
          children: "Sort by:"
        }), /*#__PURE__*/_jsxs(Select, {
          value: sortOption,
          onChange: handleSortChange,
          className: "w-32",
          size: "small",
          children: [/*#__PURE__*/_jsx(Option, {
            value: "merit",
            children: "Merit Score"
          }), /*#__PURE__*/_jsx(Option, {
            value: "recent",
            children: "Most Recent"
          }), /*#__PURE__*/_jsx(Option, {
            value: "forks",
            children: "Most Forks"
          })]
        })]
      }), /*#__PURE__*/_jsx(Button, {
        type: "default",
        icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
        onClick: onAdvancedFilters,
        size: "small",
        children: "Advanced Filters"
      })]
    })]
  });
};
export default FailSquareActiveFilters;