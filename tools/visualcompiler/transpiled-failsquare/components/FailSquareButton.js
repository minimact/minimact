import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button } from 'antd';
import { jsx as _jsx } from "react/jsx-runtime";
export const ButtonVariant = {
  Primary: 'primary',
  Secondary: 'secondary',
  Teal: 'teal',
  Danger: 'danger'
};
export const ButtonSize = {
  Small: 'small',
  Medium: 'medium',
  Large: 'large'
};
const FailSquareButton = ({
  children,
  iconName,
  variant = ButtonVariant.Primary,
  size = ButtonSize.Medium,
  disabled = false,
  fullWidth = false,
  intro = false,
  onClick,
  type = 'button',
  className
}) => {
  const getAntdVariant = () => {
    switch (variant) {
      case ButtonVariant.Primary:
        return 'primary';
      case ButtonVariant.Secondary:
        return 'default';
      case ButtonVariant.Danger:
        return 'primary';
      case ButtonVariant.Teal:
        return 'primary';
      default:
        return 'primary';
    }
  };
  const getAntdSize = () => {
    switch (size) {
      case ButtonSize.Small:
        return 'small';
      case ButtonSize.Large:
        return 'large';
      default:
        return 'middle';
    }
  };
  const getButtonClasses = () => {
    const classes = ['failsquare-button'];

    // Variant classes
    switch (variant) {
      case ButtonVariant.Primary:
        classes.push('failsquare-button-primary');
        break;
      case ButtonVariant.Secondary:
        classes.push('failsquare-button-secondary');
        break;
      case ButtonVariant.Teal:
        classes.push('failsquare-button-teal');
        break;
      case ButtonVariant.Danger:
        classes.push('failsquare-button-danger');
        break;
    }

    // Size classes
    switch (size) {
      case ButtonSize.Small:
        classes.push('failsquare-button-sm');
        break;
      case ButtonSize.Large:
        classes.push('failsquare-button-lg');
        break;
      default:
        classes.push('failsquare-button-md');
        break;
    }
    if (intro) {
      classes.push('failsquare-intro-button');
    }
    if (disabled) {
      classes.push('failsquare-button-disabled');
    }
    if (iconName) {
      classes.push('failsquare-button-with-icon');
    }
    if (fullWidth) {
      classes.push('failsquare-button-full-width');
    }
    return classes.join(' ');
  };
  const buttonStyle = {};

  // Custom styling for special variants
  if (variant === ButtonVariant.Teal) {
    buttonStyle.backgroundColor = '#14b8a6';
    buttonStyle.borderColor = '#14b8a6';
    buttonStyle.color = 'white';
  }
  if (variant === ButtonVariant.Danger) {
    buttonStyle.backgroundColor = '#ef4444';
    buttonStyle.borderColor = '#ef4444';
    buttonStyle.color = 'white';
  }

  // Intro button styling
  if (intro) {
    buttonStyle.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    buttonStyle.border = 'none';
    buttonStyle.boxShadow = '0 4px 15px 0 rgba(116, 75, 162, 0.4)';
    buttonStyle.color = 'white';
  }

  // Full width styling
  if (fullWidth) {
    buttonStyle.width = '100%';
  }
  return /*#__PURE__*/_jsx(Button, {
    type: getAntdVariant(),
    size: getAntdSize(),
    disabled: disabled,
    onClick: onClick,
    htmlType: type,
    icon: iconName,
    style: buttonStyle,
    className: `${getButtonClasses()} ${className || ''}`,
    children: children
  });
};
export default FailSquareButton;