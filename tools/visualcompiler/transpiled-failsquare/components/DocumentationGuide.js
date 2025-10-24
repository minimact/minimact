import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Typography, List, Collapse, Tag } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Text
} = Typography;
const {
  Panel
} = Collapse;
const defaultSections = [{
  title: 'High-Quality Documentation',
  tips: [{
    id: 'specific-metrics',
    text: 'Be specific with metrics and measurements',
    type: 'success',
    priority: 'high'
  }, {
    id: 'reproduction-steps',
    text: 'Include reproduction steps',
    type: 'info',
    priority: 'high'
  }, {
    id: 'document-variants',
    text: 'Document all variants tried',
    type: 'tip',
    priority: 'medium'
  }, {
    id: 'failure-modes',
    text: 'Explain failure modes clearly',
    type: 'warning',
    priority: 'high'
  }, {
    id: 'link-resources',
    text: 'Link to code and resources',
    type: 'info',
    priority: 'medium'
  }]
}, {
  title: 'What Makes Failures Valuable',
  collapsible: true,
  tips: [{
    id: 'systematic-exploration',
    text: 'Systematic exploration with clear methodology',
    type: 'success'
  }, {
    id: 'quantitative-results',
    text: 'Quantitative results and error analysis',
    type: 'info'
  }, {
    id: 'novel-approaches',
    text: 'Novel approaches that haven\'t been tried before',
    type: 'tip'
  }, {
    id: 'clear-boundaries',
    text: 'Clear documentation of what was and wasn\'t explored',
    type: 'warning'
  }]
}, {
  title: 'Common Mistakes to Avoid',
  collapsible: true,
  tips: [{
    id: 'vague-descriptions',
    text: 'Avoid vague descriptions like "it didn\'t work"',
    type: 'warning',
    priority: 'high'
  }, {
    id: 'missing-context',
    text: 'Don\'t omit important context or constraints',
    type: 'warning',
    priority: 'medium'
  }, {
    id: 'no-quantification',
    text: 'Avoid subjective assessments without data',
    type: 'tip',
    priority: 'medium'
  }]
}];
const DocumentationGuide = ({
  title = 'Documentation Guide',
  sections = defaultSections,
  className,
  size = 'default',
  collapsible = false
}) => {
  const getTipIcon = (type = 'info') => {
    switch (type) {
      case 'success':
        return /*#__PURE__*/_jsx(CheckCircleOutlined, {
          className: "text-green-500"
        });
      case 'warning':
        return /*#__PURE__*/_jsx(WarningOutlined, {
          className: "text-yellow-500"
        });
      case 'tip':
        return /*#__PURE__*/_jsx(BulbOutlined, {
          className: "text-blue-500"
        });
      case 'info':
      default:
        return /*#__PURE__*/_jsx(InfoCircleOutlined, {
          className: "text-gray-500"
        });
    }
  };
  const getPriorityTag = priority => {
    if (!priority) return null;
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'default'
    };
    return /*#__PURE__*/_jsx(Tag, {
      color: colors[priority],
      children: priority
    });
  };
  const renderTips = tips => /*#__PURE__*/_jsx(List, {
    size: "small",
    dataSource: tips,
    renderItem: tip => /*#__PURE__*/_jsx(List.Item, {
      className: "px-0 py-1",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-start gap-2 w-full",
        children: [getTipIcon(tip.type), /*#__PURE__*/_jsxs("div", {
          className: "flex-1",
          children: [/*#__PURE__*/_jsx(Text, {
            className: size === 'small' ? 'text-xs' : 'text-sm',
            children: tip.text
          }), tip.priority && /*#__PURE__*/_jsx("div", {
            className: "mt-1",
            children: getPriorityTag(tip.priority)
          })]
        })]
      })
    })
  });
  const renderSection = (section, index) => {
    if (section.collapsible || collapsible) {
      return /*#__PURE__*/_jsx(Collapse, {
        size: "small",
        ghost: true,
        defaultActiveKey: section.defaultExpanded !== false ? [`panel-${index}`] : [],
        children: /*#__PURE__*/_jsx(Panel, {
          header: section.title,
          children: renderTips(section.tips)
        }, `panel-${index}`)
      }, `section-${index}`);
    }
    return /*#__PURE__*/_jsxs("div", {
      className: "mb-4 last:mb-0",
      children: [/*#__PURE__*/_jsx(Text, {
        strong: true,
        className: `block mb-2 ${size === 'small' ? 'text-sm' : ''}`,
        children: section.title
      }), renderTips(section.tips)]
    }, `section-${index}`);
  };
  return /*#__PURE__*/_jsx(Card, {
    title: title,
    className: className,
    size: size,
    children: /*#__PURE__*/_jsx("div", {
      className: "space-y-3",
      children: sections.map((section, index) => renderSection(section, index))
    })
  });
};
export default DocumentationGuide;