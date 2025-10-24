import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx } from "react/jsx-runtime";
const TabContext = createContext(undefined);
export const TabProvider = ({
  children
}) => {
  const [tabs, setTabs] = useState([{
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    closable: false
  }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const openTab = useCallback(tab => {
    setTabs(prevTabs => {
      // Check if tab with same path already exists
      const existingTab = prevTabs.find(t => t.path === tab.path);
      if (existingTab) {
        // Activate existing tab
        setActiveTabId(existingTab.id);
        return prevTabs;
      }

      // Create new tab with ID
      const newTab = {
        id: tab.id || `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: tab.title,
        path: tab.path,
        icon: tab.icon,
        closable: tab.closable
      };
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);
  const closeTab = useCallback(tabId => {
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prevTabs;
      const tabToClose = prevTabs[tabIndex];

      // Cannot close non-closable tabs
      if (!tabToClose.closable) return prevTabs;
      const newTabs = prevTabs.filter(t => t.id !== tabId);

      // If closing active tab, activate adjacent tab
      if (activeTabId === tabId && newTabs.length > 0) {
        // Try to activate tab to the right, otherwise tab to the left
        const nextTab = newTabs[tabIndex] || newTabs[tabIndex - 1];
        setActiveTabId(nextTab.id);
      }
      return newTabs;
    });
  }, [activeTabId]);
  const activateTab = useCallback(tabId => {
    setActiveTabId(tabId);
  }, []);
  const reorderTabs = useCallback((fromIndex, toIndex) => {
    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);
  const getTabByPath = useCallback(path => {
    return tabs.find(t => t.path === path);
  }, [tabs]);
  const closeAllTabs = useCallback(() => {
    setTabs(prevTabs => prevTabs.filter(t => !t.closable));
    const dashboardTab = tabs.find(t => t.id === 'dashboard');
    if (dashboardTab) {
      setActiveTabId('dashboard');
    }
  }, [tabs]);
  const closeOtherTabs = useCallback(tabId => {
    setTabs(prevTabs => prevTabs.filter(t => t.id === tabId || !t.closable));
    setActiveTabId(tabId);
  }, []);
  return /*#__PURE__*/_jsx(TabContext.Provider, {
    value: {
      tabs,
      activeTabId,
      openTab,
      closeTab,
      activateTab,
      reorderTabs,
      getTabByPath,
      closeAllTabs,
      closeOtherTabs
    },
    children: children
  });
};
export const useTabs = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
};