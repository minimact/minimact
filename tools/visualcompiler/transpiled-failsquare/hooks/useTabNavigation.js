import { useCallback } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../contexts/TabContext';
export const useTabNavigation = () => {
  const navigate = useNavigate();
  const {
    openTab
  } = useTabs();
  const navigateToTab = useCallback((path, title, options) => {
    const closable = options?.closable !== undefined ? options.closable : true;
    openTab({
      title,
      path,
      closable
    });
    navigate(path, {
      replace: options?.replace
    });
  }, [navigate, openTab]);
  return {
    navigateToTab
  };
};