import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Card, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Text
} = Typography;
const StatCard = ({
  icon,
  label,
  value,
  trend,
  description,
  loading = false,
  className,
  size = 'default',
  variant = 'default'
}) => {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return /*#__PURE__*/_jsx(ArrowUpOutlined, {
          className: "text-green-500"
        });
      case 'down':
        return /*#__PURE__*/_jsx(ArrowDownOutlined, {
          className: "text-red-500"
        });
      case 'neutral':
        return /*#__PURE__*/_jsx(MinusOutlined, {
          className: "text-gray-500"
        });
      default:
        return null;
    }
  };
  const getTrendColor = () => {
    if (trend?.color) return trend.color;
    switch (trend?.direction) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'neutral':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };
  const getCardStyles = () => {
    const baseStyles = 'transition-all duration-200 hover:shadow-md';
    switch (variant) {
      case 'outlined':
        return `${baseStyles} border-2`;
      case 'filled':
        return `${baseStyles} bg-gradient-to-br from-blue-50 to-indigo-50`;
      default:
        return baseStyles;
    }
  };
  const getValueSize = () => {
    switch (size) {
      case 'small':
        return 'text-xl font-bold';
      case 'large':
        return 'text-4xl font-bold';
      default:
        return 'text-3xl font-bold';
    }
  };
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'text-lg';
      case 'large':
        return 'text-3xl';
      default:
        return 'text-2xl';
    }
  };
  return /*#__PURE__*/_jsxs(Card, {
    loading: loading,
    className: `${getCardStyles()} ${className || ''}`,
    size: size === 'small' ? 'small' : 'default',
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-start justify-between mb-4",
      children: [/*#__PURE__*/_jsx("div", {
        className: `text-blue-600 ${getIconSize()}`,
        children: icon
      }), trend && /*#__PURE__*/_jsxs("div", {
        className: `flex items-center gap-1 text-sm ${getTrendColor()}`,
        children: [getTrendIcon(), /*#__PURE__*/_jsx("span", {
          className: "font-medium",
          children: trend.value
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "space-y-2",
      children: [/*#__PURE__*/_jsx("div", {
        className: `text-gray-900 ${getValueSize()}`,
        children: value
      }), /*#__PURE__*/_jsx("div", {
        children: /*#__PURE__*/_jsx(Text, {
          className: "text-gray-600 font-medium",
          children: label
        })
      }), description && /*#__PURE__*/_jsx("div", {
        children: /*#__PURE__*/_jsx(Text, {
          className: "text-gray-500 text-sm",
          children: description
        })
      })]
    })]
  });
};
export default StatCard;