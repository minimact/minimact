import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Tabs, Button, Select } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import ActivityCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/ActivityCard.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Option
} = Select;
const ActivityFeed = ({
  tabs,
  activities,
  onTabChange,
  onFilter,
  onTimeRangeChange,
  onSortChange,
  className
}) => {
  const [activeTab, setActiveTab] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [sortBy, setSortBy] = useState('merit');
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0]);
      onTabChange?.(tabs[0]);
    }
  }, [tabs, activeTab, onTabChange]);
  const handleTabChange = tab => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const handleTimeRangeChange = value => {
    setTimeRange(value);
    onTimeRangeChange?.(value);
  };
  const handleSortChange = value => {
    setSortBy(value);
    onSortChange?.(value);
  };
  const tabItems = tabs.map(tab => ({
    key: tab,
    label: tab
  }));
  return /*#__PURE__*/_jsxs("div", {
    className: `bg-white border border-gray-200 rounded-lg ${className || ''}`,
    children: [/*#__PURE__*/_jsx("div", {
      className: "p-4 border-b border-gray-200",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
        children: [/*#__PURE__*/_jsx(Tabs, {
          activeKey: activeTab,
          onChange: handleTabChange,
          items: tabItems,
          className: "flex-1"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3 flex-wrap",
          children: [/*#__PURE__*/_jsx(Button, {
            type: "default",
            icon: /*#__PURE__*/_jsx(FilterOutlined, {}),
            size: "small",
            onClick: onFilter,
            children: "Filter"
          }), /*#__PURE__*/_jsxs(Select, {
            value: timeRange,
            onChange: handleTimeRangeChange,
            size: "small",
            className: "w-32",
            children: [/*#__PURE__*/_jsx(Option, {
              value: "all",
              children: "All Time"
            }), /*#__PURE__*/_jsx(Option, {
              value: "month",
              children: "This Month"
            }), /*#__PURE__*/_jsx(Option, {
              value: "week",
              children: "This Week"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2",
            children: [/*#__PURE__*/_jsx("span", {
              className: "text-gray-600 text-sm",
              children: "Sort by:"
            }), /*#__PURE__*/_jsxs(Select, {
              value: sortBy,
              onChange: handleSortChange,
              size: "small",
              className: "w-32",
              children: [/*#__PURE__*/_jsx(Option, {
                value: "merit",
                children: "Highest Merit"
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
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "p-4 space-y-4",
      children: activities.length > 0 ? activities.map((activity, index) => /*#__PURE__*/_jsx(ActivityCard, {
        title: activity.title,
        type: activity.type,
        merit: activity.merit,
        timestamp: activity.timestamp,
        content: activity.content,
        forks: activity.forks,
        replies: activity.replies
      }, index)) : /*#__PURE__*/_jsx("div", {
        className: "text-center py-8 text-gray-500",
        children: "No activities found for the selected criteria."
      })
    })]
  });
};
export default ActivityFeed;