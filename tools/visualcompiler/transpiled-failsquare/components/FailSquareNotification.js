import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, BranchesOutlined, CloseOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const NotificationType = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
  Fork: 'fork'
};
const FailSquareNotification = ({
  title,
  message,
  type = NotificationType.Info,
  dismissible = true,
  autoDismissTimeout = 0,
  onDismiss,
  className
}) => {
  const autoDismissTimerRef = useRef(null);
  useEffect(() => {
    if (autoDismissTimeout > 0) {
      autoDismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissTimeout);
    }
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [autoDismissTimeout]);
  const getNotificationClasses = () => {
    const baseClasses = ['failsquare-notification', 'flex', 'items-start', 'gap-3', 'p-4', 'rounded-lg', 'border', 'shadow-sm'];
    const typeClasses = {
      [NotificationType.Success]: ['failsquare-notification-success', 'bg-green-50', 'border-green-200', 'text-green-800'],
      [NotificationType.Warning]: ['failsquare-notification-warning', 'bg-yellow-50', 'border-yellow-200', 'text-yellow-800'],
      [NotificationType.Error]: ['failsquare-notification-error', 'bg-red-50', 'border-red-200', 'text-red-800'],
      [NotificationType.Fork]: ['failsquare-notification-fork', 'bg-purple-50', 'border-purple-200', 'text-purple-800'],
      [NotificationType.Info]: ['failsquare-notification-info', 'bg-blue-50', 'border-blue-200', 'text-blue-800']
    };
    return [...baseClasses, ...typeClasses[type]].join(' ');
  };
  const getNotificationIcon = () => {
    const iconProps = {
      className: 'w-5 h-5 flex-shrink-0 mt-0.5'
    };
    switch (type) {
      case NotificationType.Success:
        return /*#__PURE__*/_jsx(CheckCircleOutlined, {
          ...iconProps,
          className: `${iconProps.className} text-green-600`
        });
      case NotificationType.Warning:
        return /*#__PURE__*/_jsx(ExclamationCircleOutlined, {
          ...iconProps,
          className: `${iconProps.className} text-yellow-600`
        });
      case NotificationType.Error:
        return /*#__PURE__*/_jsx(CloseCircleOutlined, {
          ...iconProps,
          className: `${iconProps.className} text-red-600`
        });
      case NotificationType.Fork:
        return /*#__PURE__*/_jsx(BranchesOutlined, {
          ...iconProps,
          className: `${iconProps.className} text-purple-600`
        });
      default:
        return /*#__PURE__*/_jsx(InfoCircleOutlined, {
          ...iconProps,
          className: `${iconProps.className} text-blue-600`
        });
    }
  };
  const handleDismiss = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    onDismiss?.();
  };
  return /*#__PURE__*/_jsxs("div", {
    className: `${getNotificationClasses()} ${className || ''}`,
    children: [/*#__PURE__*/_jsx("div", {
      className: "failsquare-notification-icon",
      children: getNotificationIcon()
    }), /*#__PURE__*/_jsxs("div", {
      className: "failsquare-notification-content flex-1",
      children: [/*#__PURE__*/_jsx("div", {
        className: "failsquare-notification-title font-medium",
        children: title
      }), message && /*#__PURE__*/_jsx("div", {
        className: "failsquare-notification-message text-sm mt-1 opacity-90",
        children: message
      })]
    }), dismissible && /*#__PURE__*/_jsx("button", {
      className: "failsquare-notification-close flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors",
      onClick: handleDismiss,
      children: /*#__PURE__*/_jsx(CloseOutlined, {
        className: "w-4 h-4"
      })
    })]
  });
};
export default FailSquareNotification;