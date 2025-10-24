import StatCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/StatCard.js';
import { ExperimentOutlined, UserOutlined, FileTextOutlined, RocketOutlined, BugOutlined, TrophyOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/StatCard',
  component: StatCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Statistics card component ported from Meritocious Blazor. Displays key metrics with optional trends for FailSquare dashboards.'
      }
    }
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'default', 'large'],
      description: 'Size of the card'
    },
    variant: {
      control: 'radio',
      options: ['default', 'outlined', 'filled'],
      description: 'Visual style variant'
    },
    loading: {
      control: 'boolean',
      description: 'Loading state'
    }
  }
};
export default meta;
export const FailuresDocumented = {
  args: {
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
    label: 'Failures Documented',
    value: '1,247',
    trend: {
      value: '+12%',
      direction: 'up'
    },
    description: 'Total failure documentations in the platform'
  }
};
export const ActiveResearchers = {
  args: {
    icon: /*#__PURE__*/_jsx(UserOutlined, {}),
    label: 'Active Researchers',
    value: '342',
    trend: {
      value: '+5%',
      direction: 'up'
    },
    description: 'Researchers who contributed this month'
  }
};
export const ResurrectedApproaches = {
  args: {
    icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
    label: 'Resurrected Approaches',
    value: '23',
    trend: {
      value: '+2',
      direction: 'up'
    },
    description: 'Failed approaches that became successful'
  }
};
export const AvgMeritScore = {
  args: {
    icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
    label: 'Average Merit Score',
    value: '78%',
    trend: {
      value: '+3%',
      direction: 'up'
    },
    description: 'Platform-wide documentation quality'
  }
};
export const PendingReviews = {
  args: {
    icon: /*#__PURE__*/_jsx(ClockCircleOutlined, {}),
    label: 'Pending Reviews',
    value: '45',
    trend: {
      value: '-8%',
      direction: 'down'
    },
    description: 'Submissions awaiting expert review'
  }
};
export const CommunityGrowth = {
  args: {
    icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
    label: 'Community Growth',
    value: '2.3k',
    trend: {
      value: '15%',
      direction: 'up'
    },
    description: 'Total registered researchers'
  }
};
export const NoTrend = {
  args: {
    icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
    label: 'Total Documentation',
    value: '5,891',
    description: 'All-time failure documentation count'
  },
  parameters: {
    docs: {
      description: {
        story: 'Stat card without trend information.'
      }
    }
  }
};
export const NeutralTrend = {
  args: {
    icon: /*#__PURE__*/_jsx(BugOutlined, {}),
    label: 'Reported Issues',
    value: '12',
    trend: {
      value: '0%',
      direction: 'neutral'
    },
    description: 'Platform issues reported this week'
  },
  parameters: {
    docs: {
      description: {
        story: 'Neutral trend for metrics that haven\'t changed.'
      }
    }
  }
};
export const SmallSize = {
  args: {
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
    label: 'Quick Stat',
    value: '156',
    size: 'small',
    trend: {
      value: '+7%',
      direction: 'up'
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact size for dense layouts.'
      }
    }
  }
};
export const LargeSize = {
  args: {
    icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
    label: 'Key Metric',
    value: '94.2%',
    size: 'large',
    trend: {
      value: '+2.1%',
      direction: 'up'
    },
    description: 'Most important platform metric'
  },
  parameters: {
    docs: {
      description: {
        story: 'Large size for prominent dashboard display.'
      }
    }
  }
};
export const OutlinedVariant = {
  args: {
    icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
    label: 'Outlined Card',
    value: '67',
    variant: 'outlined',
    trend: {
      value: '+4%',
      direction: 'up'
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Outlined variant for emphasis.'
      }
    }
  }
};
export const FilledVariant = {
  args: {
    icon: /*#__PURE__*/_jsx(UserOutlined, {}),
    label: 'Filled Card',
    value: '892',
    variant: 'filled',
    trend: {
      value: '+11%',
      direction: 'up'
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Filled variant with gradient background.'
      }
    }
  }
};
export const LoadingState = {
  args: {
    icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
    label: 'Loading Data',
    value: '...',
    loading: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching data.'
      }
    }
  }
};

// Dashboard example with multiple cards
export const DashboardExample = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6",
    children: [/*#__PURE__*/_jsx(StatCard, {
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: "Failures Documented",
      value: "1,247",
      trend: {
        value: '+12%',
        direction: 'up'
      },
      variant: "default"
    }), /*#__PURE__*/_jsx(StatCard, {
      icon: /*#__PURE__*/_jsx(UserOutlined, {}),
      label: "Active Researchers",
      value: "342",
      trend: {
        value: '+5%',
        direction: 'up'
      },
      variant: "outlined"
    }), /*#__PURE__*/_jsx(StatCard, {
      icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
      label: "Resurrected",
      value: "23",
      trend: {
        value: '+2',
        direction: 'up'
      },
      variant: "filled"
    }), /*#__PURE__*/_jsx(StatCard, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: "Avg Merit Score",
      value: "78%",
      trend: {
        value: '+3%',
        direction: 'up'
      },
      variant: "default"
    })]
  }),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Example dashboard layout with multiple stat cards.'
      }
    }
  }
};