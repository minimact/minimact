import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useParams } from 'react-router-dom';
import { Row, Col, Avatar, Dropdown, Skeleton, Result, Divider, List, Input, Select, Tooltip, Empty, Descriptions, message, Modal } from 'antd';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from '../components/FailSquareButton';
import FailSquareTag from '../components/FailSquareTag';
import FailSquareTextArea from '../components/FailSquareTextArea';
import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
import { LikeOutlined, LikeFilled, CommentOutlined, ShareAltOutlined, FlagOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, LinkOutlined, ClockCircleOutlined, TrophyOutlined, UserAddOutlined, BranchesOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { failuresService, usersService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const FailureViewPage = () => {
  const {
    id
  } = useParams();
  const {
    isAuthenticated,
    user
  } = useAuth();
  const {
    navigateToTab
  } = useTabNavigation();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  // Data
  const [failure, setFailure] = useState(null);
  const [comments, setComments] = useState([]);
  const [authorDetails, setAuthorDetails] = useState(null);
  const [relatedFailures, setRelatedFailures] = useState([]);

  // UI state
  const [hasLiked, setHasLiked] = useState(false);
  const [isOwner] = useState(false);
  const [commentSort, setCommentSort] = useState('merit');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  useEffect(() => {
    loadFailure();
  }, [id]);
  const loadFailure = async () => {
    setIsLoading(true);
    try {
      if (!id) {
        setFailure(null);
        return;
      }

      // Call actual API
      const post = await failuresService.getFailure(id);

      // Map PostDto to FailureDocumentationDto (now they're almost identical)
      const mappedFailure = {
        id: post.id,
        title: post.title,
        domain: post.domain || 'General',
        authorId: post.authorId,
        authorUsername: post.authorUsername,
        meritScore: post.meritScore,
        meritComponents: post.meritComponents ? {
          clarity: post.meritComponents['clarity'] || post.meritScore,
          novelty: post.meritComponents['novelty'] || post.meritScore,
          contribution: post.meritComponents['contribution'] || post.meritScore,
          rigor: post.meritComponents['rigor'] || post.meritScore,
          reproducibility: post.meritComponents['reproducibility'] || post.meritScore,
          civility: post.meritComponents['civility'] || post.meritScore
        } : {
          clarity: post.meritScore,
          novelty: post.meritScore,
          contribution: post.meritScore,
          rigor: post.meritScore,
          reproducibility: post.meritScore,
          civility: post.meritScore
        },
        problemStatement: post.problemStatement || '',
        approachDescription: post.approachDescription || post.content || '',
        initialHypothesis: post.initialHypothesis || '',
        methodologyDescription: post.methodologyDescription || '',
        technologiesUsed: post.technologiesUsed || [],
        explorationDurationDays: post.explorationDurationDays || 0,
        failureDescription: post.failureDescription || '',
        primaryFailureMode: post.primaryFailureMode || 'Unknown',
        variantsExplored: post.variantsExplored || [],
        unexploredAreas: post.unexploredAreas || '',
        revivalConditions: post.revivalConditions || '',
        potentialRevivalYear: post.potentialRevivalYear,
        requiredAdvances: post.requiredAdvances || [],
        resourceLinks: post.resourceLinks || [],
        tags: post.tags,
        isResurrected: post.isResurrected || false,
        squareId: post.squareId,
        squareName: post.squareName,
        squareSlug: post.squareSlug,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0
      };
      setFailure(mappedFailure);
      setHasLiked(false);

      // Load related data
      await Promise.all([loadComments(), loadAuthorDetails(), loadRelatedFailures()]);
    } catch (error) {
      console.error('Error loading failure:', error);
      setFailure(null);
    } finally {
      setIsLoading(false);
    }
  };
  const loadComments = async () => {
    if (!id) return;
    setIsLoadingComments(true);
    try {
      // Call actual API
      const apiComments = await failuresService.getComments(id, commentSort);

      // Map API comments to page CommentDto format
      const mappedComments = apiComments.map(c => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        authorUsername: c.authorUsername,
        createdAt: c.createdAt,
        likesCount: c.meritScore * 10,
        // Placeholder calculation
        hasLiked: false,
        isOwner: user ? c.authorId === user.id : false
      }));
      setComments(mappedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      message.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };
  const loadAuthorDetails = async () => {
    if (!failure) return;
    try {
      const userProfile = await usersService.getUserProfile(failure.authorId);
      const authorDetails = {
        bio: userProfile.bio || '',
        totalFailures: 0,
        avgMeritScore: userProfile.meritScore,
        joinDate: userProfile.createdAt,
        isFollowing: false
      };
      setAuthorDetails(authorDetails);
    } catch (error) {
      console.error('Error loading author details:', error);
      setAuthorDetails(null);
    }
  };
  const loadRelatedFailures = async () => {
    if (!id) return;
    try {
      const related = await failuresService.getRelatedFailures(id, 5);
      const mappedRelated = related.map(post => ({
        id: post.id,
        title: post.title,
        domain: post.domain || 'General',
        authorId: post.authorId,
        authorUsername: post.authorUsername,
        meritScore: post.meritScore,
        meritComponents: {
          clarity: post.meritScore,
          novelty: post.meritScore,
          contribution: post.meritScore,
          rigor: post.meritScore,
          reproducibility: post.meritScore,
          civility: post.meritScore
        },
        problemStatement: post.problemStatement || '',
        approachDescription: post.content || '',
        initialHypothesis: '',
        methodologyDescription: '',
        technologiesUsed: post.technologiesUsed || [],
        explorationDurationDays: post.explorationDurationDays || 0,
        failureDescription: post.failureDescription || '',
        primaryFailureMode: post.primaryFailureMode || 'Unknown',
        variantsExplored: [],
        unexploredAreas: '',
        revivalConditions: '',
        requiredAdvances: [],
        resourceLinks: [],
        tags: post.tags,
        isResurrected: post.isResurrected || false,
        squareId: post.squareId,
        squareName: post.squareName,
        squareSlug: post.squareSlug,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0
      }));
      setRelatedFailures(mappedRelated);
    } catch (error) {
      console.error('Error loading related failures:', error);
      setRelatedFailures([]);
    }
  };
  const handleLike = async () => {
    if (!isAuthenticated || !id) {
      navigateToTab('/login', 'Login');
      return;
    }
    const newLikedState = !hasLiked;
    setHasLiked(newLikedState);
    if (failure) {
      setFailure({
        ...failure,
        likesCount: failure.likesCount + (newLikedState ? 1 : -1)
      });
    }
    try {
      if (newLikedState) {
        await failuresService.likeFailure(id);
      } else {
        await failuresService.unlikeFailure(id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setHasLiked(!newLikedState);
      if (failure) {
        setFailure({
          ...failure,
          likesCount: failure.likesCount + (newLikedState ? -1 : 1)
        });
      }
    }
  };
  const handleCommentSubmit = async () => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
    if (!newComment.trim() || !id || !user) return;
    setIsSubmittingComment(true);
    try {
      // Call actual API
      const command = {
        postId: id,
        authorId: user.id,
        content: newComment.trim()
      };
      const apiComment = await failuresService.addComment(id, command);

      // Map API comment to page CommentDto format
      const mappedComment = {
        id: apiComment.id,
        content: apiComment.content,
        authorId: apiComment.authorId,
        authorUsername: apiComment.authorUsername,
        createdAt: apiComment.createdAt,
        likesCount: apiComment.meritScore * 10,
        // Placeholder calculation
        hasLiked: false,
        isOwner: true // Just posted by current user
      };
      setComments([mappedComment, ...comments]);
      setNewComment('');
      if (failure) {
        setFailure({
          ...failure,
          commentsCount: failure.commentsCount + 1
        });
      }
      message.success('Comment posted successfully');
    } catch (error) {
      console.error('Error submitting comment:', error);
      message.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  const handleFollowAuthor = async () => {
    if (!isAuthenticated || !failure) {
      navigateToTab('/login', 'Login');
      return;
    }
    if (authorDetails) {
      setAuthorDetails({
        ...authorDetails,
        isFollowing: !authorDetails.isFollowing
      });
    }
  };
  const handleDelete = () => {
    if (!id) return;
    Modal.confirm({
      title: 'Delete Failure Documentation',
      content: 'Are you sure you want to delete this failure documentation? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await failuresService.deleteFailure(id);
          message.success('Failure documentation deleted successfully');
          navigateToTab('/dashboard', 'Dashboard', {
            closable: false
          });
        } catch (error) {
          console.error('Error deleting failure:', error);
          message.error('Failed to delete failure documentation');
        }
      }
    });
  };
  const handleFork = () => {
    if (!isAuthenticated) {
      navigateToTab('/login', 'Login');
      return;
    }
    if (!id || !user || !failure) return;
    let newTitle = '';
    Modal.confirm({
      title: 'Fork Failure Documentation',
      content: /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsx("p", {
          children: "Create a copy of this failure documentation that you can modify independently."
        }), /*#__PURE__*/_jsx(Input, {
          placeholder: "Enter a new title for your fork",
          defaultValue: `${failure.title} (Fork)`,
          onChange: e => {
            newTitle = e.target.value;
          },
          onPressEnter: e => {
            newTitle = e.target.value;
          }
        })]
      }),
      okText: 'Fork',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const command = {
            originalPostId: id,
            newAuthorId: user.id,
            newTitle: newTitle || `${failure.title} (Fork)`
          };
          const forkedPost = await failuresService.forkFailure(id, command);
          message.success('Failure documentation forked successfully');
          navigateToTab(`/failures/${forkedPost.id}`, forkedPost.title, {
            closable: true
          });
        } catch (error) {
          console.error('Error forking failure:', error);
          message.error('Failed to fork failure documentation');
        }
      }
    });
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
  const calculateReadTime = content => {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 225));
  };
  const menuItems = [{
    key: 'fork',
    icon: /*#__PURE__*/_jsx(BranchesOutlined, {}),
    label: 'Fork',
    onClick: handleFork
  }, {
    key: 'export',
    icon: /*#__PURE__*/_jsx(DownloadOutlined, {}),
    label: 'Export as Markdown',
    onClick: () => console.log('Export')
  }, {
    key: 'copy',
    icon: /*#__PURE__*/_jsx(LinkOutlined, {}),
    label: 'Copy Link',
    onClick: () => console.log('Copy link')
  }, ...(isOwner ? [{
    type: 'divider'
  }, {
    key: 'edit',
    icon: /*#__PURE__*/_jsx(EditOutlined, {}),
    label: 'Edit',
    onClick: () => navigateToTab(`/failures/${id}/edit`, 'Edit Failure')
  }, {
    key: 'delete',
    icon: /*#__PURE__*/_jsx(DeleteOutlined, {}),
    label: 'Delete',
    danger: true,
    onClick: handleDelete
  }] : []), {
    type: 'divider'
  }, {
    key: 'report',
    icon: /*#__PURE__*/_jsx(FlagOutlined, {}),
    label: 'Report',
    onClick: () => console.log('Report')
  }];
  if (isLoading) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx("div", {
        className: "container mx-auto px-4 py-6",
        children: /*#__PURE__*/_jsx(FailSquareCard, {
          children: /*#__PURE__*/_jsx(Skeleton, {
            active: true,
            avatar: true,
            paragraph: {
              rows: 8
            }
          })
        })
      })
    });
  }
  if (!failure) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx(Result, {
        status: "404",
        title: "Failure Not Found",
        subTitle: "The failure documentation you're looking for doesn't exist or has been removed",
        extra: /*#__PURE__*/_jsx(FailSquareButton, {
          type: "primary",
          onClick: () => navigateToTab('/dashboard', 'Dashboard'),
          children: "Browse Failures"
        })
      })
    });
  }
  const readTime = calculateReadTime(failure.approachDescription + failure.methodologyDescription + failure.failureDescription);
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsx("div", {
      className: "container mx-auto px-4 py-6",
      children: /*#__PURE__*/_jsxs(Row, {
        gutter: 24,
        children: [/*#__PURE__*/_jsx(Col, {
          span: 18,
          children: /*#__PURE__*/_jsxs(FailSquareCard, {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "mb-6",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-start justify-between mb-4",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex-1",
                  children: [/*#__PURE__*/_jsx("h1", {
                    className: "text-3xl font-bold mb-2",
                    children: failure.title
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "flex items-center space-x-4 text-gray-500",
                    children: [/*#__PURE__*/_jsxs("span", {
                      className: "flex items-center",
                      children: [/*#__PURE__*/_jsx(Avatar, {
                        size: "small",
                        className: "mr-2",
                        children: failure.authorUsername[0].toUpperCase()
                      }), /*#__PURE__*/_jsx("a", {
                        className: "hover:text-blue-500 cursor-pointer",
                        onClick: () => navigateToTab(`/users/${failure.authorUsername}`, failure.authorUsername),
                        children: failure.authorUsername
                      })]
                    }), /*#__PURE__*/_jsx("span", {
                      children: "\u2022"
                    }), /*#__PURE__*/_jsx("span", {
                      children: getTimeAgo(failure.createdAt)
                    }), /*#__PURE__*/_jsx("span", {
                      children: "\u2022"
                    }), /*#__PURE__*/_jsxs("span", {
                      children: [/*#__PURE__*/_jsx(ClockCircleOutlined, {
                        className: "mr-1"
                      }), readTime, " min read"]
                    }), /*#__PURE__*/_jsx("span", {
                      children: "\u2022"
                    }), /*#__PURE__*/_jsxs("span", {
                      children: [/*#__PURE__*/_jsx(ClockCircleOutlined, {
                        className: "mr-1"
                      }), failure.explorationDurationDays, " days explored"]
                    })]
                  })]
                }), /*#__PURE__*/_jsx(Dropdown, {
                  menu: {
                    items: menuItems
                  },
                  trigger: ['click'],
                  children: /*#__PURE__*/_jsx(FailSquareButton, {
                    icon: /*#__PURE__*/_jsx(ShareAltOutlined, {}),
                    children: "More"
                  })
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center space-x-2 mb-4",
                children: [/*#__PURE__*/_jsx(FailSquareTag, {
                  category: "technology",
                  children: failure.domain
                }), failure.isResurrected && /*#__PURE__*/_jsx(FailSquareTag, {
                  category: "success",
                  children: "Resurrected"
                }), failure.tags.map(tag => /*#__PURE__*/_jsx(FailSquareTag, {
                  category: "general",
                  children: tag
                }, tag))]
              }), failure.squareId && /*#__PURE__*/_jsxs("div", {
                className: "mb-4",
                children: [/*#__PURE__*/_jsx("span", {
                  className: "text-gray-500",
                  children: "Posted in: "
                }), /*#__PURE__*/_jsx("a", {
                  className: "text-blue-500 hover:underline cursor-pointer",
                  onClick: () => navigateToTab(`/squares/${failure.squareSlug}`, failure.squareName),
                  children: failure.squareName
                })]
              }), /*#__PURE__*/_jsxs(FailSquareCard, {
                size: "small",
                className: "bg-gray-50 mb-4",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex items-center justify-between mb-2",
                  children: [/*#__PURE__*/_jsxs("span", {
                    className: "font-semibold",
                    children: [/*#__PURE__*/_jsx(TrophyOutlined, {
                      className: "mr-2"
                    }), "Merit Score: ", (failure.meritScore * 100).toFixed(0), "%"]
                  }), /*#__PURE__*/_jsx(MeritIndicator, {
                    score: failure.meritScore,
                    variant: "gauge",
                    size: "medium"
                  })]
                }), /*#__PURE__*/_jsxs(Row, {
                  gutter: 8,
                  children: [/*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How clear and well-structured is the documentation",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Clarity"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.clarity * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  }), /*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How novel or unique is this failure",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Novelty"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.novelty * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  }), /*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How valuable is this knowledge to the community",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Contribution"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.contribution * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  }), /*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How rigorous is the methodology",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Rigor"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.rigor * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  }), /*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How reproducible are the results",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Reproducibility"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.reproducibility * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  }), /*#__PURE__*/_jsx(Col, {
                    span: 4,
                    children: /*#__PURE__*/_jsx(Tooltip, {
                      title: "How professional and respectful is the tone",
                      children: /*#__PURE__*/_jsxs("div", {
                        className: "text-center",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "text-xs text-gray-500",
                          children: "Civility"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "font-semibold",
                          children: [(failure.meritComponents.civility * 100).toFixed(0), "%"]
                        })]
                      })
                    })
                  })]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center space-x-2",
                children: [/*#__PURE__*/_jsx(FailSquareButton, {
                  icon: hasLiked ? /*#__PURE__*/_jsx(LikeFilled, {}) : /*#__PURE__*/_jsx(LikeOutlined, {}),
                  onClick: handleLike,
                  type: hasLiked ? 'primary' : 'default',
                  children: failure.likesCount
                }), /*#__PURE__*/_jsx(FailSquareButton, {
                  icon: /*#__PURE__*/_jsx(CommentOutlined, {}),
                  onClick: () => window.scrollTo(0, 9999),
                  children: failure.commentsCount
                })]
              })]
            }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsxs("div", {
              className: "space-y-8",
              children: [/*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3",
                  children: "Problem Statement"
                }), /*#__PURE__*/_jsx("p", {
                  className: "text-gray-700",
                  children: failure.problemStatement
                })]
              }), /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3",
                  children: "The Approach"
                }), /*#__PURE__*/_jsx("div", {
                  className: "prose max-w-none",
                  children: /*#__PURE__*/_jsx(ReactMarkdown, {
                    children: failure.approachDescription
                  })
                }), /*#__PURE__*/_jsxs(FailSquareCard, {
                  size: "small",
                  className: "mt-3 bg-blue-50",
                  children: [/*#__PURE__*/_jsx("strong", {
                    children: "Initial Hypothesis:"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "prose max-w-none mt-2",
                    children: /*#__PURE__*/_jsx(ReactMarkdown, {
                      children: failure.initialHypothesis
                    })
                  })]
                })]
              }), /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3",
                  children: "The Method"
                }), /*#__PURE__*/_jsx("div", {
                  className: "prose max-w-none",
                  children: /*#__PURE__*/_jsx(ReactMarkdown, {
                    children: failure.methodologyDescription
                  })
                }), failure.technologiesUsed.length > 0 && /*#__PURE__*/_jsxs("div", {
                  className: "mt-3",
                  children: [/*#__PURE__*/_jsx("strong", {
                    className: "text-sm text-gray-600",
                    children: "Technologies Used:"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "mt-2",
                    children: failure.technologiesUsed.map(tech => /*#__PURE__*/_jsx(FailSquareTag, {
                      category: "technology",
                      children: tech
                    }, tech))
                  })]
                })]
              }), /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3 text-red-600",
                  children: "The Failure"
                }), /*#__PURE__*/_jsxs(FailSquareCard, {
                  size: "small",
                  className: "bg-red-50 mb-3",
                  children: [/*#__PURE__*/_jsx("strong", {
                    children: "Primary Failure Mode:"
                  }), " ", failure.primaryFailureMode]
                }), /*#__PURE__*/_jsx("div", {
                  className: "prose max-w-none",
                  children: /*#__PURE__*/_jsx(ReactMarkdown, {
                    children: failure.failureDescription
                  })
                })]
              }), /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3",
                  children: "The Boundaries"
                }), failure.variantsExplored.length > 0 && /*#__PURE__*/_jsxs("div", {
                  className: "mb-4",
                  children: [/*#__PURE__*/_jsx("strong", {
                    className: "block mb-2",
                    children: "Variants Explored:"
                  }), /*#__PURE__*/_jsx("ul", {
                    className: "list-disc list-inside space-y-1",
                    children: failure.variantsExplored.map((variant, idx) => /*#__PURE__*/_jsx("li", {
                      className: "text-gray-700",
                      children: variant
                    }, idx))
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("strong", {
                    className: "block mb-2",
                    children: "Unexplored Areas:"
                  }), /*#__PURE__*/_jsx("div", {
                    className: "prose max-w-none",
                    children: /*#__PURE__*/_jsx(ReactMarkdown, {
                      children: failure.unexploredAreas
                    })
                  })]
                })]
              }), /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3 text-green-600",
                  children: "Revival Conditions"
                }), /*#__PURE__*/_jsx("div", {
                  className: "prose max-w-none mb-3",
                  children: /*#__PURE__*/_jsx(ReactMarkdown, {
                    children: failure.revivalConditions
                  })
                }), /*#__PURE__*/_jsx(FailSquareCard, {
                  size: "small",
                  className: "bg-green-50",
                  children: /*#__PURE__*/_jsxs(Descriptions, {
                    size: "small",
                    column: 2,
                    children: [failure.potentialRevivalYear && /*#__PURE__*/_jsx(Descriptions.Item, {
                      label: "Potential Revival Year",
                      children: failure.potentialRevivalYear
                    }), failure.requiredAdvances.length > 0 && /*#__PURE__*/_jsx(Descriptions.Item, {
                      label: "Required Advances",
                      span: 2,
                      children: failure.requiredAdvances.map(advance => /*#__PURE__*/_jsx(FailSquareTag, {
                        category: "success",
                        className: "mb-1",
                        children: advance
                      }, advance))
                    })]
                  })
                })]
              }), failure.resourceLinks.length > 0 && /*#__PURE__*/_jsxs("section", {
                children: [/*#__PURE__*/_jsx("h2", {
                  className: "text-xl font-bold mb-3",
                  children: "Resources"
                }), /*#__PURE__*/_jsx("ul", {
                  className: "space-y-2",
                  children: failure.resourceLinks.map((link, idx) => /*#__PURE__*/_jsx("li", {
                    children: /*#__PURE__*/_jsxs("a", {
                      href: link,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "text-blue-500 hover:underline",
                      children: [/*#__PURE__*/_jsx(LinkOutlined, {
                        className: "mr-1"
                      }), link]
                    })
                  }, idx))
                })]
              })]
            }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsxs("div", {
              id: "comments",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex justify-between items-center mb-4",
                children: [/*#__PURE__*/_jsxs("h2", {
                  className: "text-xl font-bold",
                  children: [/*#__PURE__*/_jsx(CommentOutlined, {
                    className: "mr-2"
                  }), "Comments (", failure.commentsCount, ")"]
                }), /*#__PURE__*/_jsx(Select, {
                  value: commentSort,
                  onChange: setCommentSort,
                  style: {
                    width: 180
                  },
                  options: [{
                    label: 'Sort by Merit',
                    value: 'merit'
                  }, {
                    label: 'Sort by Newest',
                    value: 'newest'
                  }, {
                    label: 'Sort by Oldest',
                    value: 'oldest'
                  }]
                })]
              }), isAuthenticated && /*#__PURE__*/_jsxs(FailSquareCard, {
                size: "small",
                className: "mb-4",
                children: [/*#__PURE__*/_jsx(FailSquareTextArea, {
                  rows: 3,
                  placeholder: "Share your thoughts, similar experiences, or suggestions...",
                  value: newComment,
                  onValueChange: setNewComment,
                  maxLength: 2000,
                  showCount: true
                }), /*#__PURE__*/_jsx("div", {
                  className: "flex justify-end mt-2",
                  children: /*#__PURE__*/_jsx(FailSquareButton, {
                    type: "primary",
                    onClick: handleCommentSubmit,
                    loading: isSubmittingComment,
                    disabled: !newComment.trim(),
                    children: "Post Comment"
                  })
                })]
              }), isLoadingComments ? /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx(Skeleton, {
                  active: true,
                  avatar: true,
                  paragraph: {
                    rows: 2
                  }
                }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsx(Skeleton, {
                  active: true,
                  avatar: true,
                  paragraph: {
                    rows: 2
                  }
                })]
              }) : comments.length === 0 ? /*#__PURE__*/_jsx(Empty, {
                description: "No comments yet. Be the first to share your thoughts!"
              }) : /*#__PURE__*/_jsx(List, {
                dataSource: comments,
                renderItem: comment => /*#__PURE__*/_jsx(List.Item, {
                  actions: [/*#__PURE__*/_jsx(FailSquareButton, {
                    type: "text",
                    size: "small",
                    icon: comment.hasLiked ? /*#__PURE__*/_jsx(LikeFilled, {}) : /*#__PURE__*/_jsx(LikeOutlined, {}),
                    children: comment.likesCount
                  })],
                  children: /*#__PURE__*/_jsx(List.Item.Meta, {
                    avatar: /*#__PURE__*/_jsx(Avatar, {
                      children: comment.authorUsername[0].toUpperCase()
                    }),
                    title: /*#__PURE__*/_jsxs("div", {
                      className: "flex items-center space-x-2",
                      children: [/*#__PURE__*/_jsx("span", {
                        className: "font-semibold",
                        children: comment.authorUsername
                      }), comment.isOwner && /*#__PURE__*/_jsx(FailSquareTag, {
                        category: "info",
                        children: "Author"
                      }), /*#__PURE__*/_jsx("span", {
                        className: "text-gray-500 text-xs font-normal",
                        children: getTimeAgo(comment.createdAt)
                      })]
                    }),
                    description: /*#__PURE__*/_jsx("div", {
                      className: "text-gray-700",
                      children: comment.content
                    })
                  })
                }, comment.id)
              })]
            })]
          })
        }), /*#__PURE__*/_jsxs(Col, {
          span: 6,
          children: [/*#__PURE__*/_jsxs(FailSquareCard, {
            title: "About the Author",
            size: "small",
            className: "mb-4",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center space-x-3 mb-3",
              children: [/*#__PURE__*/_jsx(Avatar, {
                size: 48,
                children: failure.authorUsername[0].toUpperCase()
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("h3", {
                  className: "font-medium cursor-pointer hover:text-blue-500",
                  onClick: () => navigateToTab(`/users/${failure.authorUsername}`, failure.authorUsername),
                  children: failure.authorUsername
                }), authorDetails && /*#__PURE__*/_jsxs("p", {
                  className: "text-xs text-gray-500",
                  children: ["Member since ", new Date(authorDetails.joinDate).getFullYear()]
                })]
              })]
            }), authorDetails && /*#__PURE__*/_jsxs(_Fragment, {
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-sm text-gray-600 mb-3",
                children: authorDetails.bio
              }), /*#__PURE__*/_jsxs("div", {
                className: "grid grid-cols-2 gap-4 mb-3 text-center",
                children: [/*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-lg font-medium",
                    children: authorDetails.totalFailures
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Failures"
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "text-lg font-medium",
                    children: [(authorDetails.avgMeritScore * 100).toFixed(0), "%"]
                  }), /*#__PURE__*/_jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Avg Merit"
                  })]
                })]
              }), /*#__PURE__*/_jsx(FailSquareButton, {
                type: authorDetails.isFollowing ? 'default' : 'primary',
                block: true,
                icon: /*#__PURE__*/_jsx(UserAddOutlined, {}),
                onClick: handleFollowAuthor,
                children: authorDetails.isFollowing ? 'Unfollow' : 'Follow'
              })]
            })]
          }), relatedFailures.length > 0 && /*#__PURE__*/_jsx(FailSquareCard, {
            title: "Similar Failures",
            size: "small",
            children: /*#__PURE__*/_jsx(List, {
              dataSource: relatedFailures,
              size: "small",
              renderItem: related => /*#__PURE__*/_jsx(List.Item, {
                className: "cursor-pointer hover:bg-gray-50 px-2",
                onClick: () => navigateToTab(`/failures/${related.id}`, related.title),
                children: /*#__PURE__*/_jsx(List.Item.Meta, {
                  title: /*#__PURE__*/_jsx("span", {
                    className: "text-sm",
                    children: related.title
                  }),
                  description: /*#__PURE__*/_jsxs("div", {
                    className: "text-xs text-gray-500",
                    children: ["by ", related.authorUsername, " \u2022 ", getTimeAgo(related.createdAt)]
                  })
                })
              })
            })
          })]
        })]
      })
    })
  });
};
export default FailureViewPage;