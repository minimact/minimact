import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Layout, Menu, Avatar, Badge, Breadcrumb } from 'antd';
import { DashboardOutlined, ExperimentOutlined, FileAddOutlined, SearchOutlined, BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import TabsBar from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/TabsBar.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Header,
  Sider,
  Content
} = Layout;
const MainLayout = ({
  children
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    navigateToTab
  } = useTabNavigation();
  const location = useLocation();
  const menuItems = [{
    key: '/dashboard',
    icon: /*#__PURE__*/_jsx(DashboardOutlined, {}),
    label: 'Dashboard'
  }, {
    key: '/submit',
    icon: /*#__PURE__*/_jsx(FileAddOutlined, {}),
    label: 'Document Failure'
  }, {
    key: '/explore',
    icon: /*#__PURE__*/_jsx(SearchOutlined, {}),
    label: 'Explore Failures'
  }, {
    key: '/resurrections',
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
    label: 'Resurrections'
  }];
  const handleMenuClick = e => {
    const menuItem = menuItems.find(item => item.key === e.key);
    if (menuItem) {
      navigateToTab(e.key, menuItem.label, {
        closable: e.key !== '/dashboard'
      });
    }
  };
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [{
      title: 'Home'
    }];
    if (path === '/dashboard') {
      breadcrumbs.push({
        title: 'Dashboard'
      });
    } else if (path === '/submit') {
      breadcrumbs.push({
        title: 'Document Failure'
      });
    } else if (path === '/explore') {
      breadcrumbs.push({
        title: 'Explore'
      });
    } else if (path === '/resurrections') {
      breadcrumbs.push({
        title: 'Resurrections'
      });
    }
    return breadcrumbs;
  };
  return /*#__PURE__*/_jsxs(Layout, {
    className: "min-h-screen",
    children: [/*#__PURE__*/_jsxs(Sider, {
      collapsible: true,
      collapsed: collapsed,
      onCollapse: setCollapsed,
      theme: "dark",
      width: 256,
      children: [/*#__PURE__*/_jsx("div", {
        className: "p-4 flex items-center justify-center",
        children: collapsed ? /*#__PURE__*/_jsx("img", {
          src: "/assets/logo.png",
          alt: "FailSquare",
          className: "w-10 h-10 object-contain"
        }) : /*#__PURE__*/_jsx("img", {
          src: "/assets/logo-animated.gif",
          alt: "FailSquare",
          className: "w-full max-w-[200px] object-contain"
        })
      }), /*#__PURE__*/_jsx(Menu, {
        theme: "dark",
        mode: "inline",
        selectedKeys: [location.pathname],
        items: menuItems,
        onClick: handleMenuClick
      })]
    }), /*#__PURE__*/_jsxs(Layout, {
      children: [/*#__PURE__*/_jsxs(Header, {
        className: "bg-white px-6 flex justify-between items-center shadow-sm",
        children: [/*#__PURE__*/_jsx("div", {
          className: "flex items-center",
          children: collapsed ? /*#__PURE__*/_jsx(MenuUnfoldOutlined, {
            className: "text-xl cursor-pointer hover:text-blue-500 transition-colors",
            onClick: () => setCollapsed(false)
          }) : /*#__PURE__*/_jsx(MenuFoldOutlined, {
            className: "text-xl cursor-pointer hover:text-blue-500 transition-colors",
            onClick: () => setCollapsed(true)
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center space-x-6",
          children: [/*#__PURE__*/_jsx(Badge, {
            count: 5,
            className: "cursor-pointer",
            children: /*#__PURE__*/_jsx(BellOutlined, {
              className: "text-xl hover:text-blue-500 transition-colors"
            })
          }), /*#__PURE__*/_jsx(Avatar, {
            size: "large",
            style: {
              backgroundColor: '#1890ff'
            },
            className: "cursor-pointer",
            children: "U"
          })]
        })]
      }), /*#__PURE__*/_jsx(TabsBar, {}), /*#__PURE__*/_jsx(Breadcrumb, {
        className: "px-6 py-4 bg-gray-50",
        items: getBreadcrumbs()
      }), /*#__PURE__*/_jsx(Content, {
        className: "p-6 bg-gray-50",
        children: children
      })]
    })]
  });
};
export default MainLayout;