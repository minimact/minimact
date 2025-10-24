import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button, Tag, Typography, Avatar } from 'antd';
import { SettingOutlined, ShareAltOutlined, UserOutlined } from '@ant-design/icons';
import StatCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/StatCard.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Title,
  Text
} = Typography;
const ProfileHeader = ({
  username,
  joinDate,
  bio,
  interests,
  stats = [],
  isOwnProfile = false,
  avatar,
  onEditProfile,
  onShareProfile,
  className
}) => {
  return /*#__PURE__*/_jsxs("div", {
    className: `bg-white border border-gray-200 rounded-lg p-6 ${className || ''}`,
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex gap-4",
        children: [/*#__PURE__*/_jsx(Avatar, {
          size: 80,
          src: avatar,
          icon: !avatar && /*#__PURE__*/_jsx(UserOutlined, {}),
          className: "flex-shrink-0"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex-1",
          children: [/*#__PURE__*/_jsx(Title, {
            level: 2,
            className: "mb-2",
            children: username
          }), /*#__PURE__*/_jsxs(Text, {
            className: "text-gray-600 block mb-2",
            children: ["Joined ", joinDate]
          }), /*#__PURE__*/_jsx(Text, {
            className: "text-gray-700 block mb-3",
            children: bio
          }), interests.length > 0 && /*#__PURE__*/_jsx("div", {
            className: "flex flex-wrap gap-2",
            children: interests.map((interest, index) => /*#__PURE__*/_jsx(Tag, {
              className: "mb-1",
              children: interest
            }, index))
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2 flex-shrink-0",
        children: [isOwnProfile && /*#__PURE__*/_jsx(Button, {
          type: "default",
          icon: /*#__PURE__*/_jsx(SettingOutlined, {}),
          onClick: onEditProfile,
          children: "Edit Profile"
        }), /*#__PURE__*/_jsx(Button, {
          type: "primary",
          icon: /*#__PURE__*/_jsx(ShareAltOutlined, {}),
          onClick: onShareProfile,
          children: "Share Profile"
        })]
      })]
    }), stats.length > 0 && /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
      children: stats.map((stat, index) => /*#__PURE__*/_jsx(StatCard, {
        icon: stat.icon,
        label: stat.label,
        value: stat.value,
        trend: stat.trend ? {
          value: stat.trend,
          direction: stat.trend.startsWith('+') ? 'up' : stat.trend.startsWith('-') ? 'down' : 'neutral'
        } : undefined,
        size: "small"
      }, index))
    })]
  });
};
export default ProfileHeader;