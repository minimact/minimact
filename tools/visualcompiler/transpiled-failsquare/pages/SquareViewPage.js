import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Avatar, Button, Tag, Dropdown, Skeleton, Result, Divider, Pagination, Select, List, Progress, Empty } from 'antd';
import { MoreOutlined, UserAddOutlined, UserDeleteOutlined, FlagOutlined, TrophyOutlined, FileTextOutlined, RiseOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { squaresService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const SquareViewPage = () => {
  const {
    slug
  } = useParams();
  const {
    isAuthenticated
  } = useAuth();
  const {
    navigateToTab
  } = useTabNavigation();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFailures, setIsLoadingFailures] = useState(true);
  const [isLoadingContributors, setIsLoadingContributors] = useState(true);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);

  // Data
  const [square, setSquare] = useState(null);
  const [failures, setFailures] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [similarSquares, setSimilarSquares] = useState([]);

  // UI state
  const [isFollowing, setIsFollowing] = useState(false);
  const [canEdit] = useState(false);

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalFailures, setTotalFailures] = useState(0);
  const [sortBy, setSortBy] = useState('trending');
  useEffect(() => {
    loadSquare();
  }, [slug]);
  useEffect(() => {
    if (square) {
      loadFailures();
    }
  }, [square, currentPage, sortBy]);
  const loadSquare = async () => {
    setIsLoading(true);
    try {
      const apiSquare = await squaresService.getSquareBySlug(slug);
      setSquare(apiSquare);
      await Promise.all([loadTopContributors(), loadSimilarSquares()]);
    } catch (error) {
      console.error('Error loading square:', error);
      setSquare(null);
    } finally {
      setIsLoading(false);
    }
  };
  const loadFailures = async () => {
    setIsLoadingFailures(true);
    try {
      setFailures([]);
      setTotalFailures(0);
    } catch (error) {
      console.error('Error loading failures:', error);
    } finally {
      setIsLoadingFailures(false);
    }
  };
  const loadTopContributors = async () => {
    setIsLoadingContributors(true);
    try {
      setTopContributors([]);
    } catch (error) {
      console.error('Error loading contributors:', error);
    } finally {
      setIsLoadingContributors(false);
    }
  };
  const loadSimilarSquares = async () => {
    setIsLoadingSimilar(true);
    try {
      if (square?.id) {
        const similar = await squaresService.getSimilarSquares(square.id, 5);
        setSimilarSquares(similar);
      }
    } catch (error) {
      console.error('Error loading similar squares:', error);
      setSimilarSquares([]);
    } finally {
      setIsLoadingSimilar(false);
    }
  };
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
    if (!square) return;
    try {
      if (isFollowing) {
        await squaresService.unfollowSquare(square.id);
      } else {
        await squaresService.followSquare(square.id);
      }
      setIsFollowing(!isFollowing);
      setSquare({
        ...square,
        followerCount: square.followerCount + (isFollowing ? -1 : 1)
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };
  const handleReportSquare = () => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
  };
  const handleSortChange = value => {
    setSortBy(value);
    setCurrentPage(1);
  };
  const handlePageChange = page => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  const getTimeAgo = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };
  const menuItems = [{
    key: 'about',
    label: 'About this Square',
    onClick: () => navigateToTab(`/squares/${slug}/about`, `About ${square?.name}`)
  }, {
    key: 'guidelines',
    label: 'Guidelines',
    onClick: () => navigateToTab(`/squares/${slug}/guidelines`, 'Guidelines')
  }, ...(canEdit ? [{
    type: 'divider'
  }, {
    key: 'edit',
    label: 'Edit Square',
    onClick: () => navigateToTab(`/squares/${slug}/edit`, `Edit ${square?.name}`)
  }, {
    key: 'manage',
    label: 'Manage Members',
    onClick: () => navigateToTab(`/squares/${slug}/manage`, 'Manage Members')
  }] : []), {
    type: 'divider'
  }, {
    key: 'report',
    icon: /*#__PURE__*/_jsx(FlagOutlined, {}),
    label: 'Report Square',
    onClick: handleReportSquare
  }];
  if (isLoading) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsxs("div", {
        className: "container mx-auto px-4 py-6",
        children: [/*#__PURE__*/_jsx(Skeleton, {
          active: true,
          avatar: true,
          paragraph: {
            rows: 4
          }
        }), /*#__PURE__*/_jsx("div", {
          className: "mt-6",
          children: /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            paragraph: {
              rows: 8
            }
          })
        })]
      })
    });
  }
  if (!square) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx(Result, {
        status: "404",
        title: "Square Not Found",
        subTitle: "The square you're looking for doesn't exist or has been removed",
        extra: /*#__PURE__*/_jsx(Button, {
          type: "primary",
          onClick: () => navigateToTab('/explore', 'Explore Squares'),
          children: "Browse Squares"
        })
      })
    });
  }
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsxs(Card, {
        className: "mb-6",
        children: [/*#__PURE__*/_jsxs(Row, {
          gutter: 24,
          align: "middle",
          children: [/*#__PURE__*/_jsx(Col, {
            span: 18,
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex items-center space-x-4",
              children: [/*#__PURE__*/_jsx(Avatar, {
                size: 64,
                src: square.iconUrl,
                children: square.name[0]
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex items-center space-x-3 mb-1",
                  children: [/*#__PURE__*/_jsx("h1", {
                    className: "text-2xl font-bold m-0",
                    children: square.name
                  }), square.isVerified && /*#__PURE__*/_jsx(Tag, {
                    color: "blue",
                    className: "text-sm",
                    children: "Verified"
                  }), /*#__PURE__*/_jsxs(Tag, {
                    color: "green",
                    className: "text-sm",
                    children: ["Merit: ", (square.metrics?.avgMeritScore * 100 || 0).toFixed(0), "%"]
                  })]
                }), /*#__PURE__*/_jsxs("p", {
                  className: "text-gray-500 text-sm mb-2",
                  children: ["Created by ", square.creatorName || square.authorName || 'Unknown', ", ", getTimeAgo(square.createdAt)]
                }), /*#__PURE__*/_jsx("div", {
                  children: square.tags.map(tag => /*#__PURE__*/_jsx(Tag, {
                    className: "cursor-pointer",
                    onClick: () => navigateToTab(`/explore?tag=${tag}`, `Tag: ${tag}`),
                    children: tag
                  }, tag))
                })]
              })]
            })
          }), /*#__PURE__*/_jsx(Col, {
            span: 6,
            className: "text-right",
            children: /*#__PURE__*/_jsxs("div", {
              className: "space-y-2",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex justify-end space-x-2",
                children: [/*#__PURE__*/_jsx(Button, {
                  type: isFollowing ? 'primary' : 'default',
                  icon: isFollowing ? /*#__PURE__*/_jsx(UserDeleteOutlined, {}) : /*#__PURE__*/_jsx(UserAddOutlined, {}),
                  onClick: handleFollowToggle,
                  children: isFollowing ? 'Following' : 'Follow'
                }), /*#__PURE__*/_jsx(Dropdown, {
                  menu: {
                    items: menuItems
                  },
                  trigger: ['click'],
                  children: /*#__PURE__*/_jsx(Button, {
                    icon: /*#__PURE__*/_jsx(MoreOutlined, {})
                  })
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex justify-end space-x-4 text-center",
                children: [/*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-lg font-semibold",
                    children: square.followerCount
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Followers"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-lg font-semibold",
                    children: square.failureCount
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Failures"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-lg font-semibold",
                    children: square.resurrectedCount
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Resurrected"
                  })]
                })]
              })]
            })
          })]
        }), /*#__PURE__*/_jsx(Divider, {
          className: "my-4"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-700",
          children: square.description
        })]
      }), /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        children: [/*#__PURE__*/_jsx(Col, {
          span: 18,
          children: /*#__PURE__*/_jsx(Card, {
            title: /*#__PURE__*/_jsxs("div", {
              className: "flex justify-between items-center",
              children: [/*#__PURE__*/_jsxs("span", {
                className: "text-lg font-semibold",
                children: [/*#__PURE__*/_jsx(FileTextOutlined, {
                  className: "mr-2"
                }), "Failure Documentations"]
              }), /*#__PURE__*/_jsx(Select, {
                value: sortBy,
                onChange: handleSortChange,
                style: {
                  width: 180
                },
                options: [{
                  label: 'Trending',
                  value: 'trending'
                }, {
                  label: 'Highest Merit',
                  value: 'merit'
                }, {
                  label: 'Most Recent',
                  value: 'recent'
                }, {
                  label: 'Most Discussed',
                  value: 'discussed'
                }]
              })]
            }),
            children: isLoadingFailures ? /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx(Skeleton, {
                active: true,
                paragraph: {
                  rows: 3
                }
              }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsx(Skeleton, {
                active: true,
                paragraph: {
                  rows: 3
                }
              })]
            }) : failures.length === 0 ? /*#__PURE__*/_jsx(Empty, {
              description: "No failures documented yet",
              image: Empty.PRESENTED_IMAGE_SIMPLE,
              children: /*#__PURE__*/_jsx(Button, {
                type: "primary",
                onClick: () => navigateToTab('/submit', 'Document Failure'),
                children: "Document the First Failure"
              })
            }) : /*#__PURE__*/_jsxs(_Fragment, {
              children: [/*#__PURE__*/_jsx(List, {
                dataSource: failures,
                renderItem: failure => /*#__PURE__*/_jsx(List.Item, {
                  className: "cursor-pointer hover:bg-gray-50 px-4 py-4 transition-colors",
                  onClick: () => navigateToTab(`/failures/${failure.id}`, failure.title),
                  children: /*#__PURE__*/_jsx(List.Item.Meta, {
                    title: /*#__PURE__*/_jsxs("div", {
                      className: "flex items-center justify-between",
                      children: [/*#__PURE__*/_jsx("span", {
                        className: "text-base font-semibold",
                        children: failure.title
                      }), failure.isResurrected && /*#__PURE__*/_jsx(Tag, {
                        color: "green",
                        icon: /*#__PURE__*/_jsx(RiseOutlined, {}),
                        children: "Resurrected"
                      })]
                    }),
                    description: /*#__PURE__*/_jsxs("div", {
                      className: "space-y-2",
                      children: [/*#__PURE__*/_jsx("p", {
                        className: "text-gray-600 line-clamp-2",
                        children: failure.problemStatement
                      }), /*#__PURE__*/_jsxs("div", {
                        className: "flex items-center space-x-4 text-sm text-gray-500",
                        children: [/*#__PURE__*/_jsxs("span", {
                          children: ["by ", failure.authorUsername]
                        }), /*#__PURE__*/_jsx("span", {
                          children: "\u2022"
                        }), /*#__PURE__*/_jsx("span", {
                          children: getTimeAgo(failure.createdAt)
                        }), /*#__PURE__*/_jsx("span", {
                          children: "\u2022"
                        }), /*#__PURE__*/_jsxs("span", {
                          children: [failure.explorationDurationDays, " days explored"]
                        }), /*#__PURE__*/_jsx("span", {
                          children: "\u2022"
                        }), /*#__PURE__*/_jsxs("span", {
                          children: ["Failure Mode: ", failure.primaryFailureMode]
                        })]
                      }), /*#__PURE__*/_jsxs("div", {
                        className: "flex items-center space-x-2",
                        children: [/*#__PURE__*/_jsx("span", {
                          className: "text-xs text-gray-500",
                          children: "Merit Score:"
                        }), /*#__PURE__*/_jsx(Progress, {
                          percent: Math.round(failure.meritScore * 100),
                          size: "small",
                          status: failure.meritScore >= 0.8 ? 'success' : 'normal',
                          style: {
                            width: 150
                          }
                        }), /*#__PURE__*/_jsxs("span", {
                          className: "text-xs font-medium",
                          children: [(failure.meritScore * 100).toFixed(0), "%"]
                        })]
                      }), /*#__PURE__*/_jsx("div", {
                        children: failure.tags.map(tag => /*#__PURE__*/_jsx(Tag, {
                          className: "text-xs",
                          children: tag
                        }, tag))
                      })]
                    })
                  })
                }, failure.id)
              }), /*#__PURE__*/_jsx("div", {
                className: "flex justify-center mt-6",
                children: /*#__PURE__*/_jsx(Pagination, {
                  current: currentPage,
                  total: totalFailures,
                  pageSize: pageSize,
                  onChange: handlePageChange,
                  showSizeChanger: false
                })
              })]
            })
          })
        }), /*#__PURE__*/_jsxs(Col, {
          span: 6,
          children: [square.guidelines && /*#__PURE__*/_jsx(Card, {
            title: "Guidelines",
            className: "mb-4",
            size: "small",
            children: /*#__PURE__*/_jsx("p", {
              className: "text-sm text-gray-700",
              children: square.guidelines
            })
          }), /*#__PURE__*/_jsx(Card, {
            title: /*#__PURE__*/_jsxs("span", {
              children: [/*#__PURE__*/_jsx(TrophyOutlined, {
                className: "mr-2"
              }), "Top Contributors"]
            }),
            className: "mb-4",
            size: "small",
            children: isLoadingContributors ? /*#__PURE__*/_jsx(Skeleton, {
              active: true,
              paragraph: {
                rows: 2
              }
            }) : topContributors.length === 0 ? /*#__PURE__*/_jsx(Empty, {
              description: "No contributors yet",
              image: Empty.PRESENTED_IMAGE_SIMPLE
            }) : /*#__PURE__*/_jsx(List, {
              dataSource: topContributors,
              size: "small",
              renderItem: contributor => /*#__PURE__*/_jsx(List.Item, {
                className: "cursor-pointer hover:bg-gray-50 px-2 py-2",
                onClick: () => navigateToTab(`/users/${contributor.username}`, contributor.username),
                children: /*#__PURE__*/_jsx(List.Item.Meta, {
                  avatar: /*#__PURE__*/_jsx(Avatar, {
                    size: "small",
                    children: contributor.username[0]
                  }),
                  title: /*#__PURE__*/_jsx("span", {
                    className: "text-sm font-medium",
                    children: contributor.username
                  }),
                  description: /*#__PURE__*/_jsxs("div", {
                    className: "text-xs text-gray-500",
                    children: [contributor.failureCount, " failures \u2022 Merit:", ' ', (contributor.avgMeritScore * 100).toFixed(0), "%"]
                  })
                })
              })
            })
          }), /*#__PURE__*/_jsx(Card, {
            title: "Similar Squares",
            size: "small",
            children: isLoadingSimilar ? /*#__PURE__*/_jsx(Skeleton, {
              active: true,
              paragraph: {
                rows: 2
              }
            }) : similarSquares.length === 0 ? /*#__PURE__*/_jsx(Empty, {
              description: "No similar squares",
              image: Empty.PRESENTED_IMAGE_SIMPLE
            }) : /*#__PURE__*/_jsx(List, {
              dataSource: similarSquares,
              size: "small",
              renderItem: similar => /*#__PURE__*/_jsx(List.Item, {
                className: "cursor-pointer hover:bg-gray-50 px-2 py-2",
                onClick: () => navigateToTab(`/squares/${similar.slug}`, similar.name),
                children: /*#__PURE__*/_jsx(List.Item.Meta, {
                  avatar: /*#__PURE__*/_jsx(Avatar, {
                    size: "small",
                    src: similar.iconUrl,
                    children: similar.name[0]
                  }),
                  title: /*#__PURE__*/_jsx("span", {
                    className: "text-sm font-medium",
                    children: similar.name
                  }),
                  description: /*#__PURE__*/_jsxs("div", {
                    className: "text-xs text-gray-500",
                    children: [similar.followerCount, " followers \u2022 ", similar.failureCount, " failures"]
                  })
                })
              })
            })
          })]
        })]
      })]
    })
  });
};
export default SquareViewPage;