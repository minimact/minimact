import { useState, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Form, Steps, InputNumber, message, Divider, Spin, Alert } from 'antd';
import FailSquareCard from '../components/FailSquareCard';
import FailSquareButton from '../components/FailSquareButton';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import MarkdownEditor from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MarkdownEditor.js';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { failuresService } from '../services/api';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const {
  Step
} = Steps;
const EditFailurePage = () => {
  const {
    id
  } = useParams();
  const {
    navigateToTab
  } = useTabNavigation();
  const {
    user
  } = useAuth();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing] = useState(false);
  const [aiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState(null);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const domains = ['Machine Learning', 'Quantum Computing', 'Distributed Systems', 'Cryptography', 'Computer Vision', 'Natural Language Processing', 'Robotics', 'Blockchain', 'Bioinformatics', 'Hardware Design', 'Other'];
  const failureModes = ['Computational Complexity', 'Memory Constraints', 'Hardware Limitations', 'Theoretical Limitation', 'Network Latency', 'Scalability Issues', 'Implementation Difficulty', 'Resource Constraints', 'Mathematical Constraints', 'Other'];
  const steps = [{
    title: 'Basic Info',
    description: 'Title and context'
  }, {
    title: 'Approach',
    description: 'What you tried'
  }, {
    title: 'Method',
    description: 'How you did it'
  }, {
    title: 'Failure',
    description: 'What went wrong'
  }, {
    title: 'Boundaries',
    description: 'What was explored'
  }, {
    title: 'Revival',
    description: 'Future possibilities'
  }];
  useEffect(() => {
    loadFailure();
  }, [id]);
  const loadFailure = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      // Call actual API
      const post = await failuresService.getFailure(id);

      // Map PostDto back to form data
      const formData = {
        title: post.title,
        domain: post.domain || '',
        problemStatement: post.problemStatement || '',
        tags: post.tags,
        approachDescription: post.approachDescription || post.content,
        initialHypothesis: post.initialHypothesis || '',
        methodologyDescription: post.methodologyDescription || '',
        technologiesUsed: post.technologiesUsed || [],
        explorationDurationDays: post.explorationDurationDays,
        failureDescription: post.failureDescription || '',
        primaryFailureMode: post.primaryFailureMode || '',
        failureMetrics: [],
        variantsExplored: post.variantsExplored || [],
        unexploredAreas: post.unexploredAreas || '',
        revivalConditions: post.revivalConditions || '',
        potentialRevivalYear: post.potentialRevivalYear,
        requiredAdvances: post.requiredAdvances || [],
        resourceLinks: post.resourceLinks || [],
        square: post.squareId
      };
      setFailure(formData);
      form.setFieldsValue(formData);
    } catch (err) {
      console.error('Error loading failure:', err);
      setError('Failed to load failure documentation. Please try again.');
      message.error('Failed to load failure documentation');
    } finally {
      setLoading(false);
    }
  };
  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } catch (err) {
      message.error('Please fill in all required fields');
    }
  };
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };
  const handleSaveDraft = async () => {
    if (!user || !id) {
      message.error('You must be logged in to save a draft');
      navigateToTab('/login', 'Login');
      return;
    }
    try {
      const formData = form.getFieldsValue();
      const fullContent = `
# Problem Statement
${formData.problemStatement || ''}

# The Approach
${formData.approachDescription || ''}

## Initial Hypothesis
${formData.initialHypothesis || ''}

# The Method
${formData.methodologyDescription || ''}

${formData.technologiesUsed?.length ? `**Technologies Used:** ${formData.technologiesUsed.join(', ')}` : ''}
${formData.explorationDurationDays ? `**Exploration Duration:** ${formData.explorationDurationDays} days` : ''}

# The Failure
**Primary Failure Mode:** ${formData.primaryFailureMode || ''}

${formData.failureDescription || ''}

# The Boundaries
${formData.variantsExplored?.length ? `**Variants Explored:**\n${formData.variantsExplored.map(v => `- ${v}`).join('\n')}` : ''}

## Unexplored Areas
${formData.unexploredAreas || ''}

# Revival Conditions
${formData.revivalConditions || ''}

${formData.potentialRevivalYear ? `**Potential Revival Year:** ${formData.potentialRevivalYear}` : ''}
${formData.requiredAdvances?.length ? `**Required Advances:**\n${formData.requiredAdvances.map(a => `- ${a}`).join('\n')}` : ''}

${formData.resourceLinks?.length ? `\n## Resources\n${formData.resourceLinks.map(l => `- ${l}`).join('\n')}` : ''}
      `.trim();
      const command = {
        postId: id,
        editorId: user.id,
        title: formData.title,
        content: fullContent,
        tags: formData.tags || [],
        tagCategories: [{
          name: 'domain',
          tags: [formData.domain]
        }]
      };
      await failuresService.updateFailure(id, command);
      message.success('Draft saved successfully');
    } catch (err) {
      console.error('Failed to save draft:', err);
      message.error('Failed to save draft');
    }
  };
  const handleSubmit = async () => {
    if (!user || !id) {
      message.error('You must be logged in to update a failure');
      navigateToTab('/login', 'Login');
      return;
    }
    try {
      await form.validateFields();
      setIsUpdating(true);
      const formData = form.getFieldsValue();

      // Combine all content sections into a single content string (same as SubmitFailurePage)
      const fullContent = `
# Problem Statement
${formData.problemStatement || ''}

# The Approach
${formData.approachDescription || ''}

## Initial Hypothesis
${formData.initialHypothesis || ''}

# The Method
${formData.methodologyDescription || ''}

${formData.technologiesUsed?.length ? `**Technologies Used:** ${formData.technologiesUsed.join(', ')}` : ''}
${formData.explorationDurationDays ? `**Exploration Duration:** ${formData.explorationDurationDays} days` : ''}

# The Failure
**Primary Failure Mode:** ${formData.primaryFailureMode || ''}

${formData.failureDescription || ''}

# The Boundaries
${formData.variantsExplored?.length ? `**Variants Explored:**\n${formData.variantsExplored.map(v => `- ${v}`).join('\n')}` : ''}

## Unexplored Areas
${formData.unexploredAreas || ''}

# Revival Conditions
${formData.revivalConditions || ''}

${formData.potentialRevivalYear ? `**Potential Revival Year:** ${formData.potentialRevivalYear}` : ''}
${formData.requiredAdvances?.length ? `**Required Advances:**\n${formData.requiredAdvances.map(a => `- ${a}`).join('\n')}` : ''}

${formData.resourceLinks?.length ? `\n## Resources\n${formData.resourceLinks.map(l => `- ${l}`).join('\n')}` : ''}
      `.trim();

      // Create command for API
      const command = {
        postId: id,
        editorId: user.id,
        title: formData.title,
        content: fullContent,
        tags: formData.tags || [],
        tagCategories: [{
          name: 'domain',
          tags: [formData.domain]
        }]
      };

      // Call API
      const updatedPost = await failuresService.updateFailure(id, command);
      message.success('Failure documentation updated successfully!');
      navigateToTab(`/failures/${updatedPost.id}`, updatedPost.title, {
        closable: true
      });
    } catch (error) {
      console.error('Failed to update:', error);
      if (error?.errors) {
        message.error('Please complete all required fields');
      } else {
        message.error('Failed to update failure documentation');
      }
    } finally {
      setIsUpdating(false);
    }
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Title",
            name: "title",
            rules: [{
              required: true,
              message: 'Please enter a title'
            }],
            children: /*#__PURE__*/_jsx(Input, {
              placeholder: "A descriptive title for your failed approach",
              size: "large",
              maxLength: 200,
              showCount: true
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Domain",
            name: "domain",
            rules: [{
              required: true,
              message: 'Please select a domain'
            }],
            children: /*#__PURE__*/_jsx(Select, {
              placeholder: "Select primary domain",
              size: "large",
              children: domains.map(d => /*#__PURE__*/_jsx(Select.Option, {
                value: d,
                children: d
              }, d))
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Problem Statement",
            name: "problemStatement",
            rules: [{
              required: true,
              message: 'Please describe the problem'
            }],
            children: /*#__PURE__*/_jsx(TextArea, {
              rows: 4,
              placeholder: "What problem were you trying to solve?",
              maxLength: 1000,
              showCount: true
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Square",
            name: "square",
            children: /*#__PURE__*/_jsxs(Select, {
              placeholder: "Post to a specific Square (optional)",
              size: "large",
              children: [/*#__PURE__*/_jsx(Select.Option, {
                value: "quantum",
                children: "Quantum Computing Square"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "neural",
                children: "Neural Architecture Square"
              }), /*#__PURE__*/_jsx(Select.Option, {
                value: "distributed",
                children: "Distributed Systems Square"
              })]
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Tags",
            name: "tags",
            children: /*#__PURE__*/_jsx(Select, {
              mode: "tags",
              placeholder: "Add tags (e.g., Neural Networks, GPU)",
              maxTagCount: 5
            })
          })]
        });
      case 1:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Approach Description",
            name: "approachDescription",
            rules: [{
              required: true,
              message: 'Please describe your approach'
            }],
            extra: "What was attempted and why did it seem promising?",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('approachDescription'),
              onChange: value => form.setFieldValue('approachDescription', value),
              placeholder: "Describe the approach you took and why you thought it would work...",
              height: "300px"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Initial Hypothesis",
            name: "initialHypothesis",
            rules: [{
              required: true,
              message: 'Please state your hypothesis'
            }],
            extra: "What was your initial reasoning or hypothesis?",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('initialHypothesis'),
              onChange: value => form.setFieldValue('initialHypothesis', value),
              placeholder: "e.g., We hypothesized that using tensors as vectors would reduce computational complexity...",
              height: "250px"
            })
          })]
        });
      case 2:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Methodology",
            name: "methodologyDescription",
            rules: [{
              required: true,
              message: 'Please describe your methodology'
            }],
            extra: "How was it implemented and tested?",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('methodologyDescription'),
              onChange: value => form.setFieldValue('methodologyDescription', value),
              placeholder: "Describe how you implemented and tested your approach...",
              height: "300px"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Technologies Used",
            name: "technologiesUsed",
            extra: "Tools, frameworks, and technologies",
            children: /*#__PURE__*/_jsx(Select, {
              mode: "tags",
              placeholder: "e.g., PyTorch, CUDA, Docker"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Exploration Duration (days)",
            name: "explorationDurationDays",
            extra: "How long did you work on this?",
            children: /*#__PURE__*/_jsx(InputNumber, {
              min: 1,
              placeholder: "e.g., 45",
              style: {
                width: '100%'
              }
            })
          })]
        });
      case 3:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Failure Description",
            name: "failureDescription",
            rules: [{
              required: true,
              message: 'Please describe what went wrong'
            }],
            extra: "What specifically failed? Include quantitative results if applicable.",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('failureDescription'),
              onChange: value => form.setFieldValue('failureDescription', value),
              placeholder: "Describe what went wrong, with specific metrics and observations...",
              height: "300px"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Primary Failure Mode",
            name: "primaryFailureMode",
            rules: [{
              required: true,
              message: 'Please select the primary failure mode'
            }],
            children: /*#__PURE__*/_jsx(Select, {
              placeholder: "What was the main cause of failure?",
              children: failureModes.map(mode => /*#__PURE__*/_jsx(Select.Option, {
                value: mode,
                children: mode
              }, mode))
            })
          })]
        });
      case 4:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Variants Explored",
            name: "variantsExplored",
            extra: "What different approaches or parameters did you try?",
            children: /*#__PURE__*/_jsx(Select, {
              mode: "tags",
              placeholder: "e.g., Different batch sizes, Alternative architectures"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Unexplored Areas",
            name: "unexploredAreas",
            extra: "What wasn't explored and why?",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('unexploredAreas'),
              onChange: value => form.setFieldValue('unexploredAreas', value),
              placeholder: "Describe what you didn't try due to time, resources, or other constraints...",
              height: "250px"
            })
          })]
        });
      case 5:
        return /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(Form.Item, {
            label: "Revival Conditions",
            name: "revivalConditions",
            extra: "Under what circumstances might this approach become viable?",
            children: /*#__PURE__*/_jsx(MarkdownEditor, {
              value: form.getFieldValue('revivalConditions'),
              onChange: value => form.setFieldValue('revivalConditions', value),
              placeholder: "e.g., With 10x more memory, better algorithms for X, quantum hardware...",
              height: "300px"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Potential Revival Year",
            name: "potentialRevivalYear",
            extra: "Estimated year when conditions might be met (optional)",
            children: /*#__PURE__*/_jsx(InputNumber, {
              min: 2024,
              max: 2100,
              placeholder: "e.g., 2027",
              style: {
                width: '100%'
              }
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Required Advances",
            name: "requiredAdvances",
            extra: "Specific technological or theoretical advances needed",
            children: /*#__PURE__*/_jsx(Select, {
              mode: "tags",
              placeholder: "e.g., Better GPU memory, New consensus algorithms"
            })
          }), /*#__PURE__*/_jsx(Form.Item, {
            label: "Resource Links",
            name: "resourceLinks",
            extra: "Links to code, papers, or related resources",
            children: /*#__PURE__*/_jsx(Select, {
              mode: "tags",
              placeholder: "https://github.com/..., https://arxiv.org/..."
            })
          })]
        });
      default:
        return null;
    }
  };
  if (loading) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx("div", {
        className: "flex justify-center items-center h-96",
        children: /*#__PURE__*/_jsx(Spin, {
          size: "large",
          tip: "Loading failure documentation..."
        })
      })
    });
  }
  if (error || !failure) {
    return /*#__PURE__*/_jsx(MainLayout, {
      children: /*#__PURE__*/_jsx("div", {
        className: "max-w-2xl mx-auto mt-8",
        children: /*#__PURE__*/_jsx(Alert, {
          message: "Error",
          description: error || 'Failure documentation not found',
          type: "error",
          showIcon: true,
          action: /*#__PURE__*/_jsx(FailSquareButton, {
            size: "small",
            onClick: () => navigateToTab('/dashboard', 'Dashboard', {
              closable: false
            }),
            children: "Back to Dashboard"
          })
        })
      })
    });
  }
  return /*#__PURE__*/_jsxs(MainLayout, {
    children: [/*#__PURE__*/_jsx("div", {
      className: "mb-6",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex items-center justify-between",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center space-x-4",
          children: [/*#__PURE__*/_jsx(FailSquareButton, {
            icon: /*#__PURE__*/_jsx(ArrowLeftOutlined, {}),
            onClick: () => navigateToTab(`/failures/${id}`, 'View Failure', {
              closable: true
            }),
            children: "Back"
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h1", {
              className: "text-2xl font-bold",
              children: "Edit Failure Documentation"
            }), /*#__PURE__*/_jsx("p", {
              className: "text-gray-500",
              children: "Update your failure documentation"
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex space-x-2",
          children: [/*#__PURE__*/_jsx(FailSquareButton, {
            icon: /*#__PURE__*/_jsx(SaveOutlined, {}),
            onClick: handleSaveDraft,
            disabled: isUpdating,
            children: "Save Draft"
          }), currentStep === steps.length - 1 && /*#__PURE__*/_jsx(FailSquareButton, {
            type: "primary",
            icon: /*#__PURE__*/_jsx(SendOutlined, {}),
            onClick: handleSubmit,
            loading: isUpdating,
            children: "Update"
          })]
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex space-x-6",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-2/3",
        children: /*#__PURE__*/_jsxs(FailSquareCard, {
          children: [/*#__PURE__*/_jsx(Steps, {
            current: currentStep,
            className: "mb-8",
            children: steps.map((step, index) => /*#__PURE__*/_jsx(Step, {
              title: step.title,
              description: step.description
            }, index))
          }), /*#__PURE__*/_jsx(Form, {
            form: form,
            layout: "vertical",
            size: "large",
            children: renderStepContent()
          }), /*#__PURE__*/_jsx(Divider, {}), /*#__PURE__*/_jsxs("div", {
            className: "flex justify-between",
            children: [/*#__PURE__*/_jsx(FailSquareButton, {
              onClick: handlePrevious,
              disabled: currentStep === 0,
              children: "Previous"
            }), currentStep < steps.length - 1 ? /*#__PURE__*/_jsx(FailSquareButton, {
              type: "primary",
              onClick: handleNext,
              children: "Next"
            }) : /*#__PURE__*/_jsx(FailSquareButton, {
              type: "primary",
              icon: /*#__PURE__*/_jsx(SendOutlined, {}),
              onClick: handleSubmit,
              loading: isUpdating,
              children: "Update Failure Documentation"
            })]
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "w-1/3 space-y-4",
        children: [/*#__PURE__*/_jsx(Card, {
          title: "AI Analysis",
          loading: isAnalyzing,
          children: aiAnalysis ? /*#__PURE__*/_jsxs("div", {
            className: "space-y-4",
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex justify-between text-sm mb-1",
                children: [/*#__PURE__*/_jsx("span", {
                  children: "Estimated Merit Score"
                }), /*#__PURE__*/_jsxs("span", {
                  className: "font-medium",
                  children: [(aiAnalysis.score * 100).toFixed(0), "%"]
                })]
              }), /*#__PURE__*/_jsx(Progress, {
                percent: aiAnalysis.score * 100,
                strokeColor: aiAnalysis.score >= 0.8 ? '#52c41a' : aiAnalysis.score >= 0.6 ? '#1890ff' : '#faad14'
              })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-2",
                children: "Suggestions"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "space-y-2 text-sm text-gray-600",
                children: [/*#__PURE__*/_jsx("li", {
                  children: "\u2022 Add more quantitative metrics"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Include specific error messages or logs"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Describe variants attempted in detail"
                })]
              })]
            })]
          }) : /*#__PURE__*/_jsx("p", {
            className: "text-gray-500 text-sm",
            children: "Fill in the form to get AI-powered suggestions for improving your documentation quality"
          })
        }), /*#__PURE__*/_jsx(Card, {
          title: "Documentation Guide",
          children: /*#__PURE__*/_jsx("div", {
            className: "space-y-3 text-sm",
            children: /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("h4", {
                className: "font-medium mb-1",
                children: "High-Quality Documentation"
              }), /*#__PURE__*/_jsxs("ul", {
                className: "text-gray-600 space-y-1",
                children: [/*#__PURE__*/_jsx("li", {
                  children: "\u2022 Be specific with metrics and measurements"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Include reproduction steps"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Document all variants tried"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Explain failure modes clearly"
                }), /*#__PURE__*/_jsx("li", {
                  children: "\u2022 Link to code and resources"
                })]
              })]
            })
          })
        }), /*#__PURE__*/_jsx(Card, {
          title: "Progress",
          children: /*#__PURE__*/_jsxs("div", {
            className: "text-center",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "text-4xl font-bold text-blue-500",
              children: [Math.round((currentStep + 1) / steps.length * 100), "%"]
            }), /*#__PURE__*/_jsxs("div", {
              className: "text-gray-500 text-sm mt-1",
              children: ["Step ", currentStep + 1, " of ", steps.length]
            })]
          })
        })]
      })]
    })]
  });
};
export default EditFailurePage;