import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Progress, Statistic, Tabs, Empty, Button, Avatar, Select, DatePicker, Row, Col, Skeleton, List, Tag, Tooltip, Descriptions, Pagination } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { usersService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const {
  RangePicker
} = DatePicker;
const MeritHistoryPage = () => {
  const {
    navigateToTab
  } = useTabNavigation();
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overallMeritScore] = useState(0.75);
  const [meritComponents] = useState({
    clarity: 0.82,
    novelty: 0.68,
    contribution: 0.75,
    rigor: 0.71,
    reproducibility: 0.79,
    civility: 0.91
  });
  const [stats] = useState({
    exceptionalCount: 3,
    highestScore: 94,
    averageScore: 75,
    totalContributions: 27
  });
  const [meritBadges] = useState([]);
  const [meritHistory, setMeritHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  useEffect(() => {
    loadData();
  }, [currentPage, contentTypeFilter, sortOrder]);
  const loadData = async () => {
    try {
      setLoading(true);
      const history = await usersService.getUserMeritHistory(user?.username || '', currentPage, pageSize);
      const mappedHistory = history.map(item => ({
        id: item.id,
        contentId: item.contentId,
        contentType: item.contentType,
        contentTitle: item.contentTitle,
        failureId: item.failureId,
        score: item.score,
        components: {
          clarity: item.components.clarity,
          novelty: item.components.novelty,
          contribution: item.components.contribution,
          rigor: item.components.rigor,
          reproducibility: item.components.reproducibility,
          civility: item.components.civility
        },
        modelVersion: item.modelVersion,
        evaluatedAt: new Date(item.evaluatedAt),
        isRecalculation: item.isRecalculation,
        recalculationReason: item.recalculationReason
      }));
      setMeritHistory(mappedHistory);
      setTotalItems(mappedHistory.length);
    } catch (err) {
      console.error('Error loading merit data:', err);
      setMeritHistory([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  const formatScore = score => {
    return (score * 100).toFixed(0);
  };
  const getOverallStatus = () => {
    if (overallMeritScore >= 0.8) return 'success';
    if (overallMeritScore >= 0.6) return 'normal';
    return 'exception';
  };
  const getComponentStatus = score => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'normal';
    return 'exception';
  };
  const getContentTypeLabel = type => {
    return type === 'failure' ? 'Failure Documentation' : 'Comment';
  };
  const getContentUrl = item => {
    if (item.contentType === 'failure') {
      return `/failures/${item.contentId}`;
    }
    return `/failures/${item.failureId}#comment-${item.contentId}`;
  };
  const handlePageChange = page => {
    setCurrentPage(page);
  };
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "text-2xl font-bold mb-6",
        children: "Your Merit Score History"
      }), /*#__PURE__*/_jsx("div", {
        className: "mb-8",
        children: /*#__PURE__*/_jsx(Card, {
          children: /*#__PURE__*/_jsxs("div", {
            className: "flex items-start",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "w-1/3 pr-8 border-r",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "text-center",
                children: [/*#__PURE__*/_jsx(Progress, {
                  type: "circle",
                  percent: overallMeritScore * 100,
                  status: getOverallStatus(),
                  format: percent => `${percent?.toFixed(0)}`
                }), /*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-medium mt-3",
                  children: "Overall Merit Score"
                }), /*#__PURE__*/_jsx("p", {
                  className: "text-gray-500",
                  children: "Based on your last 30 days of contributions"
                })]
              }), /*#__PURE__*/_jsx("div", {
                className: "mt-6",
                children: Object.entries(meritComponents).map(([key, value]) => /*#__PURE__*/_jsxs("div", {
                  className: "mb-3",
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex justify-between mb-1",
                    children: [/*#__PURE__*/_jsxs("span", {
                      className: "capitalize",
                      children: [key, ":"]
                    }), /*#__PURE__*/_jsx("span", {
                      children: formatScore(value)
                    })]
                  }), /*#__PURE__*/_jsx(Progress, {
                    percent: value * 100,
                    size: "small",
                    showInfo: false,
                    status: getComponentStatus(value)
                  })]
                }, key))
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "w-2/3 pl-8",
              children: /*#__PURE__*/_jsxs(Tabs, {
                defaultActiveKey: "stats",
                children: [/*#__PURE__*/_jsxs(Tabs.TabPane, {
                  tab: "Statistics",
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "grid grid-cols-2 gap-4 mb-4",
                    children: [/*#__PURE__*/_jsx(Card, {
                      children: /*#__PURE__*/_jsx(Statistic, {
                        title: "Exceptional Contributions (90+)",
                        value: stats.exceptionalCount,
                        suffix: "failures/comments",
                        valueStyle: {
                          color: '#52c41a'
                        }
                      })
                    }), /*#__PURE__*/_jsx(Card, {
                      children: /*#__PURE__*/_jsx(Statistic, {
                        title: "Highest Score",
                        value: stats.highestScore,
                        precision: 0,
                        suffix: "%",
                        valueStyle: {
                          color: '#1890ff'
                        }
                      })
                    }), /*#__PURE__*/_jsx(Card, {
                      children: /*#__PURE__*/_jsx(Statistic, {
                        title: "Average Merit Score",
                        value: stats.averageScore,
                        precision: 0,
                        suffix: "%"
                      })
                    }), /*#__PURE__*/_jsx(Card, {
                      children: /*#__PURE__*/_jsx(Statistic, {
                        title: "Total Evaluated Contributions",
                        value: stats.totalContributions,
                        suffix: "items"
                      })
                    })]
                  }), /*#__PURE__*/_jsxs("div", {
                    children: [/*#__PURE__*/_jsx("h3", {
                      className: "text-lg font-medium mb-4",
                      children: "Merit Score Trend"
                    }), /*#__PURE__*/_jsx("div", {
                      className: "bg-gray-50 p-8 rounded text-center text-gray-500",
                      children: "Merit score trend chart will be displayed here"
                    })]
                  })]
                }, "stats"), /*#__PURE__*/_jsx(Tabs.TabPane, {
                  tab: "Merit Badges",
                  children: meritBadges.length === 0 ? /*#__PURE__*/_jsx(Empty, {
                    description: "You haven't earned any merit badges yet",
                    image: Empty.PRESENTED_IMAGE_SIMPLE,
                    children: /*#__PURE__*/_jsx(Button, {
                      type: "primary",
                      onClick: () => navigateToTab('/submit', 'Document Failure', {
                        closable: true
                      }),
                      children: "Create high-quality content to earn badges"
                    })
                  }) : /*#__PURE__*/_jsx("div", {
                    className: "grid grid-cols-3 gap-4",
                    children: meritBadges.map((badge, index) => /*#__PURE__*/_jsxs(Card, {
                      className: "text-center",
                      children: [/*#__PURE__*/_jsx(Avatar, {
                        shape: "square",
                        size: "large",
                        src: badge.iconUrl,
                        children: badge.name[0]
                      }), /*#__PURE__*/_jsxs("div", {
                        className: "mt-2",
                        children: [/*#__PURE__*/_jsx("h4", {
                          className: "font-medium",
                          children: badge.name
                        }), /*#__PURE__*/_jsx("p", {
                          className: "text-sm text-gray-500",
                          children: badge.description
                        }), /*#__PURE__*/_jsxs("p", {
                          className: "text-xs text-gray-400",
                          children: ["Earned on ", badge.earnedAt.toLocaleDateString()]
                        })]
                      })]
                    }, index))
                  })
                }, "badges")]
              })
            })]
          })
        })
      }), /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx("h2", {
          className: "text-xl font-bold mb-4",
          children: "Recent Merit Evaluations"
        }), /*#__PURE__*/_jsx("div", {
          className: "mb-4",
          children: /*#__PURE__*/_jsxs(Row, {
            gutter: 16,
            children: [/*#__PURE__*/_jsx(Col, {
              span: 8,
              children: /*#__PURE__*/_jsxs(Select, {
                defaultValue: "all",
                style: {
                  width: '100%'
                },
                onChange: value => {
                  setContentTypeFilter(value);
                  setCurrentPage(1);
                },
                children: [/*#__PURE__*/_jsx(Select.Option, {
                  value: "all",
                  children: "All Content Types"
                }), /*#__PURE__*/_jsx(Select.Option, {
                  value: "failure",
                  children: "Failure Documentation"
                }), /*#__PURE__*/_jsx(Select.Option, {
                  value: "comment",
                  children: "Comments"
                })]
              })
            }), /*#__PURE__*/_jsx(Col, {
              span: 8,
              children: /*#__PURE__*/_jsx(RangePicker, {
                style: {
                  width: '100%'
                },
                onChange: () => {
                  setCurrentPage(1);
                }
              })
            }), /*#__PURE__*/_jsx(Col, {
              span: 8,
              children: /*#__PURE__*/_jsxs(Select, {
                defaultValue: "date-desc",
                style: {
                  width: '100%'
                },
                onChange: value => {
                  setSortOrder(value);
                  setCurrentPage(1);
                },
                children: [/*#__PURE__*/_jsx(Select.Option, {
                  value: "date-desc",
                  children: "Newest First"
                }), /*#__PURE__*/_jsx(Select.Option, {
                  value: "date-asc",
                  children: "Oldest First"
                }), /*#__PURE__*/_jsx(Select.Option, {
                  value: "score-desc",
                  children: "Highest Score First"
                }), /*#__PURE__*/_jsx(Select.Option, {
                  value: "score-asc",
                  children: "Lowest Score First"
                })]
              })
            })]
          })
        }), loading ? /*#__PURE__*/_jsx("div", {
          children: [...Array(3)].map((_, i) => /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            paragraph: {
              rows: 4
            },
            className: "mb-4"
          }, i))
        }) : meritHistory.length === 0 ? /*#__PURE__*/_jsx(Empty, {
          description: "No merit evaluations found for the selected filters",
          image: Empty.PRESENTED_IMAGE_SIMPLE
        }) : /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(List, {
            dataSource: meritHistory,
            itemLayout: "vertical",
            renderItem: item => /*#__PURE__*/_jsx(List.Item, {
              children: /*#__PURE__*/_jsxs("div", {
                className: "flex items-start space-x-4",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "flex-shrink-0",
                  children: /*#__PURE__*/_jsx(Progress, {
                    type: "circle",
                    percent: item.score * 100,
                    width: 80,
                    status: getComponentStatus(item.score),
                    format: percent => /*#__PURE__*/_jsxs("div", {
                      className: "text-center",
                      children: [/*#__PURE__*/_jsx("div", {
                        className: "text-xl font-bold",
                        children: percent?.toFixed(0)
                      }), /*#__PURE__*/_jsx("div", {
                        className: "text-xs text-gray-500",
                        children: "Merit"
                      })]
                    })
                  })
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex-grow min-w-0",
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex items-center space-x-2",
                    children: [/*#__PURE__*/_jsx("span", {
                      className: "text-gray-500",
                      children: getContentTypeLabel(item.contentType)
                    }), /*#__PURE__*/_jsx("span", {
                      className: "text-gray-400",
                      children: "\u2022"
                    }), /*#__PURE__*/_jsx("span", {
                      className: "text-gray-500",
                      children: item.evaluatedAt.toLocaleString()
                    }), item.isRecalculation && /*#__PURE__*/_jsxs(_Fragment, {
                      children: [/*#__PURE__*/_jsx("span", {
                        className: "text-gray-400",
                        children: "\u2022"
                      }), /*#__PURE__*/_jsx(Tag, {
                        color: "purple",
                        children: "Recalculated"
                      }), /*#__PURE__*/_jsx(Tooltip, {
                        title: item.recalculationReason,
                        children: /*#__PURE__*/_jsx(InfoCircleOutlined, {
                          className: "text-gray-400"
                        })
                      })]
                    })]
                  }), /*#__PURE__*/_jsx("div", {
                    className: "mt-2",
                    children: /*#__PURE__*/_jsx("a", {
                      href: "#",
                      onClick: e => {
                        e.preventDefault();
                        navigateToTab(getContentUrl(item), item.contentTitle, {
                          closable: true
                        });
                      },
                      className: "text-lg font-medium hover:text-blue-500",
                      children: item.contentTitle
                    })
                  }), /*#__PURE__*/_jsx("div", {
                    className: "mt-2",
                    children: /*#__PURE__*/_jsx(Card, {
                      size: "small",
                      className: "bg-gray-50",
                      children: /*#__PURE__*/_jsxs(Descriptions, {
                        size: "small",
                        column: 3,
                        children: [/*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Clarity",
                          children: formatScore(item.components.clarity)
                        }), /*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Novelty",
                          children: formatScore(item.components.novelty)
                        }), /*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Contribution",
                          children: formatScore(item.components.contribution)
                        }), /*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Rigor",
                          children: formatScore(item.components.rigor)
                        }), /*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Reproducibility",
                          children: formatScore(item.components.reproducibility)
                        }), /*#__PURE__*/_jsx(Descriptions.Item, {
                          label: "Civility",
                          children: formatScore(item.components.civility)
                        })]
                      })
                    })
                  })]
                })]
              })
            })
          }), /*#__PURE__*/_jsx("div", {
            className: "flex justify-center mt-4",
            children: /*#__PURE__*/_jsx(Pagination, {
              current: currentPage,
              total: totalItems,
              pageSize: pageSize,
              onChange: handlePageChange
            })
          })]
        })]
      })]
    })
  });
};
export default MeritHistoryPage;