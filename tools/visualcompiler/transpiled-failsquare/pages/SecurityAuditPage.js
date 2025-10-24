import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Row, Col, Statistic, Tabs, Table, Tag, Button, Input, Space, DatePicker, Radio, Select, Modal, Descriptions } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined, SafetyOutlined, ApiOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  RangePicker
} = DatePicker;
const SecurityAuditPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    failedLoginAttempts24h: 0,
    uniqueSuspiciousIps24h: 0,
    securityIncidents24h: 0,
    totalApiRequests24h: 0
  });
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [apiUsage, setApiUsage] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loginFilter, setLoginFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOverview({
        failedLoginAttempts24h: 47,
        uniqueSuspiciousIps24h: 12,
        securityIncidents24h: 3,
        totalApiRequests24h: 28456
      });
      setLoginAttempts([{
        id: '1',
        username: 'testuser',
        success: false,
        ipAddress: '192.168.1.100',
        location: 'New York, US',
        device: 'Chrome on Windows',
        timestamp: new Date('2024-10-14T10:30:00')
      }, {
        id: '2',
        username: 'admin',
        success: true,
        ipAddress: '10.0.0.1',
        location: 'San Francisco, US',
        device: 'Firefox on Mac',
        timestamp: new Date('2024-10-14T10:25:00')
      }]);
      setSecurityEvents([{
        id: '1',
        eventType: 'Brute Force Attempt',
        severity: 'high',
        description: 'Multiple failed login attempts from same IP',
        username: 'testuser',
        ipAddress: '192.168.1.100',
        timestamp: new Date('2024-10-14T10:30:00')
      }, {
        id: '2',
        eventType: 'Suspicious Activity',
        severity: 'medium',
        description: 'Unusual API access pattern detected',
        ipAddress: '10.0.0.50',
        timestamp: new Date('2024-10-14T09:15:00')
      }]);
      setApiUsage([{
        id: '1',
        method: 'GET',
        endpoint: '/api/failures',
        statusCode: 200,
        username: 'user1',
        ipAddress: '192.168.1.1',
        durationMs: 45,
        timestamp: new Date('2024-10-14T11:00:00')
      }, {
        id: '2',
        method: 'POST',
        endpoint: '/api/failures',
        statusCode: 201,
        username: 'user2',
        ipAddress: '192.168.1.2',
        durationMs: 120,
        timestamp: new Date('2024-10-14T10:55:00')
      }]);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };
  const getSeverityColor = severity => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };
  const getMethodColor = method => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'blue';
      case 'POST':
        return 'green';
      case 'PUT':
        return 'orange';
      case 'DELETE':
        return 'red';
      default:
        return 'default';
    }
  };
  const getStatusColor = status => {
    if (status < 300) return 'success';
    if (status < 400) return 'processing';
    if (status < 500) return 'warning';
    return 'error';
  };
  const loginColumns = [{
    title: 'Username',
    dataIndex: 'username',
    key: 'username'
  }, {
    title: 'Status',
    dataIndex: 'success',
    key: 'success',
    render: success => /*#__PURE__*/_jsx(Tag, {
      color: success ? 'success' : 'error',
      children: success ? 'Success' : 'Failed'
    })
  }, {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ipAddress'
  }, {
    title: 'Location',
    dataIndex: 'location',
    key: 'location'
  }, {
    title: 'Device',
    dataIndex: 'device',
    key: 'device'
  }, {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: date => date.toLocaleString()
  }];
  const securityColumns = [{
    title: 'Event Type',
    dataIndex: 'eventType',
    key: 'eventType'
  }, {
    title: 'Severity',
    dataIndex: 'severity',
    key: 'severity',
    render: severity => /*#__PURE__*/_jsx(Tag, {
      color: getSeverityColor(severity),
      children: severity.toUpperCase()
    })
  }, {
    title: 'Description',
    dataIndex: 'description',
    key: 'description'
  }, {
    title: 'User',
    dataIndex: 'username',
    key: 'username',
    render: username => username || '-'
  }, {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ipAddress'
  }, {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: date => date.toLocaleString()
  }, {
    title: 'Action',
    key: 'action',
    render: (_, record) => /*#__PURE__*/_jsx(Button, {
      type: "link",
      icon: /*#__PURE__*/_jsx(EyeOutlined, {}),
      onClick: () => {
        setSelectedEvent(record);
        setDetailsVisible(true);
      },
      children: "Details"
    })
  }];
  const apiColumns = [{
    title: 'Method',
    dataIndex: 'method',
    key: 'method',
    render: method => /*#__PURE__*/_jsx(Tag, {
      color: getMethodColor(method),
      children: method
    })
  }, {
    title: 'Endpoint',
    dataIndex: 'endpoint',
    key: 'endpoint'
  }, {
    title: 'Status',
    dataIndex: 'statusCode',
    key: 'statusCode',
    render: status => /*#__PURE__*/_jsx(Tag, {
      color: getStatusColor(status),
      children: status
    })
  }, {
    title: 'User',
    dataIndex: 'username',
    key: 'username',
    render: username => username || '-'
  }, {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ipAddress'
  }, {
    title: 'Duration',
    dataIndex: 'durationMs',
    key: 'durationMs',
    render: ms => `${ms} ms`
  }, {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: date => date.toLocaleString()
  }];
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "text-2xl font-bold mb-6",
        children: "Security Audit"
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Failed Logins (24h)",
              value: overview.failedLoginAttempts24h,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(ExclamationCircleOutlined, {}),
              valueStyle: {
                color: overview.failedLoginAttempts24h > 100 ? '#cf1322' : undefined
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Suspicious IPs (24h)",
              value: overview.uniqueSuspiciousIps24h,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(WarningOutlined, {}),
              valueStyle: {
                color: overview.uniqueSuspiciousIps24h > 50 ? '#cf1322' : undefined
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Security Incidents (24h)",
              value: overview.securityIncidents24h,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(SafetyOutlined, {}),
              valueStyle: {
                color: overview.securityIncidents24h > 10 ? '#cf1322' : undefined
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "API Requests (24h)",
              value: overview.totalApiRequests24h,
              loading: loading,
              prefix: /*#__PURE__*/_jsx(ApiOutlined, {})
            })
          })
        })]
      }), /*#__PURE__*/_jsxs(Tabs, {
        defaultActiveKey: "1",
        children: [/*#__PURE__*/_jsx(Tabs.TabPane, {
          tab: "Login Attempts",
          children: /*#__PURE__*/_jsxs(Card, {
            children: [/*#__PURE__*/_jsx("div", {
              className: "mb-4",
              children: /*#__PURE__*/_jsxs(Space, {
                children: [/*#__PURE__*/_jsx(RangePicker, {}), /*#__PURE__*/_jsx(Input, {
                  placeholder: "Search by username or IP...",
                  value: searchText,
                  onChange: e => setSearchText(e.target.value),
                  style: {
                    width: 200
                  }
                }), /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  icon: /*#__PURE__*/_jsx(SearchOutlined, {}),
                  children: "Search"
                }), /*#__PURE__*/_jsxs(Radio.Group, {
                  value: loginFilter,
                  onChange: e => setLoginFilter(e.target.value),
                  children: [/*#__PURE__*/_jsx(Radio, {
                    value: "all",
                    children: "All"
                  }), /*#__PURE__*/_jsx(Radio, {
                    value: "failed",
                    children: "Failed Only"
                  }), /*#__PURE__*/_jsx(Radio, {
                    value: "suspicious",
                    children: "Suspicious"
                  })]
                })]
              })
            }), /*#__PURE__*/_jsx(Table, {
              dataSource: loginAttempts,
              columns: loginColumns,
              loading: loading,
              rowKey: "id"
            })]
          })
        }, "1"), /*#__PURE__*/_jsx(Tabs.TabPane, {
          tab: "Security Events",
          children: /*#__PURE__*/_jsxs(Card, {
            children: [/*#__PURE__*/_jsx("div", {
              className: "mb-4",
              children: /*#__PURE__*/_jsxs(Space, {
                children: [/*#__PURE__*/_jsx(RangePicker, {}), /*#__PURE__*/_jsxs(Select, {
                  value: severityFilter,
                  onChange: setSeverityFilter,
                  style: {
                    width: 120
                  },
                  children: [/*#__PURE__*/_jsx(Select.Option, {
                    value: "all",
                    children: "All Severities"
                  }), /*#__PURE__*/_jsx(Select.Option, {
                    value: "high",
                    children: "High"
                  }), /*#__PURE__*/_jsx(Select.Option, {
                    value: "medium",
                    children: "Medium"
                  }), /*#__PURE__*/_jsx(Select.Option, {
                    value: "low",
                    children: "Low"
                  })]
                }), /*#__PURE__*/_jsx(Input, {
                  placeholder: "Search events...",
                  value: searchText,
                  onChange: e => setSearchText(e.target.value),
                  style: {
                    width: 200
                  }
                }), /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  icon: /*#__PURE__*/_jsx(SearchOutlined, {}),
                  children: "Search"
                })]
              })
            }), /*#__PURE__*/_jsx(Table, {
              dataSource: securityEvents,
              columns: securityColumns,
              loading: loading,
              rowKey: "id"
            })]
          })
        }, "2"), /*#__PURE__*/_jsx(Tabs.TabPane, {
          tab: "API Usage",
          children: /*#__PURE__*/_jsxs(Card, {
            children: [/*#__PURE__*/_jsx("div", {
              className: "mb-4",
              children: /*#__PURE__*/_jsxs(Space, {
                children: [/*#__PURE__*/_jsx(RangePicker, {}), /*#__PURE__*/_jsxs(Select, {
                  placeholder: "Filter by endpoint",
                  allowClear: true,
                  style: {
                    width: 200
                  },
                  children: [/*#__PURE__*/_jsx(Select.Option, {
                    value: "/api/failures",
                    children: "GET /api/failures"
                  }), /*#__PURE__*/_jsx(Select.Option, {
                    value: "/api/squares",
                    children: "GET /api/squares"
                  })]
                }), /*#__PURE__*/_jsx(Input, {
                  placeholder: "Search by user or IP...",
                  value: searchText,
                  onChange: e => setSearchText(e.target.value),
                  style: {
                    width: 200
                  }
                }), /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  icon: /*#__PURE__*/_jsx(SearchOutlined, {}),
                  children: "Search"
                })]
              })
            }), /*#__PURE__*/_jsx(Table, {
              dataSource: apiUsage,
              columns: apiColumns,
              loading: loading,
              rowKey: "id"
            })]
          })
        }, "3")]
      }), /*#__PURE__*/_jsx(Modal, {
        title: "Event Details",
        open: detailsVisible,
        onCancel: () => setDetailsVisible(false),
        footer: null,
        width: 800,
        children: selectedEvent && /*#__PURE__*/_jsxs(Descriptions, {
          column: 1,
          bordered: true,
          children: [/*#__PURE__*/_jsx(Descriptions.Item, {
            label: "Event Type",
            children: selectedEvent.eventType
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "Severity",
            children: /*#__PURE__*/_jsx(Tag, {
              color: getSeverityColor(selectedEvent.severity),
              children: selectedEvent.severity.toUpperCase()
            })
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "Description",
            children: selectedEvent.description
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "User",
            children: selectedEvent.username || '-'
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "IP Address",
            children: selectedEvent.ipAddress
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "User Agent",
            children: selectedEvent.userAgent || '-'
          }), /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "Timestamp",
            children: selectedEvent.timestamp.toLocaleString()
          }), selectedEvent.context && /*#__PURE__*/_jsx(Descriptions.Item, {
            label: "Additional Context",
            children: /*#__PURE__*/_jsx("pre", {
              className: "whitespace-pre-wrap",
              children: JSON.stringify(selectedEvent.context, null, 2)
            })
          })]
        })
      })]
    })
  });
};
export default SecurityAuditPage;