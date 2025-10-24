import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Avatar, Badge } from 'antd';
import { HomeOutlined, CompassOutlined, SearchOutlined, BranchesOutlined, AppstoreOutlined, ThunderboltOutlined, BookOutlined, TeamOutlined, BellOutlined, SettingOutlined, ExperimentOutlined, LeftOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const FailSquareSidebar = ({
  userName = '',
  onNavigate,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainNavItems = [{
    id: 'home',
    label: 'Home',
    icon: /*#__PURE__*/_jsx(HomeOutlined, {})
  }, {
    id: 'explore',
    label: 'Explore',
    icon: /*#__PURE__*/_jsx(CompassOutlined, {})
  }, {
    id: 'search',
    label: 'Search',
    icon: /*#__PURE__*/_jsx(SearchOutlined, {})
  }, {
    id: 'forks',
    label: 'My Forks',
    icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
    merit: 4.2
  }, {
    id: 'tree',
    label: 'Idea Tree',
    icon: /*#__PURE__*/_jsx(AppstoreOutlined, {})
  }];
  const communityItems = [{
    id: 'trending',
    label: 'Trending',
    icon: /*#__PURE__*/_jsx(ThunderboltOutlined, {}),
    notificationCount: 3
  }, {
    id: 'substacks',
    label: 'Substacks',
    icon: /*#__PURE__*/_jsx(BookOutlined, {})
  }, {
    id: 'people',
    label: 'People',
    icon: /*#__PURE__*/_jsx(TeamOutlined, {})
  }];
  const footerItems = [{
    id: 'notifications',
    label: 'Notifications',
    icon: /*#__PURE__*/_jsx(BellOutlined, {}),
    notificationCount: 5
  }, {
    id: 'settings',
    label: 'Settings',
    icon: /*#__PURE__*/_jsx(SettingOutlined, {})
  }];
  const handleNavClick = item => {
    onNavigate?.(item);
  };
  const renderNavItem = item => {
    const hasNotification = item.notificationCount && item.notificationCount > 0;
    const hasMerit = item.merit !== undefined;
    return /*#__PURE__*/_jsxs("button", {
      onClick: () => handleNavClick(item),
      className: `
          w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100
          transition-colors border-none bg-transparent cursor-pointer
          ${item.isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700'}
        `,
      children: [/*#__PURE__*/_jsx("div", {
        className: "flex-shrink-0 w-5 h-5 flex items-center justify-center",
        children: hasNotification ? /*#__PURE__*/_jsx(Badge, {
          count: item.notificationCount,
          size: "small",
          children: item.icon
        }) : item.icon
      }), !isCollapsed && /*#__PURE__*/_jsxs(_Fragment, {
        children: [/*#__PURE__*/_jsx("span", {
          className: "flex-1 font-medium",
          children: item.label
        }), hasMerit && /*#__PURE__*/_jsx("span", {
          className: "text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded",
          children: item.merit
        })]
      })]
    }, item.id);
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `
        failsquare-sidebar relative flex flex-col h-full bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${className || ''}
      `,
    children: [/*#__PURE__*/_jsx("div", {
      className: "failsquare-sidebar-header p-4 border-b border-gray-200",
      children: /*#__PURE__*/_jsxs("div", {
        className: "failsquare-logo flex items-center gap-3",
        children: [/*#__PURE__*/_jsx("div", {
          className: "failsquare-logo-icon text-blue-600 text-xl",
          children: /*#__PURE__*/_jsx(ExperimentOutlined, {})
        }), !isCollapsed && /*#__PURE__*/_jsx("span", {
          className: "failsquare-logo-text text-xl font-bold text-gray-900",
          children: "FailSquare"
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "failsquare-sidebar-content flex-1 overflow-y-auto",
      children: [/*#__PURE__*/_jsx("div", {
        className: "failsquare-nav-section py-2",
        children: mainNavItems.map(renderNavItem)
      }), !isCollapsed && /*#__PURE__*/_jsx("div", {
        className: "failsquare-nav-label px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider",
        children: "Community"
      }), /*#__PURE__*/_jsx("div", {
        className: "failsquare-nav-section py-2",
        children: communityItems.map(renderNavItem)
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "failsquare-sidebar-footer border-t border-gray-200",
      children: [!isCollapsed && userName && /*#__PURE__*/_jsx("div", {
        className: "failsquare-user-profile p-4",
        children: /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-3",
          children: [/*#__PURE__*/_jsx(Avatar, {
            size: "small",
            icon: /*#__PURE__*/_jsx(UserOutlined, {})
          }), /*#__PURE__*/_jsxs("div", {
            className: "failsquare-user-info flex-1",
            children: [/*#__PURE__*/_jsx("div", {
              className: "failsquare-user-name text-sm font-medium text-gray-900",
              children: userName
            }), /*#__PURE__*/_jsx("div", {
              className: "failsquare-user-status text-xs text-gray-500 hover:text-blue-600 cursor-pointer",
              children: "View Profile"
            })]
          })]
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "failsquare-footer-actions",
        children: footerItems.map(renderNavItem)
      })]
    }), /*#__PURE__*/_jsx("button", {
      className: "failsquare-collapse-toggle absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors",
      onClick: () => setIsCollapsed(!isCollapsed),
      children: isCollapsed ? /*#__PURE__*/_jsx(RightOutlined, {}) : /*#__PURE__*/_jsx(LeftOutlined, {})
    })]
  });
};
export default FailSquareSidebar;