import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useParams } from 'react-router-dom';
import { Row, Col, Avatar, Tabs, Statistic, List, Empty, Skeleton, Result, Divider, Tooltip } from 'antd';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from '../components/FailSquareButton';
import FailSquareTag from '../components/FailSquareTag';
import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
import { UserAddOutlined, UserDeleteOutlined, TrophyOutlined, FileTextOutlined, CommentOutlined, HeartOutlined, SettingOutlined, CalendarOutlined, LineChartOutlined } from '@ant-design/icons';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { usersService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ProfilePage = () => {
  const {
    username
  } = useParams();
  const {
    isAuthenticated
  } = useAuth();
  const {
    navigateToTab
  } = useTabNavigation();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFailures, setIsLoadingFailures] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);

  // Data
  const [profile, setProfile] = useState(null);
  const [failures, setFailures] = useState([]);
  const [comments, setComments] = useState([]);
  const [likedFailures, setLikedFailures] = useState([]);
  const [meritHistory, setMeritHistory] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState('failures');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  useEffect(() => {
    loadProfile();
  }, [username]);
  useEffect(() => {
    if (profile) {
      if (activeTab === 'failures') {
        loadFailures();
      } else if (activeTab === 'comments') {
        loadComments();
      } else if (activeTab === 'liked') {
        loadLikedFailures();
      }
    }
  }, [profile, activeTab]);
  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userProfile = await usersService.getUserProfile(username);
      setProfile(userProfile);
      setIsOwnProfile(false);
      loadMeritHistory();
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };
  const loadFailures = async () => {
    setIsLoadingFailures(true);
    try {
      const userPosts = await usersService.getUserPosts(profile.id);
      setFailures(userPosts);
    } catch (error) {
      console.error('Error loading failures:', error);
      setFailures([]);
    } finally {
      setIsLoadingFailures(false);
    }
  };
  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      setComments([]);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };
  const loadLikedFailures = async () => {
    setIsLoadingLiked(true);
    try {
      setLikedFailures([]);
    } catch (error) {
      console.error('Error loading liked failures:', error);
      setLikedFailures([]);
    } finally {
      setIsLoadingLiked(false);
    }
  };
  const loadMeritHistory = async () => {
    try {
      const history = await usersService.getUserMeritHistory(profile.id);
      setMeritHistory(history);
    } catch (error) {
      console.error('Error loading merit history:', error);
      setMeritHistory([]);
    }
  };
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
    if (profile) {
      setProfile({
        ...profile,
        isFollowing: !profile.isFollowing,
        followerCount: profile.followerCount + (profile.isFollowing ? -1 : 1)
      });
    }
  };
  const getTimeAgo = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };
  const getJoinedText = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };
  if (isLoading) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx("div", {
        className: "container mx-auto px-4 py-6",
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            avatar: true,
            paragraph: {
              rows: 6
            }
          })
        })
      })
    });
  }
  if (!profile) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx(Result, {
        status: "404",
        title: "User Not Found",
        subTitle: "The user you're looking for doesn't exist",
        extra: /*#__PURE__*/_jsx(FailSquareButton, {
          type: "primary",
          onClick: () => navigateToTab('/dashboard', 'Dashboard'),
          children: "Go to Dashboard"
        })
      })
    });
  }
  const tabItems = [{
    key: 'failures',
    label: /*#__PURE__*/_jsxs("span", {
      children: [/*#__PURE__*/_jsx(FileTextOutlined, {}), " Failures (", profile.totalFailures, ")"]
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
      description: "No failures documented yet"
    }) : /*#__PURE__*/_jsx(List, {
      dataSource: failures,
      renderItem: failure => /*#__PURE__*/_jsx(List.Item, {
        className: "cursor-pointer hover:bg-gray-50 px-4 py-4",
        onClick: () => navigateToTab(`/failures/${failure.id}`, failure.title),
        actions: [/*#__PURE__*/_jsxs("span", {
          children: [/*#__PURE__*/_jsx(HeartOutlined, {
            className: "mr-1"
          }), failure.likesCount]
        }, "likes"), /*#__PURE__*/_jsxs("span", {
          children: [/*#__PURE__*/_jsx(CommentOutlined, {
            className: "mr-1"
          }), failure.commentsCount]
        }, "comments")],
        children: /*#__PURE__*/_jsx(List.Item.Meta, {
          title: /*#__PURE__*/_jsxs("div", {
            className: "flex items-center justify-between",
            children: [/*#__PURE__*/_jsx("span", {
              className: "text-base font-semibold",
              children: failure.title
            }), failure.isResurrected && /*#__PURE__*/_jsx(FailSquareTag, {
              category: "success",
              children: "Resurrected"
            })]
          }),
          description: /*#__PURE__*/_jsxs("div", {
            className: "space-y-2",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center space-x-4 text-sm text-gray-500",
              children: [/*#__PURE__*/_jsx(FailSquareTag, {
                category: "technology",
                children: failure.domain
              }), /*#__PURE__*/_jsx("span", {
                children: "\u2022"
              }), /*#__PURE__*/_jsx("span", {
                children: getTimeAgo(failure.createdAt)
              }), /*#__PURE__*/_jsx("span", {
                children: "\u2022"
              }), /*#__PURE__*/_jsxs("span", {
                children: ["Failure Mode: ", failure.primaryFailureMode]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/*#__PURE__*/_jsx("span", {
                className: "text-xs text-gray-500",
                children: "Merit:"
              }), /*#__PURE__*/_jsx(MeritIndicator, {
                score: failure.meritScore,
                variant: "numeric",
                size: "small"
              })]
            }), /*#__PURE__*/_jsx("div", {
              children: failure.tags.map(tag => /*#__PURE__*/_jsx(FailSquareTag, {
                category: "general",
                className: "text-xs",
                children: tag
              }, tag))
            })]
          })
        })
      }, failure.id)
    })
  }, {
    key: 'comments',
    label: /*#__PURE__*/_jsxs("span", {
      children: [/*#__PURE__*/_jsx(CommentOutlined, {}), " Comments (", profile.totalComments, ")"]
    }),
    children: isLoadingComments ? /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsx(Skeleton, {
        active: true,
        paragraph: {
          rows: 2
        }
      }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsx(Skeleton, {
        active: true,
        paragraph: {
          rows: 2
        }
      })]
    }) : comments.length === 0 ? /*#__PURE__*/_jsx(Empty, {
      description: "No comments yet"
    }) : /*#__PURE__*/_jsx(List, {
      dataSource: comments,
      renderItem: comment => /*#__PURE__*/_jsx(List.Item, {
        className: "cursor-pointer hover:bg-gray-50 px-4 py-4",
        onClick: () => navigateToTab(`/failures/${comment.failureId}`, comment.failureTitle),
        actions: [/*#__PURE__*/_jsxs("span", {
          children: [/*#__PURE__*/_jsx(HeartOutlined, {
            className: "mr-1"
          }), comment.likesCount]
        }, "likes")],
        children: /*#__PURE__*/_jsx(List.Item.Meta, {
          title: /*#__PURE__*/_jsxs("span", {
            className: "text-sm text-gray-500",
            children: ["Commented on: ", /*#__PURE__*/_jsx("span", {
              className: "text-blue-500 font-medium",
              children: comment.failureTitle
            })]
          }),
          description: /*#__PURE__*/_jsxs("div", {
            className: "space-y-1",
            children: [/*#__PURE__*/_jsx("p", {
              className: "text-gray-700",
              children: comment.content
            }), /*#__PURE__*/_jsx("span", {
              className: "text-xs text-gray-500",
              children: getTimeAgo(comment.createdAt)
            })]
          })
        })
      }, comment.id)
    })
  }, {
    key: 'liked',
    label: /*#__PURE__*/_jsxs("span", {
      children: [/*#__PURE__*/_jsx(HeartOutlined, {}), " Liked"]
    }),
    children: isLoadingLiked ? /*#__PURE__*/_jsx("div", {
      children: /*#__PURE__*/_jsx(Skeleton, {
        active: true,
        paragraph: {
          rows: 3
        }
      })
    }) : likedFailures.length === 0 ? /*#__PURE__*/_jsx(Empty, {
      description: "No liked failures yet"
    }) : /*#__PURE__*/_jsx(List, {
      dataSource: likedFailures,
      renderItem: failure => /*#__PURE__*/_jsx(List.Item, {
        className: "cursor-pointer hover:bg-gray-50 px-4 py-4",
        onClick: () => navigateToTab(`/failures/${failure.id}`, failure.title),
        children: /*#__PURE__*/_jsx(List.Item.Meta, {
          title: /*#__PURE__*/_jsx("span", {
            className: "text-base font-semibold",
            children: failure.title
          }),
          description: /*#__PURE__*/_jsxs("div", {
            className: "flex items-center space-x-4 text-sm text-gray-500",
            children: [/*#__PURE__*/_jsx(FailSquareTag, {
              category: "technology",
              children: failure.domain
            }), /*#__PURE__*/_jsxs("span", {
              children: ["Merit: ", (failure.meritScore * 100).toFixed(0), "%"]
            })]
          })
        })
      }, failure.id)
    })
  }];
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsx("div", {
      className: "container mx-auto px-4 py-6",
      children: /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        children: [/*#__PURE__*/_jsxs(Col, {
          span: 18,
          children: [/*#__PURE__*/_jsx(FailSquareCard, {
            className: "mb-6",
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex items-start justify-between",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-start space-x-4",
                children: [/*#__PURE__*/_jsx(Avatar, {
                  size: 80,
                  src: profile.avatarUrl,
                  children: profile.displayName[0]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("h1", {
                    className: "text-2xl font-bold mb-1",
                    children: profile.displayName
                  }), /*#__PURE__*/_jsxs("p", {
                    className: "text-gray-500 mb-1",
                    children: ["@", profile.username]
                  }), /*#__PURE__*/_jsx("p", {
                    className: "text-gray-700 mb-3 max-w-2xl",
                    children: profile.bio
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "flex items-center space-x-4 text-sm text-gray-500",
                    children: [/*#__PURE__*/_jsxs("span", {
                      children: [/*#__PURE__*/_jsx(CalendarOutlined, {
                        className: "mr-1"
                      }), "Joined ", getJoinedText(profile.joinDate)]
                    }), /*#__PURE__*/_jsxs("span", {
                      children: [/*#__PURE__*/_jsx("strong", {
                        className: "text-gray-700",
                        children: profile.followerCount
                      }), " Followers"]
                    }), /*#__PURE__*/_jsxs("span", {
                      children: [/*#__PURE__*/_jsx("strong", {
                        className: "text-gray-700",
                        children: profile.followingCount
                      }), " Following"]
                    })]
                  }), /*#__PURE__*/_jsx("div", {
                    className: "mt-3",
                    children: profile.domains.map(domain => /*#__PURE__*/_jsx(FailSquareTag, {
                      category: "technology",
                      children: domain
                    }, domain))
                  })]
                })]
              }), /*#__PURE__*/_jsx("div", {
                className: "space-y-2",
                children: isOwnProfile ? /*#__PURE__*/_jsx(FailSquareButton, {
                  icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
                  onClick: () => navigateToTab('/settings', 'Settings'),
                  children: "Edit Profile"
                }) : /*#__PURE__*/_jsx(FailSquareButton, {
                  type: profile.isFollowing ? 'default' : 'primary',
                  icon: profile.isFollowing ? /*#__PURE__*/_jsx(UserDeleteOutlined, {}) : /*#__PURE__*/_jsx(UserAddOutlined, {}),
                  onClick: handleFollowToggle,
                  children: profile.isFollowing ? 'Unfollow' : 'Follow'
                })
              })]
            })
          }), /*#__PURE__*/_jsx(FailSquareCard, {
            children: /*#__PURE__*/_jsx(Tabs, {
              activeKey: activeTab,
              onChange: setActiveTab,
              items: tabItems
            })
          })]
        }), /*#__PURE__*/_jsxs(Col, {
          span: 6,
          children: [/*#__PURE__*/_jsx(FailSquareCard, {
            title: "Statistics",
            className: "mb-4",
            size: "small",
            children: /*#__PURE__*/_jsxs(Row, {
              gutter: [16, 16],
              children: [/*#__PURE__*/_jsx(Col, {
                span: 12,
                children: /*#__PURE__*/_jsx(Statistic, {
                  title: "Failures",
                  value: profile.totalFailures,
                  prefix: /*#__PURE__*/_jsx(FileTextOutlined, {}),
                  valueStyle: {
                    fontSize: '20px'
                  }
                })
              }), /*#__PURE__*/_jsx(Col, {
                span: 12,
                children: /*#__PURE__*/_jsx(Statistic, {
                  title: "Comments",
                  value: profile.totalComments,
                  prefix: /*#__PURE__*/_jsx(CommentOutlined, {}),
                  valueStyle: {
                    fontSize: '20px'
                  }
                })
              }), /*#__PURE__*/_jsx(Col, {
                span: 12,
                children: /*#__PURE__*/_jsx(Statistic, {
                  title: "Likes",
                  value: profile.totalLikes,
                  prefix: /*#__PURE__*/_jsx(HeartOutlined, {}),
                  valueStyle: {
                    fontSize: '20px'
                  }
                })
              }), /*#__PURE__*/_jsx(Col, {
                span: 12,
                children: /*#__PURE__*/_jsx(Statistic, {
                  title: "Avg Merit",
                  value: (profile.avgMeritScore * 100).toFixed(0),
                  suffix: "%",
                  prefix: /*#__PURE__*/_jsx(TrophyOutlined, {}),
                  valueStyle: {
                    fontSize: '20px',
                    color: '#52c41a'
                  }
                })
              })]
            })
          }), /*#__PURE__*/_jsx(FailSquareCard, {
            title: /*#__PURE__*/_jsxs("span", {
              children: [/*#__PURE__*/_jsx(LineChartOutlined, {
                className: "mr-2"
              }), "Merit Score Trend"]
            }),
            className: "mb-4",
            size: "small",
            children: meritHistory.length > 0 ? /*#__PURE__*/_jsxs("div", {
              className: "space-y-3",
              children: [meritHistory.map((entry, idx) => {
                const date = new Date(entry.date);
                const isLatest = idx === meritHistory.length - 1;
                return /*#__PURE__*/_jsxs("div", {
                  className: isLatest ? 'font-semibold' : '',
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex justify-between items-center mb-1",
                    children: [/*#__PURE__*/_jsx("span", {
                      className: "text-xs text-gray-500",
                      children: date.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })
                    }), /*#__PURE__*/_jsxs("span", {
                      className: "text-sm",
                      children: [(entry.score * 100).toFixed(0), "%"]
                    })]
                  }), /*#__PURE__*/_jsx(MeritIndicator, {
                    score: entry.score,
                    variant: "numeric",
                    size: "small"
                  })]
                }, entry.date);
              }), /*#__PURE__*/_jsx(FailSquareButton, {
                type: "link",
                size: "small",
                block: true,
                onClick: () => navigateToTab(`/users/${username}/merit`, 'Merit History'),
                children: "View Full History"
              })]
            }) : /*#__PURE__*/_jsx(Empty, {
              description: "No merit history yet",
              image: Empty.PRESENTED_IMAGE_SIMPLE
            })
          }), profile.badges.length > 0 && /*#__PURE__*/_jsx(FailSquareCard, {
            title: "Badges",
            size: "small",
            className: "mb-4",
            children: /*#__PURE__*/_jsx("div", {
              className: "space-y-2",
              children: profile.badges.map(badge => /*#__PURE__*/_jsx(Tooltip, {
                title: `Earned: ${badge}`,
                children: /*#__PURE__*/_jsxs(FailSquareTag, {
                  category: "warning",
                  className: "w-full text-center py-1",
                  children: [/*#__PURE__*/_jsx(TrophyOutlined, {
                    className: "mr-1"
                  }), badge]
                })
              }, badge))
            })
          })]
        })]
      })
    })
  });
};
export default ProfilePage;