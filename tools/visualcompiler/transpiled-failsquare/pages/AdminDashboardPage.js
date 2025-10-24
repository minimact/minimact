import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag } from 'antd';
import { UserOutlined, ExclamationCircleOutlined, FileTextOutlined, TeamOutlined, SafetyOutlined, ProfileOutlined, SettingOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AdminDashboardPage = () => {
  const {
    navigateToTab
  } = useTabNavigation();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeModerations: 0,
    failuresToday: 0,
    activeUsers24h: 0
  });
  const [recentModerations, setRecentModerations] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  useEffect(() => {
    loadDashboardData();
  }, []);
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API calls
      // const statsResponse = await fetch('/api/admin/statistics');
      // const moderationsResponse = await fetch('/api/admin/moderation/recent?limit=5');
      // const logsResponse = await fetch('/api/admin/logs/recent?limit=5');

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatistics({
        totalUsers: 1247,
        activeModerations: 8,
        failuresToday: 23,
        activeUsers24h: 342
      });
      setRecentModerations([{
        id: '1',
        actionType: 'Hidden',
        contentType: 'Failure',
        reason: 'Duplicate submission',
        createdAt: new Date('2024-10-14T10:30:00'),
        moderatorName: 'admin'
      }, {
        id: '2',
        actionType: 'Flagged',
        contentType: 'Comment',
        reason: 'Spam content',
        createdAt: new Date('2024-10-14T09:15:00'),
        moderatorName: 'moderator1'
      }, {
        id: '3',
        actionType: 'Approved',
        contentType: 'Failure',
        reason: 'Quality review passed',
        createdAt: new Date('2024-10-14T08:00:00'),
        moderatorName: 'admin'
      }]);
      setRecentLogs([{
        id: '1',
        level: 'INFO',
        message: 'User registration successful',
        timestamp: new Date('2024-10-14T11:45:00')
      }, {
        id: '2',
        level: 'WARN',
        message: 'High API rate limit usage detected',
        timestamp: new Date('2024-10-14T11:30:00')
      }, {
        id: '3',
        level: 'ERROR',
        message: 'Failed to send notification email',
        timestamp: new Date('2024-10-14T11:15:00')
      }]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  const moderationColumns = [{
    title: 'Action',
    dataIndex: 'actionType',
    key: 'actionType',
    render: text => {
      const color = text === 'Hidden' ? 'red' : text === 'Flagged' ? 'orange' : text === 'Approved' ? 'green' : 'default';
      return /*#__PURE__*/_jsx(Tag, {
        color: color,
        children: text
      });
    }
  }, {
    title: 'Content Type',
    dataIndex: 'contentType',
    key: 'contentType'
  }, {
    title: 'Reason',
    dataIndex: 'reason',
    key: 'reason'
  }, {
    title: 'Date',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: date => date.toLocaleDateString()
  }];
  const logColumns = [{
    title: 'Level',
    dataIndex: 'level',
    key: 'level',
    render: level => {
      const color = level === 'ERROR' ? 'red' : level === 'WARN' ? 'orange' : 'blue';
      return /*#__PURE__*/_jsx(Tag, {
        color: color,
        children: level
      });
    }
  }, {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
    ellipsis: true
  }, {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: date => date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }];
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "admin-dashboard p-6",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "text-2xl font-bold mb-6",
        children: "Admin Dashboard"
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Total Users",
              value: statistics.totalUsers,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(UserOutlined, {})
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Active Moderations",
              value: statistics.activeModerations,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(ExclamationCircleOutlined, {}),
              valueStyle: {
                color: '#faad14'
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Failures Today",
              value: statistics.failuresToday,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(FileTextOutlined, {})
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Active Users (24h)",
              value: statistics.activeUsers24h,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(TeamOutlined, {}),
              valueStyle: {
                color: '#52c41a'
              }
            })
          })
        })]
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 12,
          children: /*#__PURE__*/_jsx(Card, {
            title: "Recent Moderation Actions",
            extra: /*#__PURE__*/_jsx("a", {
              href: "#",
              onClick: e => {
                e.preventDefault();
                navigateToTab('/admin/moderation', 'Moderation Queue', {
                  closable: true
                });
              },
              children: "View All"
            }),
            children: /*#__PURE__*/_jsx(Table, {
              dataSource: recentModerations,
              columns: moderationColumns,
              loading: loading,
              pagination: false,
              rowKey: "id",
              size: "small"
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 12,
          children: /*#__PURE__*/_jsx(Card, {
            title: "Latest System Logs",
            extra: /*#__PURE__*/_jsx("a", {
              href: "#",
              onClick: e => {
                e.preventDefault();
                navigateToTab('/admin/logs', 'System Logs', {
                  closable: true
                });
              },
              children: "View All"
            }),
            children: /*#__PURE__*/_jsx(Table, {
              dataSource: recentLogs,
              columns: logColumns,
              loading: loading,
              pagination: false,
              rowKey: "id",
              size: "small"
            })
          })
        })]
      }), /*#__PURE__*/_jsx(Row, {
        gutter: 24,
        children: /*#__PURE__*/_jsx(Col, {
          span: 24,
          children: /*#__PURE__*/_jsx(Card, {
            title: "Quick Actions",
            children: /*#__PURE__*/_jsxs(Space, {
              size: "middle",
              children: [/*#__PURE__*/_jsx(Button, {
                type: "primary",
                icon: /*#__PURE__*/_jsx(UserOutlined, {}),
                onClick: () => navigateToTab('/admin/users', 'Manage Users', {
                  closable: true
                }),
                children: "Manage Users"
              }), /*#__PURE__*/_jsx(Button, {
                type: "primary",
                icon: /*#__PURE__*/_jsx(SafetyOutlined, {}),
                onClick: () => navigateToTab('/admin/moderation', 'Moderation Queue', {
                  closable: true
                }),
                children: "Moderation Queue"
              }), /*#__PURE__*/_jsx(Button, {
                type: "primary",
                icon: /*#__PURE__*/_jsx(ProfileOutlined, {}),
                onClick: () => navigateToTab('/admin/logs', 'System Logs', {
                  closable: true
                }),
                children: "View Logs"
              }), /*#__PURE__*/_jsx(Button, {
                type: "primary",
                icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
                onClick: () => navigateToTab('/admin/security-audit', 'Security Audit', {
                  closable: true
                }),
                children: "Security Audit"
              }), /*#__PURE__*/_jsx(Button, {
                type: "primary",
                icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
                onClick: () => navigateToTab('/admin/settings', 'System Settings', {
                  closable: true
                }),
                children: "System Settings"
              })]
            })
          })
        })
      })]
    })
  });
};
export default AdminDashboardPage;