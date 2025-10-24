import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Steps, Button, Divider, Card } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Step
} = Steps;
const StepWizard = ({
  steps,
  currentStep,
  onStepChange,
  onFinish,
  isSubmitting = false,
  submitButtonText = 'Finish',
  submitButtonIcon,
  className,
  size = 'default',
  direction = 'horizontal',
  showProgress = true
}) => {
  const handleNext = async () => {
    const currentStepConfig = steps[currentStep];

    // Run validation if provided
    if (currentStepConfig.validation) {
      try {
        const isValid = await currentStepConfig.validation();
        if (!isValid) return;
      } catch (error) {
        console.error('Step validation failed:', error);
        return;
      }
    }
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const handleFinish = () => {
    onFinish?.();
  };
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  return /*#__PURE__*/_jsxs(Card, {
    className: className,
    children: [showProgress && /*#__PURE__*/_jsx(Steps, {
      current: currentStep,
      className: "mb-8",
      size: size,
      direction: direction,
      children: steps.map((step, index) => /*#__PURE__*/_jsx(Step, {
        title: step.title,
        description: step.description
      }, index))
    }), /*#__PURE__*/_jsx("div", {
      className: "min-h-[400px]",
      children: steps[currentStep]?.content
    }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsxs("div", {
      className: "flex justify-between items-center",
      children: [/*#__PURE__*/_jsx(Button, {
        onClick: handlePrevious,
        disabled: isFirstStep || isSubmitting,
        icon: /*#__PURE__*/_jsx(ArrowLeftOutlined, {}),
        children: "Previous"
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-sm text-gray-500",
        children: ["Step ", currentStep + 1, " of ", steps.length]
      }), isLastStep ? /*#__PURE__*/_jsx(Button, {
        type: "primary",
        onClick: handleFinish,
        loading: isSubmitting,
        icon: submitButtonIcon,
        size: "large",
        children: submitButtonText
      }) : /*#__PURE__*/_jsx(Button, {
        type: "primary",
        onClick: handleNext,
        icon: /*#__PURE__*/_jsx(ArrowRightOutlined, {}),
        children: "Next"
      })]
    })]
  });
};
export default StepWizard;