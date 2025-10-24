import ActivityFeed from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/ActivityFeed.js';
const meta = {
  title: 'FailSquare/ActivityFeed',
  component: ActivityFeed,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Activity feed component ported from Meritocious Blazor. Displays a feed of failure documentation activities with tabs, filters, and sorting for FailSquare.'
      }
    }
  },
  argTypes: {
    onTabChange: {
      action: 'tab-change',
      description: 'Callback when tab is changed'
    },
    onFilter: {
      action: 'filter',
      description: 'Callback when filter button is clicked'
    },
    onTimeRangeChange: {
      action: 'time-range-change',
      description: 'Callback when time range is changed'
    },
    onSortChange: {
      action: 'sort-change',
      description: 'Callback when sort option is changed'
    }
  }
};
export default meta;
const sampleActivities = [{
  title: 'Machine Learning Model Failed to Converge on Medical Images',
  type: 'Documentation',
  merit: 4.2,
  timestamp: '2 hours ago',
  content: 'Attempted to train a CNN for medical image classification but encountered persistent convergence issues despite multiple architecture adjustments and hyperparameter tuning.',
  forks: 12,
  replies: 8
}, {
  title: 'Microservices Communication Breakdown',
  type: 'Post-Mortem',
  merit: 4.7,
  timestamp: '6 hours ago',
  content: 'Complete analysis of our distributed system failure when service mesh configuration caused cascading timeouts across the entire platform.',
  forks: 23,
  replies: 15
}, {
  title: 'Successfully Resurrected: Event-Driven Architecture Pattern',
  type: 'Resurrection',
  merit: 4.5,
  timestamp: '1 day ago',
  content: 'This previously failed approach has been successfully implemented with modifications based on lessons learned from the original failure.',
  forks: 34,
  replies: 22
}, {
  title: 'Database Migration Script Corruption Analysis',
  type: 'Investigation',
  merit: 3.8,
  timestamp: '2 days ago',
  content: 'Deep dive into how our database migration script corrupted production data and the recovery process we implemented.',
  forks: 8,
  replies: 12
}, {
  title: 'API Rate Limiting Implementation Failure',
  type: 'Case Study',
  merit: 3.6,
  timestamp: '3 days ago',
  content: 'How our attempt to implement rate limiting actually made the problem worse and led to a complete service outage.',
  forks: 16,
  replies: 9
}];
const highActivityFeed = [...sampleActivities, {
  title: 'Blockchain Integration Failure in Supply Chain',
  type: 'Research',
  merit: 4.1,
  timestamp: '4 days ago',
  content: 'Comprehensive analysis of why blockchain technology failed to solve our supply chain transparency issues.',
  forks: 67,
  replies: 89
}, {
  title: 'Container Orchestration Nightmare',
  type: 'Experience Report',
  merit: 3.9,
  timestamp: '5 days ago',
  content: 'How our Kubernetes migration went wrong and the lessons learned from a three-day outage.',
  forks: 29,
  replies: 31
}, {
  title: 'Real-time Analytics Pipeline Collapse',
  type: 'Technical Deep-dive',
  merit: 4.3,
  timestamp: '1 week ago',
  content: 'When our streaming data pipeline couldn\'t handle peak load and how we redesigned it.',
  forks: 18,
  replies: 24
}];
export const Default = {
  args: {
    tabs: ['All Activity', 'Following', 'Trending'],
    activities: sampleActivities
  }
};
export const HighActivity = {
  args: {
    tabs: ['All Activity', 'Following', 'Trending', 'Resurrections'],
    activities: highActivityFeed
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity feed with high engagement and multiple activities.'
      }
    }
  }
};
export const EmptyFeed = {
  args: {
    tabs: ['All Activity', 'Following'],
    activities: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty activity feed state.'
      }
    }
  }
};
export const SingleTab = {
  args: {
    tabs: ['Recent Failures'],
    activities: sampleActivities.slice(0, 3)
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity feed with single tab.'
      }
    }
  }
};
export const ResearchFeed = {
  args: {
    tabs: ['Research Papers', 'Academic Studies', 'Peer Reviews'],
    activities: [{
      title: 'Systematic Analysis of Deep Learning Failure Modes',
      type: 'Research Paper',
      merit: 4.8,
      timestamp: '1 day ago',
      content: 'Comprehensive study of common failure patterns in deep learning systems across multiple domains and datasets.',
      forks: 45,
      replies: 67
    }, {
      title: 'Reproducibility Crisis in ML Experiments',
      type: 'Academic Study',
      merit: 4.6,
      timestamp: '3 days ago',
      content: 'Investigation into why 73% of published ML experiments cannot be reproduced and recommendations for improvement.',
      forks: 78,
      replies: 123
    }, {
      title: 'Peer Review: Distributed System Fault Tolerance',
      type: 'Expert Review',
      merit: 4.4,
      timestamp: '1 week ago',
      content: 'Expert analysis and validation of reported distributed system failure patterns with additional insights.',
      forks: 23,
      replies: 34
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Research-focused activity feed with academic content.'
      }
    }
  }
};
export const IndustryFeed = {
  args: {
    tabs: ['Production Issues', 'Outages', 'Post-Mortems'],
    activities: [{
      title: 'Complete Platform Outage: CDN Failure Cascade',
      type: 'Incident Report',
      merit: 4.9,
      timestamp: '12 hours ago',
      content: 'How a single CDN node failure cascaded to take down our entire global platform for 6 hours.',
      forks: 89,
      replies: 156
    }, {
      title: 'Database Corruption During Peak Traffic',
      type: 'Post-Mortem',
      merit: 4.5,
      timestamp: '2 days ago',
      content: 'Root cause analysis of database corruption that occurred during Black Friday traffic spike.',
      forks: 67,
      replies: 89
    }, {
      title: 'Payment Processing Failure Investigation',
      type: 'Business Impact',
      merit: 4.2,
      timestamp: '4 days ago',
      content: 'How a payment gateway integration failure cost us $2M in revenue and customer trust.',
      forks: 34,
      replies: 45
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Industry-focused activity feed with production incidents.'
      }
    }
  }
};
export const PersonalFeed = {
  args: {
    tabs: ['My Activity', 'Drafts', 'Collaborations'],
    activities: [{
      title: 'Docker Container Memory Leak Investigation',
      type: 'Draft',
      merit: 0,
      timestamp: '30 minutes ago',
      content: 'Currently investigating a memory leak in our containerized application. Will update with findings.',
      forks: 0,
      replies: 0
    }, {
      title: 'API Gateway Timeout Configuration',
      type: 'My Documentation',
      merit: 3.7,
      timestamp: '2 days ago',
      content: 'My experience with API gateway timeout issues and the configuration changes that resolved them.',
      forks: 8,
      replies: 12
    }, {
      title: 'Collaborative Study: Testing Strategy Failures',
      type: 'Collaboration',
      merit: 4.1,
      timestamp: '1 week ago',
      content: 'Joint analysis with the QA team on why our testing strategy failed to catch critical bugs.',
      forks: 15,
      replies: 18
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Personal activity feed showing user\'s own content.'
      }
    }
  }
};
export const ManyTabs = {
  args: {
    tabs: ['All', 'Documentation', 'Research', 'Post-Mortems', 'Resurrections', 'Reviews', 'Discussions', 'Drafts'],
    activities: sampleActivities
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity feed with many tabs to test tab overflow handling.'
      }
    }
  }
};