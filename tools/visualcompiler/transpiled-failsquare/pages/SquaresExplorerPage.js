import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Input, Select, Tabs, Slider, Empty, Skeleton, Pagination, Button, Avatar, Row, Col, Result } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { squaresService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  TabPane
} = Tabs;
const SquaresExplorerPage = () => {
  const {
    navigateToTab
  } = useTabNavigation();
  const {
    isAuthenticated
  } = useAuth();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [sortBy, setSortBy] = useState('merit');
  const [meritThreshold, setMeritThreshold] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Data
  const [squares, setSquares] = useState([]);
  const [followedSquares, setFollowedSquares] = useState([]);
  const [createdSquares, setCreatedSquares] = useState([]);
  const [followedSquareIds, setFollowedSquareIds] = useState(new Set());
  const availableDomains = ['Machine Learning', 'Quantum Computing', 'Distributed Systems', 'Cryptography', 'Computer Vision', 'Natural Language Processing', 'Robotics', 'Blockchain', 'Bioinformatics', 'Hardware Design'];
  useEffect(() => {
    loadSquares();
    if (isAuthenticated) {
      loadUserSquares();
    }
  }, [searchQuery, selectedDomains, sortBy, meritThreshold, currentPage]);
  const loadSquares = async () => {
    setIsLoading(true);
    try {
      if (sortBy === 'trending') {
        const apiSquares = await squaresService.getTrendingSquares(pageSize);
        setSquares(apiSquares);
        setTotalItems(apiSquares.length);
      } else {
        const apiSquares = await squaresService.getSquares(currentPage, pageSize);
        setSquares(apiSquares.items);
        setTotalItems(apiSquares.totalCount);
      }
    } catch (error) {
      console.error('Error loading squares:', error);
      setSquares([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };
  const loadUserSquares = async () => {
    try {
      const followed = await squaresService.getFollowedSquares();
      setFollowedSquares(followed);
      setFollowedSquareIds(new Set(followed.map(s => s.id)));
      setCreatedSquares([]);
    } catch (error) {
      console.error('Error loading user squares:', error);
      setFollowedSquares([]);
      setCreatedSquares([]);
      setFollowedSquareIds(new Set());
    }
  };
  const handleFollowSquare = async squareId => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
    try {
      const newFollowedIds = new Set(followedSquareIds);
      if (newFollowedIds.has(squareId)) {
        await squaresService.unfollowSquare(squareId);
        newFollowedIds.delete(squareId);
      } else {
        await squaresService.followSquare(squareId);
        newFollowedIds.add(squareId);
      }
      setFollowedSquareIds(newFollowedIds);
    } catch (error) {
      console.error('Error toggling square follow:', error);
    }
  };
  return /*#__PURE__*/_jsxs(MainLayout, {
    children: [/*#__PURE__*/_jsx("div", {
      className: "mb-8",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-center justify-between",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h1", {
            className: "text-2xl font-bold",
            children: "Explore Squares"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-gray-500",
            children: "Discover domain-based communities where failure knowledge grows"
          })]
        }), /*#__PURE__*/_jsx(Button, {
          type: "primary",
          icon: /*#__PURE__*/_jsx(PlusOutlined, {}),
          onClick: () => navigateToTab('/squares/create', 'Create Square'),
          children: "Create Square"
        })]
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "mb-6",
      children: /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        children: [/*#__PURE__*/_jsx(Col, {
          span: 16,
          children: /*#__PURE__*/_jsx(Input, {
            placeholder: "Search squares by name, description, or domain...",
            size: "large",
            value: searchQuery,
            onChange: e => setSearchQuery(e.target.value),
            allowClear: true,
            suffix: /*#__PURE__*/_jsx(SearchOutlined, {})
          })
        }), /*#__PURE__*/_jsx(Col, {
          span: 8,
          children: /*#__PURE__*/_jsx(Select, {
            mode: "multiple",
            style: {
              width: '100%'
            },
            placeholder: "Filter by domain",
            value: selectedDomains,
            onChange: setSelectedDomains,
            allowClear: true,
            options: availableDomains.map(domain => ({
              label: domain,
              value: domain
            }))
          })
        })]
      })
    }), /*#__PURE__*/_jsxs(Row, {
      gutter: 24,
      children: [/*#__PURE__*/_jsxs(Col, {
        span: 6,
        children: [/*#__PURE__*/_jsx(Card, {
          className: "mb-4",
          children: /*#__PURE__*/_jsxs(Tabs, {
            activeKey: sortBy,
            tabPosition: "left",
            onChange: key => setSortBy(key),
            children: [/*#__PURE__*/_jsx(TabPane, {
              tab: "Highest Merit",
              children: /*#__PURE__*/_jsx("p", {
                className: "text-gray-500 text-sm",
                children: "Squares ranked by average Merit Score"
              })
            }, "merit"), /*#__PURE__*/_jsx(TabPane, {
              tab: "Trending",
              children: /*#__PURE__*/_jsx("p", {
                className: "text-gray-500 text-sm",
                children: "Squares with recent activity and growth"
              })
            }, "trending"), /*#__PURE__*/_jsx(TabPane, {
              tab: "Newest",
              children: /*#__PURE__*/_jsx("p", {
                className: "text-gray-500 text-sm",
                children: "Recently created squares"
              })
            }, "newest"), /*#__PURE__*/_jsx(TabPane, {
              tab: "Most Active",
              children: /*#__PURE__*/_jsx("p", {
                className: "text-gray-500 text-sm",
                children: "Squares with the most failures documented"
              })
            }, "active"), /*#__PURE__*/_jsx(TabPane, {
              tab: "Most Resurrected",
              children: /*#__PURE__*/_jsx("p", {
                className: "text-gray-500 text-sm",
                children: "Squares with highest resurrection rate"
              })
            }, "resurrected")]
          })
        }), /*#__PURE__*/_jsxs(Card, {
          title: "Merit Threshold",
          className: "mb-4",
          children: [/*#__PURE__*/_jsx("p", {
            className: "text-gray-500 mb-3",
            children: "Only show squares with merit above:"
          }), /*#__PURE__*/_jsx(Slider, {
            min: 0,
            max: 100,
            value: meritThreshold,
            onChange: setMeritThreshold,
            tooltip: {
              formatter: value => `${value}%`
            }
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex justify-between text-sm text-gray-500",
            children: [/*#__PURE__*/_jsx("span", {
              children: "Any"
            }), /*#__PURE__*/_jsx("span", {
              children: "Exceptional"
            })]
          })]
        }), /*#__PURE__*/_jsx(Card, {
          title: "Your Squares",
          className: "mb-4",
          children: isAuthenticated ? /*#__PURE__*/_jsxs(Tabs, {
            defaultActiveKey: "following",
            children: [/*#__PURE__*/_jsx(TabPane, {
              tab: "Following",
              children: followedSquares.length > 0 ? /*#__PURE__*/_jsx("div", {
                className: "space-y-3",
                children: followedSquares.map(square => /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/*#__PURE__*/_jsx(Avatar, {
                    size: "small",
                    src: square.iconUrl,
                    children: square.name[0]
                  }), /*#__PURE__*/_jsx("span", {
                    className: "truncate",
                    children: /*#__PURE__*/_jsx("a", {
                      href: `/squares/${square.slug}`,
                      className: "hover:text-blue-500",
                      children: square.name
                    })
                  })]
                }, square.id))
              }) : /*#__PURE__*/_jsx(Empty, {
                description: "You're not following any squares yet",
                image: Empty.PRESENTED_IMAGE_SIMPLE
              })
            }, "following"), /*#__PURE__*/_jsx(TabPane, {
              tab: "Created",
              children: createdSquares.length > 0 ? /*#__PURE__*/_jsx("div", {
                className: "space-y-3",
                children: createdSquares.map(square => /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/*#__PURE__*/_jsx(Avatar, {
                    size: "small",
                    src: square.iconUrl,
                    children: square.name[0]
                  }), /*#__PURE__*/_jsx("span", {
                    className: "truncate",
                    children: /*#__PURE__*/_jsx("a", {
                      href: `/squares/${square.slug}`,
                      className: "hover:text-blue-500",
                      children: square.name
                    })
                  })]
                }, square.id))
              }) : /*#__PURE__*/_jsx(Empty, {
                description: "You haven't created any squares yet",
                image: Empty.PRESENTED_IMAGE_SIMPLE,
                children: /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  onClick: () => navigateToTab('/squares/create', 'Create Square'),
                  children: "Create Square"
                })
              })
            }, "created")]
          }) : /*#__PURE__*/_jsx(Result, {
            status: "info",
            title: "Sign in to track squares",
            subTitle: "Follow squares to customize your experience",
            children: /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: () => navigateToTab('/login', 'Login'),
              children: "Sign In"
            })
          })
        })]
      }), /*#__PURE__*/_jsx(Col, {
        span: 18,
        children: isLoading ? /*#__PURE__*/_jsx("div", {
          children: [...Array(3)].map((_, i) => /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            avatar: true,
            paragraph: {
              rows: 4
            },
            className: "mb-4"
          }, i))
        }) : squares.length === 0 ? /*#__PURE__*/_jsx(Empty, {
          description: "No squares found matching your criteria"
        }) : /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [squares.map(square => /*#__PURE__*/_jsx(Card, {
            hoverable: true,
            onClick: () => navigateToTab(`/squares/${square.slug}`, square.name),
            className: "cursor-pointer",
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex items-start space-x-4",
              children: [/*#__PURE__*/_jsx(Avatar, {
                size: 64,
                src: square.iconUrl,
                children: square.name[0]
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex-1",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between mb-2",
                  children: [/*#__PURE__*/_jsxs("h3", {
                    className: "text-xl font-semibold",
                    children: [square.name, square.isVerified && /*#__PURE__*/_jsx("span", {
                      className: "ml-2 text-blue-500",
                      children: "\u2713"
                    })]
                  }), /*#__PURE__*/_jsx(Button, {
                    type: followedSquareIds.has(square.id) ? 'default' : 'primary',
                    size: "small",
                    onClick: e => {
                      e.stopPropagation();
                      handleFollowSquare(square.id);
                    },
                    children: followedSquareIds.has(square.id) ? 'Unfollow' : 'Follow'
                  })]
                }), /*#__PURE__*/_jsx("p", {
                  className: "text-gray-600 mb-3",
                  children: square.description
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center space-x-4 text-sm text-gray-500",
                  children: [/*#__PURE__*/_jsxs("span", {
                    children: [square.followerCount, " followers"]
                  }), /*#__PURE__*/_jsxs("span", {
                    children: [square.failureCount, " failures"]
                  }), /*#__PURE__*/_jsxs("span", {
                    children: [square.resurrectedCount, " resurrected"]
                  }), /*#__PURE__*/_jsxs("span", {
                    children: ["Merit: ", (square.avgMeritScore * 100).toFixed(0), "%"]
                  })]
                }), /*#__PURE__*/_jsx("div", {
                  className: "mt-2",
                  children: square.tags.map(tag => /*#__PURE__*/_jsx("span", {
                    className: "inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1",
                    children: tag
                  }, tag))
                })]
              })]
            })
          }, square.id)), /*#__PURE__*/_jsx("div", {
            className: "flex justify-center my-6",
            children: /*#__PURE__*/_jsx(Pagination, {
              current: currentPage,
              total: totalItems,
              pageSize: pageSize,
              onChange: setCurrentPage
            })
          })]
        })
      })]
    })]
  });
};
export default SquaresExplorerPage;