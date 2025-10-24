import FailSquareNotification from './FailSquareNotification';
import { BulbOutlined, BugOutlined, DatabaseOutlined, ApiOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Core UI/FailSquareNotification',
  component: FailSquareNotification,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Notification component for FailSquare. Displays contextual messages with different types, auto-dismiss functionality, and dismissible options.'
      }
    }
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error'],
      description: 'The type of notification which determines styling and icon'
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether the notification can be manually dismissed'
    },
    autoDismissTimeout: {
      control: 'number',
      description: 'Auto-dismiss timeout in milliseconds (0 to disable)'
    },
    onDismiss: {
      action: 'notification-dismissed',
      description: 'Callback when notification is dismissed'
    }
  }
};
export default meta;
export const Success = {
  args: {
    title: 'Analysis Complete',
    message: 'Your failure analysis has been successfully published and is now available for the community to review.',
    type: 'success'
  },
  parameters: {
    docs: {
      description: {
        story: 'Success notification for completed actions.'
      }
    }
  }
};
export const Info = {
  args: {
    title: 'New Fork Available',
    message: 'Dr. Sarah Chen has created an extension fork of your database migration failure analysis.',
    type: 'info'
  },
  parameters: {
    docs: {
      description: {
        story: 'Info notification for general information.'
      }
    }
  }
};
export const Warning = {
  args: {
    title: 'Merit Score Threshold',
    message: 'Your analysis is approaching the minimum merit threshold. Consider adding more technical details or supporting evidence.',
    type: 'warning'
  },
  parameters: {
    docs: {
      description: {
        story: 'Warning notification for cautionary messages.'
      }
    }
  }
};
export const Error = {
  args: {
    title: 'Upload Failed',
    message: 'Failed to upload your failure documentation. Please check your connection and try again.',
    type: 'error'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error notification for failed operations.'
      }
    }
  }
};
export const WithoutMessage = {
  args: {
    title: 'Quick Update',
    type: 'info'
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification with title only, no additional message.'
      }
    }
  }
};
export const NonDismissible = {
  args: {
    title: 'System Maintenance',
    message: 'FailSquare will be undergoing scheduled maintenance in 10 minutes. Please save your work.',
    type: 'warning',
    dismissible: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Non-dismissible notification for important system messages.'
      }
    }
  }
};
export const AutoDismiss = {
  args: {
    title: 'Changes Saved',
    message: 'Your failure analysis has been automatically saved.',
    type: 'success',
    autoDismissTimeout: 3000
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification that auto-dismisses after 3 seconds.'
      }
    }
  }
};
export const NoAutoDismiss = {
  args: {
    title: 'Critical System Alert',
    message: 'Multiple cascade failures detected across production systems. Immediate attention required.',
    type: 'error',
    autoDismissTimeout: 0
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification that never auto-dismisses (timeout set to 0).'
      }
    }
  }
};
export const LongContent = {
  args: {
    title: 'Detailed Analysis Report Generated',
    message: 'Your comprehensive failure analysis report has been generated and includes detailed technical specifications, root cause analysis, impact assessment, timeline reconstruction, prevention strategies, and recommendations for future improvements. The report is available for download and sharing with your team.',
    type: 'success'
  },
  parameters: {
    docs: {
      description: {
        story: 'Notification with longer content to test text wrapping.'
      }
    }
  }
};
export const FailureScenarios = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Database Connection Failed",
      message: "Unable to connect to production database. Connection timeout after 30 seconds.",
      type: "error",
      icon: /*#__PURE__*/_jsx(DatabaseOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "API Rate Limit Exceeded",
      message: "Your application has exceeded the API rate limit. Please implement backoff strategies.",
      type: "warning",
      icon: /*#__PURE__*/_jsx(ApiOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Bug Report Received",
      message: "A new bug report has been submitted for the authentication service.",
      type: "info",
      icon: /*#__PURE__*/_jsx(BugOutlined, {})
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Insight Discovered",
      message: "Pattern analysis revealed a potential optimization in your error handling logic.",
      type: "success",
      icon: /*#__PURE__*/_jsx(BulbOutlined, {})
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Various failure-related notification scenarios with custom icons.'
      }
    }
  }
};
export const InteractiveDemo = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4",
    children: [/*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Click to Dismiss",
      message: "This notification can be manually dismissed by clicking the X button.",
      type: "info",
      dismissible: true,
      autoDismissTimeout: 0,
      onDismiss: () => console.log('Info notification dismissed')
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Auto-Dismiss in 5s",
      message: "This notification will automatically disappear after 5 seconds.",
      type: "success",
      dismissible: true,
      autoDismissTimeout: 5000,
      onDismiss: () => console.log('Success notification auto-dismissed')
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Persistent Warning",
      message: "This warning cannot be dismissed and will not auto-hide.",
      type: "warning",
      dismissible: false,
      autoDismissTimeout: 0
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing different dismiss behaviors.'
      }
    }
  }
};
export const SystemNotifications = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-3",
    children: [/*#__PURE__*/_jsx(FailSquareNotification, {
      title: "System Update Available",
      message: "FailSquare v2.1.0 is available with improved failure analysis algorithms.",
      type: "info",
      dismissible: true
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Backup Completed",
      message: "Daily backup of failure database completed successfully at 3:00 AM.",
      type: "success",
      dismissible: true,
      autoDismissTimeout: 4000
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Storage Warning",
      message: "Analysis storage is 85% full. Consider archiving older failure reports.",
      type: "warning",
      dismissible: true
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Network Connectivity",
      message: "Intermittent network issues detected. Some features may be temporarily unavailable.",
      type: "error",
      dismissible: false
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'System-level notifications for various operational states.'
      }
    }
  }
};
export const UserActions = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-3",
    children: [/*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Analysis Forked",
      message: "Your failure analysis has been forked by 3 community members this week.",
      type: "success",
      dismissible: true
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Comment Received",
      message: "Dr. Martinez added a comment to your API Gateway failure analysis.",
      type: "info",
      dismissible: true
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Merit Threshold Reached",
      message: "Congratulations! Your analysis has reached the merit threshold for featured content.",
      type: "success",
      dismissible: true
    }), /*#__PURE__*/_jsx(FailSquareNotification, {
      title: "Review Requested",
      message: "Your peer review is requested for the microservices cascade failure analysis.",
      type: "info",
      dismissible: true
    })]
  }),
  parameters: {
    docs: {
      description: {
        story: 'User action notifications for community interactions.'
      }
    }
  }
};