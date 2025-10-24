import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Radio, Tag, Button, Skeleton, Divider, Progress, Modal, Input, Space, message } from 'antd';
import { ArrowLeftOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import MainLayout from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/layouts/MainLayout.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { failuresService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const {
  TextArea
} = Input;
const FailureHistoryPage = () => {
  const {
    id
  } = useParams();
  const {
    navigateToTab
  } = useTabNavigation();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  useEffect(() => {
    loadVersions();
  }, [id]);
  useEffect(() => {
    if (selectedVersionId && versions.length > 0) {
      const version = versions.find(v => v.id === selectedVersionId);
      setSelectedVersion(version || null);
    }
  }, [selectedVersionId, versions]);
  const loadVersions = async () => {
    if (!id) return;
    try {
      setLoading(true);

      // Call actual API
      const apiVersions = await failuresService.getHistory(id);

      // Map API versions to page format
      const mappedVersions = apiVersions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        title: v.title,
        content: v.content,
        tags: v.tags,
        editorUsername: v.createdBy,
        editorDisplayName: v.createdBy,
        createdAt: new Date(v.createdAt),
        editReason: v.changeDescription,
        isModerationEdit: false,
        meritScore: Number(v.meritScore),
        componentScores: {
          clarity: Number(v.meritScore),
          novelty: Number(v.meritScore),
          contribution: Number(v.meritScore),
          rigor: Number(v.meritScore),
          reproducibility: Number(v.meritScore),
          civility: Number(v.meritScore)
        }
      }));
      setVersions(mappedVersions);
      if (mappedVersions.length > 0) {
        setCurrentVersion(mappedVersions[0]);
        setSelectedVersionId(mappedVersions[0].id);
        setSelectedVersion(mappedVersions[0]);
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
      message.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };
  const handleCompare = () => {
    if (selectedVersion && selectedVersion.id !== currentVersion?.id) {
      setIsComparing(!isComparing);
    }
  };
  const handleRestore = () => {
    setShowRestoreModal(true);
  };
  const handleConfirmRestore = async () => {
    if (!selectedVersion || !id) return;
    try {
      setIsRestoring(true);
      await failuresService.restoreVersion(id, selectedVersion.versionNumber, restoreReason);
      message.success(`Successfully restored to Version ${selectedVersion.versionNumber}`);
      setShowRestoreModal(false);
      setRestoreReason('');
      navigateToTab(`/failures/${id}`, 'View Failure', {
        closable: true
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      message.error('Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };
  const formatDate = date => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };
  return /*#__PURE__*/_jsx(MainLayout, {
    children: /*#__PURE__*/_jsxs("div", {
      className: "container mx-auto px-4 py-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "mb-6",
        children: [/*#__PURE__*/_jsx(Button, {
          icon: /*#__PURE__*/_jsx(ArrowLeftOutlined, {}),
          onClick: () => navigateToTab(`/failures/${id}`, 'View Failure', {
            closable: true
          }),
          children: "Back to Failure"
        }), /*#__PURE__*/_jsx("h1", {
          className: "text-2xl font-bold mt-4",
          children: "Version History"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-500",
          children: "View and compare changes"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex space-x-6",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-1/3",
          children: /*#__PURE__*/_jsx(Card, {
            children: loading ? /*#__PURE__*/_jsx(Skeleton, {
              active: true
            }) : /*#__PURE__*/_jsxs("div", {
              className: "space-y-4",
              children: [/*#__PURE__*/_jsx(Radio.Group, {
                value: selectedVersionId,
                onChange: e => setSelectedVersionId(e.target.value),
                className: "w-full",
                children: /*#__PURE__*/_jsx(Space, {
                  direction: "vertical",
                  className: "w-full",
                  children: versions.map(version => /*#__PURE__*/_jsx("div", {
                    className: `border rounded p-4 cursor-pointer transition-all ${selectedVersionId === version.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`,
                    onClick: () => setSelectedVersionId(version.id),
                    children: /*#__PURE__*/_jsx(Radio, {
                      value: version.id,
                      children: /*#__PURE__*/_jsxs("div", {
                        children: [/*#__PURE__*/_jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [/*#__PURE__*/_jsxs("span", {
                            className: "font-medium",
                            children: ["Version ", version.versionNumber]
                          }), /*#__PURE__*/_jsx("span", {
                            className: "text-sm text-gray-500",
                            children: formatDate(version.createdAt)
                          })]
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "text-sm text-gray-500 mt-1",
                          children: ["by ", version.editorDisplayName]
                        }), version.editReason && /*#__PURE__*/_jsx("div", {
                          className: "text-sm mt-2 text-gray-600",
                          children: version.editReason
                        }), version.isModerationEdit && /*#__PURE__*/_jsx(Tag, {
                          color: "red",
                          className: "mt-2",
                          children: "Moderation Edit"
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "flex items-center space-x-2 mt-2",
                          children: [/*#__PURE__*/_jsxs("span", {
                            className: "text-sm font-medium",
                            children: ["Merit: ", (version.meritScore * 100).toFixed(0), "%"]
                          }), version.versionNumber > 1 && version.meritScore > (versions.find(v => v.versionNumber === version.versionNumber - 1)?.meritScore || 0) && /*#__PURE__*/_jsx(Tag, {
                            color: "green",
                            icon: /*#__PURE__*/_jsx(ArrowUpOutlined, {}),
                            children: "Improved"
                          })]
                        })]
                      })
                    })
                  }, version.id))
                })
              }), versions.length > 1 && /*#__PURE__*/_jsx("div", {
                className: "text-center pt-4",
                children: /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  onClick: handleCompare,
                  disabled: selectedVersion?.id === currentVersion?.id,
                  children: isComparing ? 'Show Single Version' : 'Compare with Current'
                })
              })]
            })
          })
        }), /*#__PURE__*/_jsx("div", {
          className: "w-2/3",
          children: loading ? /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx(Skeleton, {
              active: true
            })
          }) : selectedVersion ? /*#__PURE__*/_jsx(Card, {
            title: `Version ${selectedVersion.versionNumber}`,
            children: isComparing ? /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                className: "mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded",
                children: /*#__PURE__*/_jsxs("p", {
                  className: "text-sm text-yellow-800",
                  children: ["Showing differences between Version ", selectedVersion.versionNumber, " and Version ", currentVersion?.versionNumber, " (current)"]
                })
              }), /*#__PURE__*/_jsxs("div", {
                className: "grid grid-cols-2 gap-4",
                children: [/*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("h3", {
                    className: "font-medium mb-2",
                    children: ["Version ", selectedVersion.versionNumber]
                  }), /*#__PURE__*/_jsx("div", {
                    className: "prose prose-sm max-w-none p-4 bg-gray-50 rounded",
                    children: /*#__PURE__*/_jsx(ReactMarkdown, {
                      children: selectedVersion.content
                    })
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("h3", {
                    className: "font-medium mb-2",
                    children: ["Version ", currentVersion?.versionNumber, " (Current)"]
                  }), /*#__PURE__*/_jsx("div", {
                    className: "prose prose-sm max-w-none p-4 bg-gray-50 rounded",
                    children: /*#__PURE__*/_jsx(ReactMarkdown, {
                      children: currentVersion?.content || ''
                    })
                  })]
                })]
              })]
            }) : /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("div", {
                className: "prose max-w-none mb-6",
                children: /*#__PURE__*/_jsx(ReactMarkdown, {
                  children: selectedVersion.content
                })
              }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsxs("div", {
                className: "space-y-2 mb-6",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "text-gray-500",
                    children: "Title"
                  }), /*#__PURE__*/_jsx("span", {
                    children: selectedVersion.title
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex justify-between text-sm",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "text-gray-500",
                    children: "Tags"
                  }), /*#__PURE__*/_jsx("div", {
                    children: selectedVersion.tags.map(tag => /*#__PURE__*/_jsx(Tag, {
                      className: "mr-1",
                      children: tag
                    }, tag))
                  })]
                })]
              }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-4",
                children: "Quality Metrics"
              }), /*#__PURE__*/_jsx("div", {
                className: "space-y-3",
                children: Object.entries(selectedVersion.componentScores).map(([key, value]) => /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex justify-between text-sm mb-1",
                    children: [/*#__PURE__*/_jsx("span", {
                      className: "capitalize",
                      children: key
                    }), /*#__PURE__*/_jsxs("span", {
                      children: [(value * 100).toFixed(0), "%"]
                    })]
                  }), /*#__PURE__*/_jsx(Progress, {
                    percent: value * 100,
                    showInfo: false,
                    size: "small"
                  })]
                }, key))
              }), selectedVersion.id !== currentVersion?.id && /*#__PURE__*/_jsxs(_Fragment, {
                children: [/*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsx(Button, {
                  type: "primary",
                  onClick: handleRestore,
                  children: "Restore this Version"
                })]
              })]
            })
          }) : /*#__PURE__*/_jsx(Card, {
            children: /*#__PURE__*/_jsx("div", {
              className: "text-center p-8 text-gray-500",
              children: "Select a version to view"
            })
          })
        })]
      }), /*#__PURE__*/_jsx(Modal, {
        title: "Restore Version",
        open: showRestoreModal,
        onOk: handleConfirmRestore,
        onCancel: () => setShowRestoreModal(false),
        confirmLoading: isRestoring,
        children: /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [/*#__PURE__*/_jsxs("p", {
            children: ["You are about to restore Version ", selectedVersion?.versionNumber, ". This will create a new version with the content from the selected version."]
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("label", {
              className: "block text-sm font-medium mb-2",
              children: "Reason for Restoring (optional)"
            }), /*#__PURE__*/_jsx(TextArea, {
              value: restoreReason,
              onChange: e => setRestoreReason(e.target.value),
              placeholder: "Explain why you're restoring this version",
              autoSize: {
                minRows: 3,
                maxRows: 6
              },
              maxLength: 500,
              showCount: true
            })]
          })]
        })
      })]
    })
  });
};
export default FailureHistoryPage;