import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Spin, Select, DatePicker, Row, Col, Statistic } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  RangePicker
} = DatePicker;
const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [failuresByDomain, setFailuresByDomain] = useState([]);
  const [meritTrend, setMeritTrend] = useState([]);
  const [failureModes, setFailureModes] = useState([]);
  const [stats, setStats] = useState({
    totalFailures: 0,
    avgMeritScore: 0,
    resurrectionRate: 0,
    activeContributors: 0
  });
  useEffect(() => {
    loadAnalyticsData();
  }, [timeFrame]);
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API calls
      // const response = await fetch(`/api/analytics?timeFrame=${timeFrame}`);
      // const data = await response.json();

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats({
        totalFailures: 342,
        avgMeritScore: 0.76,
        resurrectionRate: 0.08,
        activeContributors: 127
      });
      setFailuresByDomain([{
        domain: 'Machine Learning',
        count: 85,
        avgMeritScore: 0.82
      }, {
        domain: 'Quantum Computing',
        count: 42,
        avgMeritScore: 0.79
      }, {
        domain: 'Distributed Systems',
        count: 67,
        avgMeritScore: 0.74
      }, {
        domain: 'Cryptography',
        count: 38,
        avgMeritScore: 0.81
      }, {
        domain: 'Robotics',
        count: 51,
        avgMeritScore: 0.73
      }, {
        domain: 'Blockchain',
        count: 29,
        avgMeritScore: 0.68
      }, {
        domain: 'Computer Vision',
        count: 30,
        avgMeritScore: 0.77
      }]);
      setMeritTrend([{
        date: '2024-04',
        avgMerit: 0.72,
        totalFailures: 45
      }, {
        date: '2024-05',
        avgMerit: 0.74,
        totalFailures: 52
      }, {
        date: '2024-06',
        avgMerit: 0.73,
        totalFailures: 48
      }, {
        date: '2024-07',
        avgMerit: 0.76,
        totalFailures: 58
      }, {
        date: '2024-08',
        avgMerit: 0.78,
        totalFailures: 62
      }, {
        date: '2024-09',
        avgMerit: 0.77,
        totalFailures: 67
      }, {
        date: '2024-10',
        avgMerit: 0.76,
        totalFailures: 72
      }]);
      setFailureModes([{
        mode: 'Computational Complexity',
        count: 78
      }, {
        mode: 'Memory Constraints',
        count: 64
      }, {
        mode: 'Hardware Limitations',
        count: 52
      }, {
        mode: 'Theoretical Limitation',
        count: 45
      }, {
        mode: 'Scalability Issues',
        count: 38
      }, {
        mode: 'Network Latency',
        count: 32
      }, {
        mode: 'Implementation Difficulty',
        count: 33
      }]);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex justify-between items-center mb-6",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "text-2xl font-bold",
          children: "Platform Analytics"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex space-x-4",
          children: [/*#__PURE__*/_jsxs(Select, {
            value: timeFrame,
            onChange: setTimeFrame,
            style: {
              width: 120
            },
            children: [/*#__PURE__*/_jsx(Select.Option, {
              value: "weekly",
              children: "Weekly"
            }), /*#__PURE__*/_jsx(Select.Option, {
              value: "monthly",
              children: "Monthly"
            }), /*#__PURE__*/_jsx(Select.Option, {
              value: "quarterly",
              children: "Quarterly"
            }), /*#__PURE__*/_jsx(Select.Option, {
              value: "yearly",
              children: "Yearly"
            })]
          }), /*#__PURE__*/_jsx(RangePicker, {})]
        })]
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Total Failures Documented",
              value: stats.totalFailures,
              loading: loading
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Average Merit Score",
              value: stats.avgMeritScore,
              precision: 2,
              loading: loading,
              valueStyle: {
                color: '#3f8600'
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Resurrection Rate",
              value: stats.resurrectionRate * 100,
              precision: 1,
              suffix: "%",
              loading: loading,
              valueStyle: {
                color: '#1890ff'
              }
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 6,
          children: /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Statistic, {
              title: "Active Contributors",
              value: stats.activeContributors,
              loading: loading
            })
          })
        })]
      }), /*#__PURE__*/_jsx(Card, {
        title: "Merit Score & Documentation Trend",
        className: "mb-6",
        children: loading ? /*#__PURE__*/_jsx("div", {
          className: "flex justify-center p-8",
          children: /*#__PURE__*/_jsx(Spin, {
            size: "large"
          })
        }) : /*#__PURE__*/_jsx(ResponsiveContainer, {
          width: "100%",
          height: 300,
          children: /*#__PURE__*/_jsxs(LineChart, {
            data: meritTrend,
            children: [/*#__PURE__*/_jsx(CartesianGrid, {
              strokeDasharray: "3 3"
            }), /*#__PURE__*/_jsx(XAxis, {
              dataKey: "date"
            }), /*#__PURE__*/_jsx(YAxis, {
              yAxisId: "left",
              domain: [0, 1]
            }), /*#__PURE__*/_jsx(YAxis, {
              yAxisId: "right",
              orientation: "right"
            }), /*#__PURE__*/_jsx(Tooltip, {}), /*#__PURE__*/_jsx(Legend, {}), /*#__PURE__*/_jsx(Line, {
              yAxisId: "left",
              type: "monotone",
              dataKey: "avgMerit",
              stroke: "#8884d8",
              name: "Avg Merit Score",
              strokeWidth: 2
            }), /*#__PURE__*/_jsx(Line, {
              yAxisId: "right",
              type: "monotone",
              dataKey: "totalFailures",
              stroke: "#82ca9d",
              name: "Total Failures",
              strokeWidth: 2
            })]
          })
        })
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Col, {
          span: 14,
          children: /*#__PURE__*/_jsx(Card, {
            title: "Failures by Domain",
            children: loading ? /*#__PURE__*/_jsx("div", {
              className: "flex justify-center p-8",
              children: /*#__PURE__*/_jsx(Spin, {
                size: "large"
              })
            }) : /*#__PURE__*/_jsx(ResponsiveContainer, {
              width: "100%",
              height: 350,
              children: /*#__PURE__*/_jsxs(BarChart, {
                data: failuresByDomain,
                children: [/*#__PURE__*/_jsx(CartesianGrid, {
                  strokeDasharray: "3 3"
                }), /*#__PURE__*/_jsx(XAxis, {
                  dataKey: "domain",
                  angle: -45,
                  textAnchor: "end",
                  height: 100
                }), /*#__PURE__*/_jsx(YAxis, {
                  yAxisId: "left"
                }), /*#__PURE__*/_jsx(YAxis, {
                  yAxisId: "right",
                  orientation: "right",
                  domain: [0, 1]
                }), /*#__PURE__*/_jsx(Tooltip, {}), /*#__PURE__*/_jsx(Legend, {}), /*#__PURE__*/_jsx(Bar, {
                  yAxisId: "left",
                  dataKey: "count",
                  fill: "#8884d8",
                  name: "Count"
                }), /*#__PURE__*/_jsx(Bar, {
                  yAxisId: "right",
                  dataKey: "avgMeritScore",
                  fill: "#82ca9d",
                  name: "Avg Merit"
                })]
              })
            })
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 10,
          children: /*#__PURE__*/_jsx(Card, {
            title: "Common Failure Modes",
            children: loading ? /*#__PURE__*/_jsx("div", {
              className: "flex justify-center p-8",
              children: /*#__PURE__*/_jsx(Spin, {
                size: "large"
              })
            }) : /*#__PURE__*/_jsx(ResponsiveContainer, {
              width: "100%",
              height: 350,
              children: /*#__PURE__*/_jsxs(PieChart, {
                children: [/*#__PURE__*/_jsx(Pie, {
                  data: failureModes.map(fm => ({
                    name: fm.mode,
                    value: fm.count
                  })),
                  cx: "50%",
                  cy: "50%",
                  labelLine: false,
                  label: entry => `${entry.name.split(' ')[0]} ${((entry.percent || 0) * 100).toFixed(0)}%`,
                  outerRadius: 80,
                  fill: "#8884d8",
                  dataKey: "value",
                  children: failureModes.map((_entry, index) => /*#__PURE__*/_jsx(Cell, {
                    fill: COLORS[index % COLORS.length]
                  }, `cell-${index}`))
                }), /*#__PURE__*/_jsx(Tooltip, {})]
              })
            })
          })
        })]
      }), /*#__PURE__*/_jsx(Card, {
        title: "Key Insights",
        className: "mb-6",
        children: /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-blue-50 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-blue-900 mb-2",
              children: "Most Active Domain: Machine Learning"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-sm text-blue-700",
              children: "85 failures documented with an average merit score of 82%. This domain shows strong community engagement and high-quality documentation."
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-green-50 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-green-900 mb-2",
              children: "Resurrection Success: 8% Revival Rate"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-sm text-green-700",
              children: "27 previously failed approaches have been successfully revived with new techniques or hardware, validating the platform's core value proposition."
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "p-4 bg-purple-50 rounded",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-purple-900 mb-2",
              children: "Quality Improvement Trend"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-sm text-purple-700",
              children: "Average merit scores have increased by 6% over the past 6 months, indicating improving documentation quality as the community matures."
            })]
          })]
        })
      })]
    })
  });
};
export default AnalyticsPage;