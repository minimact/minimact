import { useState, useCallback, useImperativeHandle, forwardRef } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareNotification from './FailSquareNotification';
import { jsx as _jsx } from "react/jsx-runtime";
const FailSquareNotificationManager = forwardRef(({
  className
}, ref) => {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [nextId, setNextId] = useState(1);
  const show = useCallback(notification => {
    const newNotification = {
      ...notification,
      id: nextId,
      dismissible: notification.dismissible ?? true,
      autoDismissTimeout: notification.autoDismissTimeout ?? 5000
    };
    setActiveNotifications(prev => [...prev, newNotification]);
    setNextId(prev => prev + 1);
  }, [nextId]);
  const dismiss = useCallback(id => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  const clear = useCallback(() => {
    setActiveNotifications([]);
  }, []);
  useImperativeHandle(ref, () => ({
    show,
    dismiss,
    clear
  }), [show, dismiss, clear]);
  const dismissNotification = id => {
    dismiss(id);
  };
  return /*#__PURE__*/_jsx("div", {
    className: `failsquare-notification-container fixed top-4 right-4 z-50 space-y-3 max-w-md ${className || ''}`,
    children: activeNotifications.map(notification => /*#__PURE__*/_jsx(FailSquareNotification, {
      title: notification.title,
      message: notification.message,
      type: notification.type,
      dismissible: notification.dismissible,
      autoDismissTimeout: notification.autoDismissTimeout,
      onDismiss: () => dismissNotification(notification.id)
    }, notification.id))
  });
});
FailSquareNotificationManager.displayName = 'FailSquareNotificationManager';
export default FailSquareNotificationManager;