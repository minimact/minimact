import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Progress, Typography, List } from 'antd';
import { BulbOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Text
} = Typography;
const AiAnalysisSidebar = ({
  analysis,
  isAnalyzing = false,
  title = 'AI Analysis',
  emptyStateMessage = 'Fill in the form to get AI-powered suggestions for improving your documentation quality',
  className
}) => {
  const getScoreColor = score => {
    if (score >= 0.9) return '#52c41a'; // green
    if (score >= 0.8) return '#73d13d'; // light green
    if (score >= 0.6) return '#1890ff'; // blue
    if (score >= 0.4) return '#faad14'; // yellow
    return '#f5222d'; // red
  };
  const getScoreLabel = score => {
    if (score >= 0.9) return 'Exceptional';
    if (score >= 0.8) return 'High Quality';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Needs Improvement';
    return 'Poor';
  };
  const getSuggestionIcon = type => {
    switch (type) {
      case 'success':
        return /*#__PURE__*/_jsx(CheckCircleOutlined, {
          className: "text-green-500"
        });
      case 'warning':
        return /*#__PURE__*/_jsx(WarningOutlined, {
          className: "text-yellow-500"
        });
      case 'improvement':
      default:
        return /*#__PURE__*/_jsx(BulbOutlined, {
          className: "text-blue-500"
        });
    }
  };
  return /*#__PURE__*/_jsx(Card, {
    title: title,
    loading: isAnalyzing,
    className: className,
    size: "small",
    children: analysis ? /*#__PURE__*/_jsxs("div", {
      className: "space-y-4",
      children: [/*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex justify-between items-center text-sm mb-2",
          children: [/*#__PURE__*/_jsx("span", {
            children: "Overall Merit Score"
          }), /*#__PURE__*/_jsxs("span", {
            className: "font-medium",
            children: [(analysis.overallScore * 100).toFixed(0), "% - ", getScoreLabel(analysis.overallScore)]
          })]
        }), /*#__PURE__*/_jsx(Progress, {
          percent: analysis.overallScore * 100,
          strokeColor: getScoreColor(analysis.overallScore),
          size: "small",
          showInfo: false
        })]
      }), (analysis.clarityScore !== undefined || analysis.noveltyScore !== undefined || analysis.rigorScore !== undefined || analysis.reproducibilityScore !== undefined) && /*#__PURE__*/_jsxs("div", {
        className: "space-y-2",
        children: [/*#__PURE__*/_jsx(Text, {
          strong: true,
          className: "text-xs text-gray-600",
          children: "Component Scores:"
        }), /*#__PURE__*/_jsxs("div", {
          className: "grid grid-cols-2 gap-2 text-xs",
          children: [analysis.clarityScore !== undefined && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex justify-between",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Clarity"
              }), /*#__PURE__*/_jsxs("span", {
                children: [(analysis.clarityScore * 100).toFixed(0), "%"]
              })]
            }), /*#__PURE__*/_jsx(Progress, {
              percent: analysis.clarityScore * 100,
              size: "small",
              showInfo: false,
              strokeColor: getScoreColor(analysis.clarityScore)
            })]
          }), analysis.noveltyScore !== undefined && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex justify-between",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Novelty"
              }), /*#__PURE__*/_jsxs("span", {
                children: [(analysis.noveltyScore * 100).toFixed(0), "%"]
              })]
            }), /*#__PURE__*/_jsx(Progress, {
              percent: analysis.noveltyScore * 100,
              size: "small",
              showInfo: false,
              strokeColor: getScoreColor(analysis.noveltyScore)
            })]
          }), analysis.rigorScore !== undefined && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex justify-between",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Rigor"
              }), /*#__PURE__*/_jsxs("span", {
                children: [(analysis.rigorScore * 100).toFixed(0), "%"]
              })]
            }), /*#__PURE__*/_jsx(Progress, {
              percent: analysis.rigorScore * 100,
              size: "small",
              showInfo: false,
              strokeColor: getScoreColor(analysis.rigorScore)
            })]
          }), analysis.reproducibilityScore !== undefined && /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex justify-between",
              children: [/*#__PURE__*/_jsx("span", {
                children: "Reproducibility"
              }), /*#__PURE__*/_jsxs("span", {
                children: [(analysis.reproducibilityScore * 100).toFixed(0), "%"]
              })]
            }), /*#__PURE__*/_jsx(Progress, {
              percent: analysis.reproducibilityScore * 100,
              size: "small",
              showInfo: false,
              strokeColor: getScoreColor(analysis.reproducibilityScore)
            })]
          })]
        })]
      }), analysis.suggestions.length > 0 && /*#__PURE__*/_jsxs("div", {
        children: [/*#__PURE__*/_jsx(Text, {
          strong: true,
          className: "text-sm mb-2 block",
          children: "AI Suggestions:"
        }), /*#__PURE__*/_jsx(List, {
          size: "small",
          dataSource: analysis.suggestions,
          renderItem: suggestion => /*#__PURE__*/_jsx(List.Item, {
            className: "px-0 py-1",
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex items-start gap-2 text-xs",
              children: [getSuggestionIcon(suggestion.type), /*#__PURE__*/_jsx("span", {
                className: "flex-1",
                children: suggestion.message
              })]
            })
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-xs text-gray-500 pt-2 border-t",
        children: ["Analysis ", analysis.isComplete ? 'complete' : 'in progress']
      })]
    }) : /*#__PURE__*/_jsxs("div", {
      className: "text-center py-4",
      children: [/*#__PURE__*/_jsx(BulbOutlined, {
        className: "text-2xl text-gray-400 mb-2"
      }), /*#__PURE__*/_jsx(Text, {
        className: "text-gray-500 text-sm block",
        children: emptyStateMessage
      })]
    })
  });
};
export default AiAnalysisSidebar;