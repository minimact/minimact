import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Steps, Card, Button, Checkbox, Alert, Tag, Result, Space, Slider } from 'antd';
import { useTabNavigation } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Step
} = Steps;
const OnboardingPage = () => {
  const {
    navigateToTab
  } = useTabNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState(new Set());
  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [feedPreferences, setFeedPreferences] = useState([{
    key: 'clarity',
    label: 'Content Clarity',
    description: 'How well-documented and understandable the failure documentation should be',
    value: 0.6
  }, {
    key: 'novelty',
    label: 'Original Approaches',
    description: 'Preference for unique approaches and unexplored territories',
    value: 0.5
  }, {
    key: 'rigor',
    label: 'Scientific Rigor',
    description: 'How thoroughly the failure was explored and documented',
    value: 0.7
  }, {
    key: 'contribution',
    label: 'Knowledge Value',
    description: 'How much the failure documentation adds to collective knowledge',
    value: 0.6
  }]);
  const interestCategories = [{
    id: 'ml',
    name: 'Machine Learning',
    description: 'Neural networks, deep learning, and AI systems'
  }, {
    id: 'quantum',
    name: 'Quantum Computing',
    description: 'Quantum algorithms, hardware, and applications'
  }, {
    id: 'distributed',
    name: 'Distributed Systems',
    description: 'Scalability, consensus, and distributed computing'
  }, {
    id: 'crypto',
    name: 'Cryptography',
    description: 'Encryption, security protocols, and privacy'
  }, {
    id: 'robotics',
    name: 'Robotics',
    description: 'Hardware, control systems, and automation'
  }, {
    id: 'biotech',
    name: 'Biotechnology',
    description: 'Bioinformatics, synthetic biology, and medical tech'
  }];
  const recommendedSquares = [{
    id: 'sq1',
    name: 'Machine Learning Square',
    slug: 'ml-square',
    description: 'Failed approaches in neural networks, deep learning, and AI systems',
    meritScore: 0.85,
    tags: ['Neural Networks', 'Deep Learning', 'GPU']
  }, {
    id: 'sq2',
    name: 'Quantum Computing Square',
    slug: 'quantum-square',
    description: 'Quantum algorithms and hardware attempts that didn\'t work out',
    meritScore: 0.78,
    tags: ['Quantum', 'Algorithms', 'Hardware']
  }, {
    id: 'sq3',
    name: 'Distributed Systems Square',
    slug: 'distributed-square',
    description: 'Scalability and consensus problems and their failure modes',
    meritScore: 0.82,
    tags: ['Consensus', 'Scalability', 'CAP']
  }];
  const toggleInterest = id => {
    const newSelected = new Set(selectedInterests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInterests(newSelected);
  };
  const toggleSquare = id => {
    const newSelected = new Set(selectedSquares);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSquares(newSelected);
  };
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };
  const handleFinish = async () => {
    try {
      // TODO: Save onboarding preferences to backend
      const preferences = {
        interests: Array.from(selectedInterests),
        squares: Array.from(selectedSquares),
        feedPreferences: feedPreferences.reduce((acc, pref) => {
          acc[pref.key] = pref.value;
          return acc;
        }, {})
      };
      console.log('Saving onboarding preferences:', preferences);

      // Navigate to dashboard
      navigateToTab('/dashboard', 'Dashboard', {
        closable: false
      });
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
    }
  };
  const updatePreference = (key, value) => {
    setFeedPreferences(prefs => prefs.map(pref => pref.key === key ? {
      ...pref,
      value
    } : pref));
  };
  const steps = [{
    title: 'Pick Your Interests',
    description: ''
  }, {
    title: 'Choose Squares',
    description: ''
  }, {
    title: 'Set Feed Preferences',
    description: ''
  }, {
    title: 'Get Started',
    description: ''
  }];
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return /*#__PURE__*/_jsxs(Card, {
          title: "What interests you?",
          children: [/*#__PURE__*/_jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
            children: interestCategories.map(category => /*#__PURE__*/_jsx(Card, {
              size: "small",
              bordered: true,
              className: `cursor-pointer hover:shadow-md transition-shadow ${selectedInterests.has(category.id) ? 'border-blue-500 border-2' : ''}`,
              onClick: () => toggleInterest(category.id),
              children: /*#__PURE__*/_jsxs("div", {
                className: "flex items-center justify-between",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex-1",
                  children: [/*#__PURE__*/_jsx("h4", {
                    className: "font-medium",
                    children: category.name
                  }), /*#__PURE__*/_jsx("p", {
                    className: "text-sm text-gray-500",
                    children: category.description
                  })]
                }), /*#__PURE__*/_jsx(Checkbox, {
                  checked: selectedInterests.has(category.id)
                })]
              })
            }, category.id))
          }), /*#__PURE__*/_jsx("div", {
            className: "mt-6 flex justify-end",
            children: /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: handleNext,
              disabled: selectedInterests.size === 0,
              children: "Next"
            })
          })]
        });
      case 1:
        return /*#__PURE__*/_jsxs(Card, {
          title: "Recommended Squares",
          children: [/*#__PURE__*/_jsx(Alert, {
            message: "Based on your interests, here are some squares you might like",
            type: "info",
            showIcon: true,
            className: "mb-4"
          }), /*#__PURE__*/_jsx("div", {
            className: "space-y-4",
            children: recommendedSquares.map(square => /*#__PURE__*/_jsx(Card, {
              size: "small",
              bordered: true,
              className: selectedSquares.has(square.id) ? 'border-blue-500 border-2' : '',
              children: /*#__PURE__*/_jsxs("div", {
                className: "flex items-start justify-between",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "flex-1",
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex items-center space-x-2",
                    children: [/*#__PURE__*/_jsx("h4", {
                      className: "font-medium",
                      children: square.name
                    }), /*#__PURE__*/_jsxs("span", {
                      className: "text-sm text-gray-500",
                      children: ["Merit: ", (square.meritScore * 100).toFixed(0), "%"]
                    })]
                  }), /*#__PURE__*/_jsx("p", {
                    className: "text-sm text-gray-500 mt-1",
                    children: square.description
                  }), /*#__PURE__*/_jsx("div", {
                    className: "mt-2",
                    children: square.tags.map(tag => /*#__PURE__*/_jsx(Tag, {
                      className: "mr-1",
                      children: tag
                    }, tag))
                  })]
                }), /*#__PURE__*/_jsx(Button, {
                  type: selectedSquares.has(square.id) ? 'primary' : 'default',
                  onClick: () => toggleSquare(square.id),
                  children: selectedSquares.has(square.id) ? 'Following' : 'Follow'
                })]
              })
            }, square.id))
          }), /*#__PURE__*/_jsxs("div", {
            className: "mt-6 flex justify-between",
            children: [/*#__PURE__*/_jsx(Button, {
              onClick: handlePrevious,
              children: "Previous"
            }), /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: handleNext,
              disabled: selectedSquares.size === 0,
              children: "Next"
            })]
          })]
        });
      case 2:
        return /*#__PURE__*/_jsxs(Card, {
          title: "Customize Your Feed",
          children: [/*#__PURE__*/_jsx(Alert, {
            message: "Set your content quality thresholds. Failure documentation below these values won't appear in your feed.",
            type: "info",
            showIcon: true,
            className: "mb-4"
          }), /*#__PURE__*/_jsx("div", {
            className: "space-y-6",
            children: feedPreferences.map(preference => /*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex justify-between mb-2",
                children: [/*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsx("h4", {
                    className: "font-medium",
                    children: preference.label
                  }), /*#__PURE__*/_jsx("p", {
                    className: "text-sm text-gray-500",
                    children: preference.description
                  })]
                }), /*#__PURE__*/_jsxs("span", {
                  className: "font-medium",
                  children: [(preference.value * 100).toFixed(0), "%"]
                })]
              }), /*#__PURE__*/_jsx(Slider, {
                value: preference.value,
                min: 0,
                max: 1,
                step: 0.1,
                tooltip: {
                  formatter: value => `${((value || 0) * 100).toFixed(0)}%`
                },
                onChange: value => updatePreference(preference.key, value)
              })]
            }, preference.key))
          }), /*#__PURE__*/_jsxs("div", {
            className: "mt-6 flex justify-between",
            children: [/*#__PURE__*/_jsx(Button, {
              onClick: handlePrevious,
              children: "Previous"
            }), /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: handleNext,
              children: "Next"
            })]
          })]
        });
      case 3:
        return /*#__PURE__*/_jsx(Result, {
          status: "success",
          title: "You're All Set!",
          subTitle: "Your personalized experience is ready",
          extra: /*#__PURE__*/_jsxs(Space, {
            children: [/*#__PURE__*/_jsx(Button, {
              onClick: handlePrevious,
              children: "Go Back"
            }), /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: handleFinish,
              children: "Start Exploring"
            })]
          })
        });
      default:
        return null;
    }
  };
  return /*#__PURE__*/_jsx("div", {
    className: "min-h-screen bg-gray-50",
    children: /*#__PURE__*/_jsxs("div", {
      className: "max-w-4xl mx-auto p-6",
      children: [/*#__PURE__*/_jsx(Steps, {
        current: currentStep,
        className: "mb-12",
        children: steps.map((step, index) => /*#__PURE__*/_jsx(Step, {
          title: step.title,
          description: step.description
        }, index))
      }), /*#__PURE__*/_jsx("div", {
        children: renderStep()
      })]
    })
  });
};
export default OnboardingPage;