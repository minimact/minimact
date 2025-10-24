import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button, Slider, Collapse } from 'antd';
import { BranchesOutlined, CloseOutlined, AppstoreOutlined, BulbOutlined, EyeOutlined, BookOutlined, SearchOutlined, ExperimentOutlined, ScissorOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const {
  Panel
} = Collapse;
const AdvancedFilterPanel = ({
  isOpen,
  onClose,
  onApply,
  className
}) => {
  const [selectedForkTypes, setSelectedForkTypes] = useState(new Set());
  const [lineageMetrics, setLineageMetrics] = useState([{
    id: 'generations',
    label: 'Generation Depth',
    min: 0,
    max: 10,
    step: 1,
    value: 2
  }, {
    id: 'remixes',
    label: 'Remix Count',
    min: 0,
    max: 20,
    step: 1,
    value: 5
  }, {
    id: 'bloom',
    label: 'Bloom Score',
    min: 0,
    max: 16,
    step: 1,
    value: 8
  }]);
  const forkCategories = {
    'Analytical': [{
      id: 'extension',
      label: 'Extension Fork',
      icon: /*#__PURE__*/_jsx(BranchesOutlined, {})
    }, {
      id: 'critique',
      label: 'Critique Fork',
      icon: /*#__PURE__*/_jsx(ScissorOutlined, {})
    }, {
      id: 'synthesis',
      label: 'Synthesis Fork',
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {})
    }, {
      id: 'application',
      label: 'Application Fork',
      icon: /*#__PURE__*/_jsx(SearchOutlined, {})
    }],
    'Creative': [{
      id: 'what-if',
      label: 'What-If Fork',
      icon: /*#__PURE__*/_jsx(BulbOutlined, {})
    }, {
      id: 'world',
      label: 'World Remix',
      icon: /*#__PURE__*/_jsx(AppstoreOutlined, {})
    }, {
      id: 'perspective',
      label: 'Perspective Fork',
      icon: /*#__PURE__*/_jsx(EyeOutlined, {})
    }, {
      id: 'narrative',
      label: 'Narrative Fork',
      icon: /*#__PURE__*/_jsx(BookOutlined, {})
    }]
  };
  const evolutionPatterns = [{
    name: 'Deep Evolution',
    description: '3+ generations, high bloom score'
  }, {
    name: 'Active Remix',
    description: '5+ remixes in past week'
  }, {
    name: 'Breakthrough Ideas',
    description: 'High merit + multiple forks'
  }];
  const toggleForkType = typeId => {
    const newSelected = new Set(selectedForkTypes);
    if (newSelected.has(typeId)) {
      newSelected.delete(typeId);
    } else {
      newSelected.add(typeId);
    }
    setSelectedForkTypes(newSelected);
  };
  const updateMetric = (metricId, value) => {
    setLineageMetrics(prev => prev.map(metric => metric.id === metricId ? {
      ...metric,
      value
    } : metric));
  };
  const applyPattern = pattern => {
    // Apply preset values for the pattern
    switch (pattern.name) {
      case 'Deep Evolution':
        updateMetric('generations', 3);
        updateMetric('bloom', 12);
        break;
      case 'Active Remix':
        updateMetric('remixes', 5);
        break;
      case 'Breakthrough Ideas':
        updateMetric('bloom', 14);
        break;
    }
  };
  const resetFilters = () => {
    setSelectedForkTypes(new Set());
    setLineageMetrics(prev => prev.map(metric => ({
      ...metric,
      value: metric.min
    })));
  };
  const applyFilters = () => {
    const state = {
      forkTypes: Array.from(selectedForkTypes),
      metrics: lineageMetrics.reduce((acc, metric) => {
        acc[metric.id] = metric.value;
        return acc;
      }, {})
    };
    onApply(state);
    onClose();
  };
  if (!isOpen) return null;
  return /*#__PURE__*/_jsxs("div", {
    className: `fixed inset-0 z-50 ${className || ''}`,
    children: [/*#__PURE__*/_jsx("div", {
      className: "absolute inset-0 bg-black bg-opacity-50",
      onClick: onClose
    }), /*#__PURE__*/_jsx("div", {
      className: "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl",
      children: /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col h-full",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-between p-6 border-b border-gray-200",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-3",
            children: [/*#__PURE__*/_jsx(BranchesOutlined, {
              className: "text-blue-600 text-xl"
            }), /*#__PURE__*/_jsx("h2", {
              className: "text-xl font-semibold",
              children: "Evolution Filters"
            })]
          }), /*#__PURE__*/_jsx(Button, {
            type: "text",
            icon: /*#__PURE__*/_jsx(CloseOutlined, {}),
            onClick: onClose,
            className: "hover:bg-gray-100"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex-1 overflow-y-auto p-6 space-y-6",
          children: [/*#__PURE__*/_jsx(Collapse, {
            defaultActiveKey: ['fork-types'],
            ghost: true,
            children: /*#__PURE__*/_jsx(Panel, {
              header: /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-2 font-medium",
                children: [/*#__PURE__*/_jsx(BranchesOutlined, {}), "Fork Types"]
              }),
              children: Object.entries(forkCategories).map(([category, types]) => /*#__PURE__*/_jsxs("div", {
                className: "mb-6",
                children: [/*#__PURE__*/_jsxs("h4", {
                  className: "font-medium text-gray-700 mb-3",
                  children: [category, " Forks"]
                }), /*#__PURE__*/_jsx("div", {
                  className: "grid grid-cols-2 gap-2",
                  children: types.map(type => /*#__PURE__*/_jsxs("button", {
                    onClick: () => toggleForkType(type.id),
                    className: `
                            flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                            ${selectedForkTypes.has(type.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}
                          `,
                    children: [type.icon, /*#__PURE__*/_jsx("span", {
                      className: "text-sm font-medium",
                      children: type.label
                    })]
                  }, type.id))
                })]
              }, category))
            }, "fork-types")
          }), /*#__PURE__*/_jsx(Collapse, {
            defaultActiveKey: ['lineage-depth'],
            ghost: true,
            children: /*#__PURE__*/_jsx(Panel, {
              header: /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-2 font-medium",
                children: [/*#__PURE__*/_jsx(AppstoreOutlined, {}), "Lineage Depth"]
              }),
              children: /*#__PURE__*/_jsx("div", {
                className: "space-y-6",
                children: lineageMetrics.map(metric => /*#__PURE__*/_jsxs("div", {
                  className: "space-y-2",
                  children: [/*#__PURE__*/_jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/*#__PURE__*/_jsx("label", {
                      className: "font-medium text-gray-700",
                      children: metric.label
                    }), /*#__PURE__*/_jsxs("span", {
                      className: "text-sm text-gray-600",
                      children: ["\u2265 ", metric.value]
                    })]
                  }), /*#__PURE__*/_jsx(Slider, {
                    min: metric.min,
                    max: metric.max,
                    step: metric.step,
                    value: metric.value,
                    onChange: value => updateMetric(metric.id, value),
                    className: "w-full"
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "flex justify-between text-xs text-gray-500",
                    children: [/*#__PURE__*/_jsx("span", {
                      children: metric.min
                    }), /*#__PURE__*/_jsx("span", {
                      children: metric.max
                    })]
                  })]
                }, metric.id))
              })
            }, "lineage-depth")
          }), /*#__PURE__*/_jsxs("div", {
            className: "space-y-3",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "font-medium text-gray-800",
              children: "Evolution Patterns"
            }), /*#__PURE__*/_jsx("div", {
              className: "space-y-2",
              children: evolutionPatterns.map((pattern, index) => /*#__PURE__*/_jsx("button", {
                onClick: () => applyPattern(pattern),
                className: "w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all",
                children: /*#__PURE__*/_jsxs("div", {
                  className: "space-y-1",
                  children: [/*#__PURE__*/_jsx("span", {
                    className: "font-medium text-gray-800 block",
                    children: pattern.name
                  }), /*#__PURE__*/_jsx("span", {
                    className: "text-sm text-gray-600",
                    children: pattern.description
                  })]
                })
              }, index))
            })]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "p-6 border-t border-gray-200",
          children: /*#__PURE__*/_jsxs("div", {
            className: "flex gap-3",
            children: [/*#__PURE__*/_jsx(Button, {
              type: "default",
              onClick: resetFilters,
              className: "flex-1",
              children: "Reset"
            }), /*#__PURE__*/_jsx(Button, {
              type: "primary",
              onClick: applyFilters,
              className: "flex-1",
              children: "Apply Filters"
            })]
          })
        })]
      })
    })]
  });
};
export default AdvancedFilterPanel;