import { fn } from '@storybook/test';
import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Form, Input, Select, message } from 'antd';
import { SendOutlined, ExperimentOutlined } from '@ant-design/icons';
import StepWizard from './StepWizard';
import MarkdownEditor from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MarkdownEditor.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  TextArea
} = Input;
const meta = {
  title: 'FailSquare/StepWizard',
  component: StepWizard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A flexible step wizard component for multi-step forms. Used in FailSquare for failure documentation submission, user onboarding, and other multi-step processes.'
      }
    }
  },
  argTypes: {
    currentStep: {
      control: {
        type: 'number',
        min: 0,
        max: 5
      },
      description: 'Current active step (0-indexed)'
    },
    size: {
      control: 'radio',
      options: ['default', 'small'],
      description: 'Size of the steps component'
    },
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Direction of steps display'
    },
    showProgress: {
      control: 'boolean',
      description: 'Whether to show the progress steps'
    },
    isSubmitting: {
      control: 'boolean',
      description: 'Loading state for final submit'
    }
  }
};
export default meta;
// Interactive wrapper with state
const StepWizardWithState = args => {
  const [currentStep, setCurrentStep] = useState(args.currentStep || 0);
  const [form] = Form.useForm();
  const validateStep = async () => {
    try {
      await form.validateFields();
      return true;
    } catch (error) {
      message.error('Please fill in all required fields');
      return false;
    }
  };
  const steps = [{
    title: 'Basic Info',
    description: 'Project details',
    validation: validateStep,
    content: /*#__PURE__*/_jsxs(Form, {
      form: form,
      layout: "vertical",
      children: [/*#__PURE__*/_jsx(Form.Item, {
        label: "Project Title",
        name: "title",
        rules: [{
          required: true,
          message: 'Please enter a title'
        }],
        children: /*#__PURE__*/_jsx(Input, {
          placeholder: "Enter your project title",
          size: "large"
        })
      }), /*#__PURE__*/_jsx(Form.Item, {
        label: "Domain",
        name: "domain",
        rules: [{
          required: true,
          message: 'Please select a domain'
        }],
        children: /*#__PURE__*/_jsxs(Select, {
          placeholder: "Select domain",
          size: "large",
          children: [/*#__PURE__*/_jsx(Select.Option, {
            value: "ml",
            children: "Machine Learning"
          }), /*#__PURE__*/_jsx(Select.Option, {
            value: "quantum",
            children: "Quantum Computing"
          }), /*#__PURE__*/_jsx(Select.Option, {
            value: "distributed",
            children: "Distributed Systems"
          })]
        })
      })]
    })
  }, {
    title: 'Approach',
    description: 'What you tried',
    content: /*#__PURE__*/_jsx(Form, {
      form: form,
      layout: "vertical",
      children: /*#__PURE__*/_jsx(Form.Item, {
        label: "Approach Description",
        name: "approach",
        children: /*#__PURE__*/_jsx(MarkdownEditor, {
          placeholder: "Describe your approach...",
          height: "300px"
        })
      })
    })
  }, {
    title: 'Implementation',
    description: 'How you did it',
    content: /*#__PURE__*/_jsxs(Form, {
      form: form,
      layout: "vertical",
      children: [/*#__PURE__*/_jsx(Form.Item, {
        label: "Implementation Details",
        name: "implementation",
        children: /*#__PURE__*/_jsx(TextArea, {
          rows: 6,
          placeholder: "Describe your implementation..."
        })
      }), /*#__PURE__*/_jsx(Form.Item, {
        label: "Technologies Used",
        name: "technologies",
        children: /*#__PURE__*/_jsxs(Select, {
          mode: "tags",
          placeholder: "e.g., React, Node.js, PostgreSQL",
          children: [/*#__PURE__*/_jsx(Select.Option, {
            value: "react",
            children: "React"
          }), /*#__PURE__*/_jsx(Select.Option, {
            value: "nodejs",
            children: "Node.js"
          }), /*#__PURE__*/_jsx(Select.Option, {
            value: "python",
            children: "Python"
          })]
        })
      })]
    })
  }, {
    title: 'Results',
    description: 'What happened',
    content: /*#__PURE__*/_jsx(Form, {
      form: form,
      layout: "vertical",
      children: /*#__PURE__*/_jsx(Form.Item, {
        label: "Results",
        name: "results",
        children: /*#__PURE__*/_jsx(TextArea, {
          rows: 6,
          placeholder: "Describe your results and what went wrong..."
        })
      })
    })
  }];
  return /*#__PURE__*/_jsx(StepWizard, {
    ...args,
    steps: steps,
    currentStep: currentStep,
    onStepChange: step => {
      setCurrentStep(step);
      fn()(step);
    },
    onFinish: () => {
      fn()();
      message.success('Form submitted successfully!');
    }
  });
};
export const Default = {
  args: {
    currentStep: 0,
    isSubmitting: false,
    submitButtonText: 'Submit',
    submitButtonIcon: /*#__PURE__*/_jsx(SendOutlined, {}),
    showProgress: true,
    size: 'default',
    direction: 'horizontal'
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  })
};
export const WithCustomSubmitButton = {
  args: {
    ...Default.args,
    submitButtonText: 'Document Failure',
    submitButtonIcon: /*#__PURE__*/_jsx(ExperimentOutlined, {})
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  }),
  parameters: {
    docs: {
      description: {
        story: 'Custom submit button text and icon for FailSquare-specific workflows.'
      }
    }
  }
};
export const VerticalLayout = {
  args: {
    ...Default.args,
    direction: 'vertical'
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  }),
  parameters: {
    docs: {
      description: {
        story: 'Vertical layout for narrower screens or sidebar placement.'
      }
    }
  }
};
export const SmallSize = {
  args: {
    ...Default.args,
    size: 'small'
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  }),
  parameters: {
    docs: {
      description: {
        story: 'Compact size for embedded use or limited space.'
      }
    }
  }
};
export const WithoutProgressSteps = {
  args: {
    ...Default.args,
    showProgress: false
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  }),
  parameters: {
    docs: {
      description: {
        story: 'Hide the progress steps for a cleaner look when steps are obvious from context.'
      }
    }
  }
};
export const SubmittingState = {
  args: {
    ...Default.args,
    currentStep: 3,
    // Last step
    isSubmitting: true
  },
  render: args => /*#__PURE__*/_jsx(StepWizardWithState, {
    ...args
  }),
  parameters: {
    docs: {
      description: {
        story: 'Loading state during form submission.'
      }
    }
  }
};

// Simple static example without form validation
export const SimpleExample = {
  render: () => {
    const [currentStep, setCurrentStep] = useState(0);
    const simpleSteps = [{
      title: 'Welcome',
      description: 'Getting started',
      content: /*#__PURE__*/_jsxs("div", {
        className: "text-center py-8",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-xl font-semibold mb-4",
          children: "Welcome to FailSquare"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-600",
          children: "Let's get you set up to start documenting and exploring research failures."
        })]
      })
    }, {
      title: 'Profile',
      description: 'Your information',
      content: /*#__PURE__*/_jsxs("div", {
        className: "py-8",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-xl font-semibold mb-4",
          children: "Set up your profile"
        }), /*#__PURE__*/_jsxs("div", {
          className: "space-y-4",
          children: [/*#__PURE__*/_jsx(Input, {
            placeholder: "Display name",
            size: "large"
          }), /*#__PURE__*/_jsx(Input, {
            placeholder: "Research institution",
            size: "large"
          }), /*#__PURE__*/_jsxs(Select, {
            placeholder: "Primary research domain",
            size: "large",
            className: "w-full",
            children: [/*#__PURE__*/_jsx(Select.Option, {
              value: "cs",
              children: "Computer Science"
            }), /*#__PURE__*/_jsx(Select.Option, {
              value: "physics",
              children: "Physics"
            }), /*#__PURE__*/_jsx(Select.Option, {
              value: "bio",
              children: "Biology"
            })]
          })]
        })]
      })
    }, {
      title: 'Complete',
      description: 'All done!',
      content: /*#__PURE__*/_jsxs("div", {
        className: "text-center py-8",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "text-xl font-semibold mb-4",
          children: "You're all set!"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-600",
          children: "Your FailSquare account is ready. Start exploring documented failures or share your own."
        })]
      })
    }];
    return /*#__PURE__*/_jsx(StepWizard, {
      steps: simpleSteps,
      currentStep: currentStep,
      onStepChange: setCurrentStep,
      onFinish: () => message.success('Setup completed!'),
      submitButtonText: "Get Started"
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple example with static content, no form validation.'
      }
    }
  }
};