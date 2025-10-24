import './button.css';
import { jsx as _jsx } from "react/jsx-runtime";
/** Primary UI component for user interaction */
export const Button = ({
  primary = false,
  size = 'medium',
  backgroundColor,
  label,
  ...props
}) => {
  const mode = primary ? 'storybook-button--primary' : 'storybook-button--secondary';
  return /*#__PURE__*/_jsx("button", {
    type: "button",
    className: ['storybook-button', `storybook-button--${size}`, mode].join(' '),
    style: {
      backgroundColor
    },
    ...props,
    children: label
  });
};