import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Input, Tag, Button, Select } from 'antd';
import { SearchOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Option
} = Select;
const SearchBar = ({
  placeholder = 'Search ideas, discussions, and forks...',
  showFilters = true,
  activeFilters = [],
  onSearch,
  onFilterRemove,
  onAdvancedFilter,
  onSortChange,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('merit');
  useEffect(() => {
    onSortChange?.(sortOption);
  }, [sortOption, onSortChange]);
  const handleSearch = () => {
    onSearch?.(searchTerm);
  };
  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  const handleClear = () => {
    setSearchTerm('');
  };
  const handleFilterRemove = filter => {
    onFilterRemove?.(filter);
  };
  const handleSortChange = value => {
    setSortOption(value);
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `bg-white border border-gray-200 rounded-lg p-4 ${className || ''}`,
    children: [/*#__PURE__*/_jsx("div", {
      className: "relative",
      children: /*#__PURE__*/_jsx(Input, {
        size: "large",
        placeholder: placeholder,
        value: searchTerm,
        onChange: e => setSearchTerm(e.target.value),
        onKeyDown: handleKeyDown,
        prefix: /*#__PURE__*/_jsx(SearchOutlined, {
          className: "text-gray-400"
        }),
        suffix: searchTerm && /*#__PURE__*/_jsx(Button, {
          type: "text",
          size: "small",
          icon: /*#__PURE__*/_jsx(CloseOutlined, {}),
          onClick: handleClear,
          className: "hover:bg-gray-100"
        }),
        className: "w-full"
      })
    }), showFilters && /*#__PURE__*/_jsxs("div", {
      className: "mt-4 space-y-3",
      children: [activeFilters.length > 0 && /*#__PURE__*/_jsx("div", {
        className: "flex flex-wrap gap-2",
        children: activeFilters.map((filter, index) => /*#__PURE__*/_jsx(Tag, {
          closable: true,
          onClose: () => handleFilterRemove(filter),
          className: "flex items-center gap-1",
          children: filter
        }, index))
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        children: [/*#__PURE__*/_jsx(Button, {
          type: "default",
          icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
          onClick: onAdvancedFilter,
          className: "w-fit",
          children: "Advanced Filters"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-2",
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
        })]
      })]
    })]
  });
};
export default SearchBar;