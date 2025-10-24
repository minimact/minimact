import ActivityCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/ActivityCard.js';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/ActivityCard',
  component: ActivityCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Activity card component ported from Meritocious Blazor. Shows failure documentation activities with merit scores and interaction counts.'
      }
    }
  },
  argTypes: {
    merit: {
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 0.1
      },
      description: 'Merit score from 0 to 5 (matches Blazor scale)'
    },
    forks: {
      control: {
        type: 'number',
        min: 0
      },
      description: 'Number of forks/adaptations'
    },
    replies: {
      control: {
        type: 'number',
        min: 0
      },
      description: 'Number of replies/comments'
    }
  }
};
export default meta;
export const Default = {
  args: {
    title: 'Machine Learning Model Failed to Converge on Image Classification',
    type: 'Documentation',
    merit: 3.8,
    timestamp: '2 hours ago',
    content: 'Attempted to train a CNN for medical image classification but encountered persistent convergence issues despite multiple architecture adjustments...',
    forks: 12,
    replies: 8
  }
};
export const HighMerit = {
  args: {
    title: 'Complete Analysis: Why Our Distributed System Architecture Failed',
    type: 'Comprehensive Study',
    merit: 4.7,
    timestamp: '1 day ago',
    content: 'Detailed post-mortem of our microservices architecture failure, including root cause analysis, lessons learned, and recommendations for future implementations.',
    forks: 23,
    replies: 15
  },
  parameters: {
    docs: {
      description: {
        story: 'High-quality documentation with exceptional merit score.'
      }
    }
  }
};
export const LowMerit = {
  args: {
    title: 'Database Connection Issues',
    type: 'Quick Note',
    merit: 1.2,
    timestamp: '5 minutes ago',
    content: 'Had some problems with the database today. Not sure what happened.',
    forks: 1,
    replies: 2
  },
  parameters: {
    docs: {
      description: {
        story: 'Low-quality documentation that needs improvement.'
      }
    }
  }
};
export const Review = {
  args: {
    title: 'Peer Review: API Gateway Timeout Configuration Failure',
    type: 'Expert Review',
    merit: 4.1,
    timestamp: '3 hours ago',
    content: 'Comprehensive review of the reported API gateway failure with additional insights and validation of the proposed solutions.',
    forks: 8,
    replies: 12
  },
  parameters: {
    docs: {
      description: {
        story: 'Expert peer review of failure documentation.'
      }
    }
  }
};
export const Resurrection = {
  args: {
    title: 'Successfully Resurrected: Event-Driven Architecture Pattern',
    type: 'Resurrection',
    merit: 4.5,
    timestamp: '1 week ago',
    content: 'This previously failed approach has been successfully implemented with modifications. Here\'s what changed and why it works now.',
    forks: 34,
    replies: 22
  },
  parameters: {
    docs: {
      description: {
        story: 'Successful resurrection of a previously failed approach.'
      }
    }
  }
};
export const PopularDiscussion = {
  args: {
    title: 'Why Blockchain Integration Failed in Our Supply Chain',
    type: 'Case Study',
    merit: 3.9,
    timestamp: '3 days ago',
    content: 'Comprehensive analysis of our blockchain implementation failure, covering technical, organizational, and economic factors.',
    forks: 67,
    replies: 89
  },
  parameters: {
    docs: {
      description: {
        story: 'Popular discussion with high engagement.'
      }
    }
  }
};
export const NoContent = {
  args: {
    title: 'JWT Token Validation Error',
    type: 'Bug Report',
    merit: 2.1,
    timestamp: '30 minutes ago',
    forks: 3,
    replies: 1
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity card without content description.'
      }
    }
  }
};
export const RecentActivity = {
  args: {
    title: 'Docker Container Memory Leak Investigation',
    type: 'Investigation',
    merit: 3.4,
    timestamp: 'just now',
    content: 'Currently investigating a memory leak in our containerized application. Will update with findings.',
    forks: 0,
    replies: 0
  },
  parameters: {
    docs: {
      description: {
        story: 'Very recent activity with no engagement yet.'
      }
    }
  }
};
export const LongTitle = {
  args: {
    title: 'Comprehensive Post-Mortem Analysis of Our Multi-Region Cloud Infrastructure Failure During Peak Traffic with Detailed Timeline and Recovery Procedures',
    type: 'Post-Mortem',
    merit: 4.3,
    timestamp: '2 days ago',
    content: 'Extensive documentation covering the complete failure scenario, impact analysis, and step-by-step recovery process.',
    forks: 19,
    replies: 31
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity with very long title to test text wrapping.'
      }
    }
  }
};

// Feed example with multiple cards
export const ActivityFeed = {
  render: () => /*#__PURE__*/_jsxs("div", {
    className: "space-y-4 max-w-2xl",
    children: [/*#__PURE__*/_jsx(ActivityCard, {
      title: "Machine Learning Model Failed to Converge",
      type: "Documentation",
      merit: 3.8,
      timestamp: "2 hours ago",
      content: "Attempted to train a CNN for medical image classification but encountered persistent convergence issues...",
      forks: 12,
      replies: 8
    }), /*#__PURE__*/_jsx(ActivityCard, {
      title: "Successfully Resurrected: Event-Driven Architecture",
      type: "Resurrection",
      merit: 4.5,
      timestamp: "1 week ago",
      content: "This previously failed approach has been successfully implemented with modifications.",
      forks: 34,
      replies: 22
    }), /*#__PURE__*/_jsx(ActivityCard, {
      title: "Database Connection Issues",
      type: "Quick Note",
      merit: 1.2,
      timestamp: "5 minutes ago",
      content: "Had some problems with the database today.",
      forks: 1,
      replies: 2
    })]
  }),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Example activity feed with multiple cards.'
      }
    }
  }
};