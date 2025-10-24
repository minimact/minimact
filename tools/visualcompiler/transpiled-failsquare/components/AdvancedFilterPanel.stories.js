import AdvancedFilterPanel from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/AdvancedFilterPanel.js';
import { useState } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Button } from 'antd';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/AdvancedFilterPanel',
  component: AdvancedFilterPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Advanced filter panel component ported from Meritocious Blazor. Provides comprehensive filtering options for evolution patterns, fork types, and lineage metrics in FailSquare.'
      }
    }
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the filter panel is open'
    },
    onClose: {
      action: 'close',
      description: 'Callback when panel is closed'
    },
    onApply: {
      action: 'apply',
      description: 'Callback when filters are applied'
    }
  }
};
export default meta;
// Wrapper component for interactive demo
const FilterPanelDemo = ({
  isInitiallyOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6",
    children: [/*#__PURE__*/_jsx(Button, {
      type: "primary",
      onClick: () => setIsOpen(true),
      children: "Open Advanced Filters"
    }), /*#__PURE__*/_jsx(AdvancedFilterPanel, {
      isOpen: isOpen,
      onClose: () => setIsOpen(false),
      onApply: state => {
        console.log('Filter state:', state);
        setIsOpen(false);
      }
    })]
  });
};
export const Default = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Apply filters:', state)
  }
};
export const Closed = {
  args: {
    isOpen: false,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Apply filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Filter panel in closed state (not visible).'
      }
    }
  }
};
export const InteractiveDemo = {
  render: () => /*#__PURE__*/_jsx(FilterPanelDemo, {
    isInitiallyOpen: false
  }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing how to toggle the filter panel.'
      }
    }
  }
};
export const PreOpened = {
  render: () => /*#__PURE__*/_jsx(FilterPanelDemo, {
    isInitiallyOpen: true
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demo with filter panel initially opened.'
      }
    }
  }
};

// Documentation examples showing different use cases
export const ResearchFiltering = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Research filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Advanced filtering for research and academic content. Use fork types like "Critique Fork" and "Synthesis Fork" to find analytical content, and adjust generation depth to find well-evolved ideas.'
      }
    }
  }
};
export const CreativeExploration = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Creative filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtering for creative and innovative failure analysis. Use "What-If Fork", "World Remix", and "Perspective Fork" to discover innovative approaches to failure documentation.'
      }
    }
  }
};
export const DeepEvolution = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Deep evolution filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtering for deeply evolved ideas. Set high generation depth and bloom scores to find failure documentation that has been extensively refined and developed.'
      }
    }
  }
};
export const ActiveRemixing = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Active remix filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtering for actively remixed content. Use high remix counts to find failure documentation that is being actively built upon by the community.'
      }
    }
  }
};
export const BreakthroughIdeas = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Breakthrough filters:', state)
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtering for breakthrough ideas. Combine high bloom scores with multiple fork types to discover innovative failure analysis that has gained significant traction.'
      }
    }
  }
};

// Technical documentation stories
export const ForkTypeExplanation = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Fork type demo:', state)
  },
  parameters: {
    docs: {
      description: {
        story: `
**Fork Types Explained:**

**Analytical Forks:**
- **Extension Fork**: Building upon existing failure analysis with additional details or scope
- **Critique Fork**: Critical analysis or evaluation of existing failure documentation
- **Synthesis Fork**: Combining multiple failure analyses to identify broader patterns
- **Application Fork**: Applying failure lessons to new contexts or domains

**Creative Forks:**
- **What-If Fork**: Exploring alternative scenarios or hypothetical failure cases
- **World Remix**: Reimagining failure analysis in different contexts or domains
- **Perspective Fork**: Viewing failures from different stakeholder perspectives
- **Narrative Fork**: Reframing failure documentation with different storytelling approaches
        `
      }
    }
  }
};
export const LineageMetricsExplanation = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Lineage metrics demo:', state)
  },
  parameters: {
    docs: {
      description: {
        story: `
**Lineage Metrics Explained:**

- **Generation Depth**: How many iterations or versions a failure analysis has gone through. Higher values indicate more refined and evolved documentation.

- **Remix Count**: Number of times the failure analysis has been adapted, modified, or built upon by other researchers. Indicates community engagement.

- **Bloom Score**: A composite metric measuring the overall impact and quality evolution of the failure documentation. Higher scores indicate breakthrough insights.
        `
      }
    }
  }
};
export const EvolutionPatternsExplanation = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close panel'),
    onApply: state => console.log('Evolution patterns demo:', state)
  },
  parameters: {
    docs: {
      description: {
        story: `
**Evolution Patterns Explained:**

- **Deep Evolution**: Failure documentation that has undergone multiple generations of refinement (3+ generations) with high bloom scores, indicating thorough analysis and community validation.

- **Active Remix**: Recently popular failure documentation with 5+ remixes in the past week, showing current community interest and active development.

- **Breakthrough Ideas**: High-impact failure documentation with exceptional merit scores and multiple fork types, representing significant contributions to the field.
        `
      }
    }
  }
};