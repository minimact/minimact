import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button, Space } from 'antd';
import FailSquareNotificationManager from './FailSquareNotificationManager';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquareNotificationManager',
  component: FailSquareNotificationManager,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Notification manager for FailSquare. Manages multiple notifications with automatic positioning, queuing, and dismissal. Provides imperative API for showing notifications from anywhere in the application.'
      }
    }
  },
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes for the notification container'
    }
  }
};
export default meta;
// Demo component for interactive stories
const NotificationDemo = ({
  notifications = [],
  autoShow = false
}) => {
  const managerRef = useRef(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const showNotification = notification => {
    managerRef.current?.show(notification);
    setNotificationCount(prev => prev + 1);
  };
  const clearAll = () => {
    managerRef.current?.clear();
    setNotificationCount(0);
  };

  // Auto-show notifications for demo
  React.useEffect(() => {
    if (autoShow && notifications.length > 0) {
      notifications.forEach((notification, index) => {
        setTimeout(() => showNotification(notification), index * 1000);
      });
    }
  }, [autoShow, notifications]);
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 min-h-screen bg-gray-50",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "max-w-2xl",
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-2xl font-bold mb-6",
        children: "FailSquare Notification Manager Demo"
      }), /*#__PURE__*/_jsxs("div", {
        className: "bg-white p-6 rounded-lg shadow-sm space-y-4",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-gray-600 mb-4",
          children: "Click the buttons below to trigger different types of notifications. Notifications will appear in the top-right corner of the screen."
        }), /*#__PURE__*/_jsxs(Space, {
          wrap: true,
          children: [/*#__PURE__*/_jsx(Button, {
            type: "primary",
            onClick: () => showNotification({
              title: 'Analysis Published',
              message: 'Your failure analysis has been successfully published.',
              type: 'success'
            }),
            children: "Success Notification"
          }), /*#__PURE__*/_jsx(Button, {
            onClick: () => showNotification({
              title: 'New Comment',
              message: 'Someone commented on your API failure analysis.',
              type: 'info'
            }),
            children: "Info Notification"
          }), /*#__PURE__*/_jsx(Button, {
            style: {
              backgroundColor: '#faad14',
              borderColor: '#faad14',
              color: 'white'
            },
            onClick: () => showNotification({
              title: 'Merit Threshold',
              message: 'Your analysis is close to the minimum merit score.',
              type: 'warning'
            }),
            children: "Warning Notification"
          }), /*#__PURE__*/_jsx(Button, {
            danger: true,
            onClick: () => showNotification({
              title: 'Upload Failed',
              message: 'Failed to upload failure documentation.',
              type: 'error'
            }),
            children: "Error Notification"
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "pt-4 border-t",
          children: /*#__PURE__*/_jsxs(Space, {
            children: [/*#__PURE__*/_jsxs(Button, {
              onClick: clearAll,
              children: ["Clear All (", notificationCount, ")"]
            }), /*#__PURE__*/_jsx(Button, {
              onClick: () => showNotification({
                title: 'Persistent Alert',
                message: 'This notification will not auto-dismiss.',
                type: 'warning',
                dismissible: false,
                autoDismissTimeout: 0
              }),
              children: "Non-Dismissible"
            }), /*#__PURE__*/_jsx(Button, {
              onClick: () => showNotification({
                title: 'Quick Message',
                message: 'This will disappear in 2 seconds.',
                type: 'success',
                autoDismissTimeout: 2000
              }),
              children: "Auto-Dismiss (2s)"
            })]
          })
        })]
      })]
    }), /*#__PURE__*/_jsx(FailSquareNotificationManager, {
      ref: managerRef
    })]
  });
};
export const Interactive = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {}),
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing how to use the notification manager with different types of notifications.'
      }
    }
  }
};
export const AutoSequence = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {
    autoShow: true,
    notifications: [{
      title: 'Analysis Started',
      message: 'Beginning failure analysis of database connection issues.',
      type: 'info'
    }, {
      title: 'Data Collection Complete',
      message: 'Successfully collected logs and metrics from the affected systems.',
      type: 'success'
    }, {
      title: 'Pattern Detected',
      message: 'Identified recurring connection timeout pattern during peak hours.',
      type: 'warning'
    }, {
      title: 'Analysis Complete',
      message: 'Failure analysis completed with actionable recommendations.',
      type: 'success'
    }]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Automatic sequence of notifications showing a typical failure analysis workflow.'
      }
    }
  }
};
export const FailureAlerts = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {
    autoShow: true,
    notifications: [{
      title: 'Database Connection Lost',
      message: 'Primary database connection failed. Failover initiated.',
      type: 'error',
      dismissible: false,
      autoDismissTimeout: 0
    }, {
      title: 'API Rate Limit Exceeded',
      message: 'External API rate limit reached. Requests being throttled.',
      type: 'warning',
      autoDismissTimeout: 8000
    }, {
      title: 'Security Alert',
      message: 'Unusual access pattern detected from IP 192.168.1.100.',
      type: 'warning',
      dismissible: false,
      autoDismissTimeout: 0
    }, {
      title: 'Service Recovery',
      message: 'Database connection restored. All systems operational.',
      type: 'success',
      autoDismissTimeout: 6000
    }]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Critical system failure notifications with different persistence settings.'
      }
    }
  }
};
export const UserActivity = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {
    autoShow: true,
    notifications: [{
      title: 'New Fork Created',
      message: 'Dr. Sarah Chen forked your microservices failure analysis.',
      type: 'info',
      autoDismissTimeout: 5000
    }, {
      title: 'Comment Added',
      message: 'Mike Johnson added insights to your API gateway analysis.',
      type: 'info',
      autoDismissTimeout: 4000
    }, {
      title: 'Merit Milestone',
      message: 'Your analysis reached 100 merit points! 🎉',
      type: 'success',
      autoDismissTimeout: 7000
    }, {
      title: 'Review Request',
      message: 'Peer review requested for your database migration failure.',
      type: 'info',
      autoDismissTimeout: 0
    }]
  }),
  parameters: {
    docs: {
      description: {
        story: 'User activity notifications for community interactions and achievements.'
      }
    }
  }
};
export const SystemMaintenance = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {
    autoShow: true,
    notifications: [{
      title: 'Maintenance Window Starting',
      message: 'System maintenance will begin in 15 minutes. Please save your work.',
      type: 'warning',
      dismissible: false,
      autoDismissTimeout: 0
    }, {
      title: 'Backup in Progress',
      message: 'Automated backup of failure database is currently running.',
      type: 'info',
      autoDismissTimeout: 0
    }, {
      title: 'Feature Update',
      message: 'New analysis tools have been deployed. Refresh to see updates.',
      type: 'success',
      autoDismissTimeout: 10000
    }]
  }),
  parameters: {
    docs: {
      description: {
        story: 'System maintenance and update notifications.'
      }
    }
  }
};
export const MixedPersistence = {
  render: () => /*#__PURE__*/_jsx(NotificationDemo, {
    autoShow: true,
    notifications: [{
      title: 'Quick Update',
      message: 'Auto-save completed.',
      type: 'success',
      autoDismissTimeout: 2000
    }, {
      title: 'Important Notice',
      message: 'Please review updated terms of service.',
      type: 'info',
      dismissible: true,
      autoDismissTimeout: 0
    }, {
      title: 'Critical Error',
      message: 'System error requires immediate attention.',
      type: 'error',
      dismissible: false,
      autoDismissTimeout: 0
    }, {
      title: 'Reminder',
      message: 'Submit your weekly failure analysis report.',
      type: 'warning',
      autoDismissTimeout: 8000
    }]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Mix of notifications with different dismissal and auto-hide behaviors.'
      }
    }
  }
};
export const CustomPosition = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "relative min-h-screen bg-gray-50 p-6",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "max-w-2xl",
      children: [/*#__PURE__*/_jsx("h2", {
        className: "text-2xl font-bold mb-4",
        children: "Custom Positioned Manager"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-gray-600 mb-6",
        children: "This notification manager is positioned in the bottom-left corner instead of the default top-right."
      }), /*#__PURE__*/_jsx(Button, {
        type: "primary",
        onClick: () => {
          // This would need a ref in a real implementation
          console.log('Show notification in bottom-left');
        },
        children: "Show Bottom-Left Notification"
      })]
    }), /*#__PURE__*/_jsx(FailSquareNotificationManager, {
      className: "bottom-4 left-4 top-auto right-auto"
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Notification manager with custom positioning using className override.'
      }
    }
  }
};

// Basic story for props table
export const Default = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "p-6",
    children: [/*#__PURE__*/_jsx("p", {
      className: "text-gray-600 mb-4",
      children: "The FailSquareNotificationManager component is typically used as a singleton at the root of your application. It provides an imperative API for showing notifications from anywhere in your app."
    }), /*#__PURE__*/_jsx(FailSquareNotificationManager, {})]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Basic notification manager setup. Use the Interactive story to see it in action.'
      }
    }
  }
};