import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { CloseOutlined } from '@ant-design/icons';
import { useTabs } from '../contexts/TabContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TabsBar = () => {
  const {
    tabs,
    activeTabId,
    activateTab,
    closeTab,
    reorderTabs
  } = useTabs();
  const navigate = useNavigate();
  const location = useLocation();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const tabsContainerRef = useRef(null);

  // Touch gesture state for mobile
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchCurrentX, setTouchCurrentX] = useState(null);
  const [swipingTabId, setSwipingTabId] = useState(null);
  useEffect(() => {
    // Sync active tab with current route
    const currentTab = tabs.find(t => t.path === location.pathname);
    if (currentTab && currentTab.id !== activeTabId) {
      activateTab(currentTab.id);
    }
  }, [location.pathname, tabs, activeTabId, activateTab]);
  const handleTabClick = (tabId, path) => {
    activateTab(tabId);
    navigate(path);
  };
  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  // Drag handlers for desktop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderTabs(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers for mobile swipe gestures
  const handleTouchStart = (e, tabId) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
    setSwipingTabId(tabId);
  };
  const handleTouchMove = e => {
    if (touchStartX === null) return;
    setTouchCurrentX(e.touches[0].clientX);
  };
  const handleTouchEnd = tabId => {
    if (touchStartX === null || touchCurrentX === null) return;
    const deltaX = touchCurrentX - touchStartX;
    const threshold = 100; // pixels

    // Swipe left to close (if closable)
    if (deltaX < -threshold) {
      const tab = tabs.find(t => t.id === tabId);
      if (tab?.closable) {
        closeTab(tabId);
      }
    }

    // Reset touch state
    setTouchStartX(null);
    setTouchCurrentX(null);
    setSwipingTabId(null);
  };
  const getSwipeTransform = tabId => {
    if (swipingTabId !== tabId || touchStartX === null || touchCurrentX === null) {
      return 0;
    }
    const deltaX = touchCurrentX - touchStartX;
    // Only allow left swipe for closing
    return Math.min(0, deltaX);
  };
  if (tabs.length === 0) return null;
  return /*#__PURE__*/_jsx("div", {
    className: "bg-white border-b border-gray-200 overflow-x-auto",
    children: /*#__PURE__*/_jsx("div", {
      ref: tabsContainerRef,
      className: "flex min-w-full",
      children: tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;
        const swipeTransform = getSwipeTransform(tab.id);
        return /*#__PURE__*/_jsxs("div", {
          draggable: true,
          onDragStart: e => handleDragStart(e, index),
          onDragOver: e => handleDragOver(e, index),
          onDragEnd: handleDragEnd,
          onTouchStart: e => handleTouchStart(e, tab.id),
          onTouchMove: handleTouchMove,
          onTouchEnd: () => handleTouchEnd(tab.id),
          onClick: () => handleTabClick(tab.id, tab.path),
          className: `
                relative flex items-center px-4 py-3 cursor-pointer
                border-r border-gray-200 min-w-[150px] max-w-[250px]
                transition-all duration-200 select-none
                ${isActive ? 'bg-blue-50 border-b-2 border-b-blue-500' : 'bg-white hover:bg-gray-50'}
                ${isDragging ? 'opacity-50' : ''}
                ${isDragOver ? 'border-l-2 border-l-blue-400' : ''}
              `,
          style: {
            transform: swipeTransform !== 0 ? `translateX(${swipeTransform}px)` : undefined
          },
          children: [tab.icon && /*#__PURE__*/_jsx("span", {
            className: "mr-2",
            children: tab.icon
          }), /*#__PURE__*/_jsx("span", {
            className: `flex-1 truncate text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}`,
            children: tab.title
          }), tab.closable && /*#__PURE__*/_jsx("button", {
            onClick: e => handleCloseTab(e, tab.id),
            className: "ml-2 p-1 rounded hover:bg-gray-200 transition-colors",
            "aria-label": "Close tab",
            children: /*#__PURE__*/_jsx(CloseOutlined, {
              className: "text-xs text-gray-500"
            })
          }), isDragging && /*#__PURE__*/_jsx("div", {
            className: "absolute inset-0 bg-blue-100 opacity-30 pointer-events-none"
          })]
        }, tab.id);
      })
    })
  });
};
export default TabsBar;