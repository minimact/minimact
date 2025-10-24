import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Table, Tag, Input, Button, Space, DatePicker, Select, Drawer, Descriptions, Radio } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, EyeOutlined, BugOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  RangePicker
} = DatePicker;
const LogListPage = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  useEffect(() => {
    loadLogs();
  }, []);
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);
  useEffect(() => {
    filterLogs();
  }, [logs, searchText, levelFilter, sourceFilter]);
  const loadLogs = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockLogs = [{
        id: '1',
        timestamp: new Date('2024-10-14T11:30:00'),
        level: 'error',
        source: 'Database',
        message: 'Connection timeout while executing query',
        username: 'system',
        requestPath: '/api/failures',
        stackTrace: 'at Database.ExecuteQuery()\nat FailureController.GetAll()'
      }, {
        id: '2',
        timestamp: new Date('2024-10-14T11:28:00'),
        level: 'warning',
        source: 'Authentication',
        message: 'Multiple failed login attempts detected',
        username: 'testuser',
        ipAddress: '192.168.1.100',
        context: {
          attemptCount: 5,
          timeWindow: '5 minutes'
        }
      }, {
        id: '3',
        timestamp: new Date('2024-10-14T11:25:00'),
        level: 'info',
        source: 'API',
        message: 'User submitted new failure documentation',
        username: 'alice',
        ipAddress: '10.0.0.5',
        requestPath: '/api/failures'
      }, {
        id: '4',
        timestamp: new Date('2024-10-14T11:20:00'),
        level: 'debug',
        source: 'Cache',
        message: 'Cache miss for key: square_list_page_1',
        context: {
          key: 'square_list_page_1',
          ttl: 300
        }
      }, {
        id: '5',
        timestamp: new Date('2024-10-14T11:15:00'),
        level: 'error',
        source: 'Merit Calculation',
        message: 'Failed to calculate merit score for failure #1234',
        stackTrace: 'at MeritService.Calculate()\nat FailureService.UpdateMerit()'
      }, {
        id: '6',
        timestamp: new Date('2024-10-14T11:10:00'),
        level: 'warning',
        source: 'Storage',
        message: 'Disk usage exceeded 80% threshold',
        context: {
          currentUsage: 85.3,
          threshold: 80
        }
      }, {
        id: '7',
        timestamp: new Date('2024-10-14T11:05:00'),
        level: 'info',
        source: 'Email',
        message: 'Verification email sent successfully',
        username: 'bob',
        context: {
          emailType: 'verification',
          recipient: 'bob@example.com'
        }
      }, {
        id: '8',
        timestamp: new Date('2024-10-14T11:00:00'),
        level: 'debug',
        source: 'Search',
        message: 'Elasticsearch query executed',
        context: {
          query: 'neural networks',
          results: 42,
          durationMs: 123
        }
      }];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };
  const filterLogs = () => {
    let filtered = logs;

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }

    // Search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(log => log.message.toLowerCase().includes(searchLower) || log.source.toLowerCase().includes(searchLower) || log.username?.toLowerCase().includes(searchLower) || log.ipAddress?.toLowerCase().includes(searchLower));
    }
    setFilteredLogs(filtered);
  };
  const getLevelColor = level => {
    switch (level) {
      case 'debug':
        return 'default';
      case 'info':
        return 'blue';
      case 'warning':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'default';
    }
  };
  const getLevelIcon = level => {
    switch (level) {
      case 'debug':
        return /*#__PURE__*/_jsx(BugOutlined, {});
      case 'info':
        return /*#__PURE__*/_jsx(InfoCircleOutlined, {});
      case 'warning':
        return /*#__PURE__*/_jsx(WarningOutlined, {});
      case 'error':
        return /*#__PURE__*/_jsx(CloseCircleOutlined, {});
      default:
        return null;
    }
  };
  const handleExportLogs = () => {
    // TODO: Implement log export functionality
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const uniqueSources = Array.from(new Set(logs.map(log => log.source))).sort();
  const columns = [{
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 180,
    render: date => date.toLocaleString(),
    sorter: (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    defaultSortOrder: 'descend'
  }, {
    title: 'Level',
    dataIndex: 'level',
    key: 'level',
    width: 100,
    render: level => /*#__PURE__*/_jsx(Tag, {
      color: getLevelColor(level),
      icon: getLevelIcon(level),
      children: level.toUpperCase()
    }),
    filters: [{
      text: 'Debug',
      value: 'debug'
    }, {
      text: 'Info',
      value: 'info'
    }, {
      text: 'Warning',
      value: 'warning'
    }, {
      text: 'Error',
      value: 'error'
    }],
    onFilter: (value, record) => record.level === value
  }, {
    title: 'Source',
    dataIndex: 'source',
    key: 'source',
    width: 150,
    filters: uniqueSources.map(source => ({
      text: source,
      value: source
    })),
    onFilter: (value, record) => record.source === value
  }, {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
    ellipsis: true
  }, {
    title: 'User',
    dataIndex: 'username',
    key: 'username',
    width: 120,
    render: username => username || '-'
  }, {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 140,
    render: ip => ip || '-'
  }, {
    title: 'Action',
    key: 'action',
    width: 100,
    render: (_, record) => /*#__PURE__*/_jsx(Button, {
      type: "link",
      icon: /*#__PURE__*/_jsx(EyeOutlined, {}),
      onClick: () => {
        setSelectedLog(record);
        setDrawerVisible(true);
      },
      children: "Details"
    })
  }];
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex justify-between items-center mb-6",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "text-2xl font-bold",
          children: "System Logs"
        }), /*#__PURE__*/_jsxs(Space, {
          children: [/*#__PURE__*/_jsxs(Radio.Group, {
            value: autoRefresh,
            onChange: e => setAutoRefresh(e.target.value),
            children: [/*#__PURE__*/_jsx(Radio.Button, {
              value: false,
              children: "Manual"
            }), /*#__PURE__*/_jsx(Radio.Button, {
              value: true,
              children: "Auto Refresh"
            })]
          }), /*#__PURE__*/_jsx(Button, {
            icon: /*#__PURE__*/_jsx(ReloadOutlined, {}),
            onClick: loadLogs,
            loading: loading,
            children: "Refresh"
          }), /*#__PURE__*/_jsx(Button, {
            icon: /*#__PURE__*/_jsx(DownloadOutlined, {}),
            onClick: handleExportLogs,
            children: "Export"
          })]
        })]
      }), /*#__PURE__*/_jsxs(Card, {
        children: [/*#__PURE__*/_jsx("div", {
          className: "mb-4",
          children: /*#__PURE__*/_jsxs(Space, {
            wrap: true,
            children: [/*#__PURE__*/_jsx(RangePicker, {
              showTime: true
            }), /*#__PURE__*/_jsxs(Select, {
              value: levelFilter,
              onChange: setLevelFilter,
              style: {
                width: 140
              },
              children: [/*#__PURE__*/_jsx(Select.Option, {
                value: "all",
                children: "All Levels"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "debug",
                children: "Debug"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "info",
                children: "Info"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "warning",
                children: "Warning"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "error",
                children: "Error"
              })]
            }), /*#__PURE__*/_jsxs(Select, {
              value: sourceFilter,
              onChange: setSourceFilter,
              style: {
                width: 160
              },
              children: [/*#__PURE__*/_jsx(Select.Option, {
                value: "all",
                children: "All Sources"
              }), uniqueSources.map(source => /*#__PURE__*/_jsx(Select.Option, {
                value: source,
                children: source
              }, source))]
            }), /*#__PURE__*/_jsx(Input, {
              placeholder: "Search logs...",
              value: searchText,
              onChange: e => setSearchText(e.target.value),
              style: {
                width: 250
              },
              prefix: /*#__PURE__*/_jsx(SearchOutlined, {})
            })]
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "mb-2 text-sm text-gray-500",
          children: ["Showing ", filteredLogs.length, " of ", logs.length, " logs"]
        }), /*#__PURE__*/_jsx(Table, {
          dataSource: filteredLogs,
          columns: columns,
          loading: loading,
          rowKey: "id",
          pagination: {
            defaultPageSize: 50,
            showSizeChanger: true,
            showTotal: total => `Total ${total} logs`
          },
          scroll: {
            x: 1200
          }
        })]
      }), /*#__PURE__*/_jsx(Drawer, {
        title: "Log Details",
        placement: "right",
        onClose: () => setDrawerVisible(false),
        open: drawerVisible,
        width: 600,
        children: selectedLog && /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [/*#__PURE__*/_jsxs(Descriptions, {
            column: 1,
            bordered: true,
            children: [/*#__PURE__*/_jsx(Descriptions.Item, {
              label: "Timestamp",
              children: selectedLog.timestamp.toLocaleString()
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "Level",
              children: /*#__PURE__*/_jsx(Tag, {
                color: getLevelColor(selectedLog.level),
                icon: getLevelIcon(selectedLog.level),
                children: selectedLog.level.toUpperCase()
              })
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "Source",
              children: selectedLog.source
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "Message",
              children: selectedLog.message
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "User",
              children: selectedLog.username || '-'
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "IP Address",
              children: selectedLog.ipAddress || '-'
            }), /*#__PURE__*/_jsx(Descriptions.Item, {
              label: "Request Path",
              children: selectedLog.requestPath || '-'
            })]
          }), selectedLog.stackTrace && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-medium mb-2",
              children: "Stack Trace"
            }), /*#__PURE__*/_jsx("pre", {
              className: "bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap",
              children: selectedLog.stackTrace
            })]
          }), selectedLog.context && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-lg font-medium mb-2",
              children: "Additional Context"
            }), /*#__PURE__*/_jsx("pre", {
              className: "bg-gray-100 p-4 rounded text-xs overflow-x-auto",
              children: JSON.stringify(selectedLog.context, null, 2)
            })]
          })]
        })
      })]
    })
  });
};
export default LogListPage;