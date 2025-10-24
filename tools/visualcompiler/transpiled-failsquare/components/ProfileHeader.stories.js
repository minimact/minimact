import ProfileHeader from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/ProfileHeader.js';
import { ExperimentOutlined, TrophyOutlined, RocketOutlined, TeamOutlined, FileTextOutlined, HeartOutlined } from '@ant-design/icons';
import { jsx as _jsx } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/ProfileHeader',
  component: ProfileHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Profile header component ported from Meritocious Blazor. Displays user profile information with stats and actions for FailSquare researchers.'
      }
    }
  },
  argTypes: {
    isOwnProfile: {
      control: 'boolean',
      description: 'Whether this is the current user\'s own profile'
    },
    onEditProfile: {
      action: 'edit-profile',
      description: 'Callback when edit profile is clicked'
    },
    onShareProfile: {
      action: 'share-profile',
      description: 'Callback when share profile is clicked'
    }
  }
};
export default meta;
export const Default = {
  args: {
    username: 'Dr. Sarah Chen',
    joinDate: 'March 2023',
    bio: 'Research scientist specializing in machine learning failures and distributed systems resilience. Passionate about learning from failures to build better systems.',
    interests: ['Machine Learning', 'Distributed Systems', 'DevOps', 'Cloud Architecture'],
    isOwnProfile: false,
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '47',
      trend: '+12'
    }, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: 'Average Merit Score',
      value: '4.2',
      trend: '+0.3'
    }, {
      icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
      label: 'Resurrections',
      value: '8',
      trend: '+2'
    }, {
      icon: /*#__PURE__*/_jsx(HeartOutlined, {}),
      label: 'Community Impact',
      value: '156',
      trend: '+23'
    }]
  }
};
export const OwnProfile = {
  args: {
    username: 'Dr. Alex Martinez',
    joinDate: 'January 2023',
    bio: 'Full-stack developer turned failure researcher. I believe every failure is a learning opportunity waiting to be discovered and shared.',
    interests: ['Web Development', 'Database Design', 'API Architecture', 'Testing'],
    isOwnProfile: true,
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '23',
      trend: '+5'
    }, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: 'Average Merit Score',
      value: '3.8',
      trend: '+0.1'
    }, {
      icon: /*#__PURE__*/_jsx(FileTextOutlined, {}),
      label: 'Reviews Given',
      value: '34',
      trend: '+8'
    }, {
      icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
      label: 'Collaborations',
      value: '12',
      trend: '+3'
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile header for the current user showing edit capabilities.'
      }
    }
  }
};
export const NewUser = {
  args: {
    username: 'Jamie Thompson',
    joinDate: 'This week',
    bio: 'New to FailSquare but excited to start documenting and learning from failures!',
    interests: ['Learning', 'Documentation'],
    isOwnProfile: false,
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '1',
      trend: '+1'
    }, {
      icon: /*#__PURE__*/_jsx(HeartOutlined, {}),
      label: 'Community Impact',
      value: '3',
      trend: '+3'
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'New user profile with minimal stats.'
      }
    }
  }
};
export const ExperiencedResearcher = {
  args: {
    username: 'Prof. Michael Zhang',
    joinDate: 'June 2022',
    bio: 'Computer Science professor and failure analysis expert. I have been studying system failures for over 15 years and love sharing knowledge with the community.',
    interests: ['Academic Research', 'System Design', 'Fault Tolerance', 'Reliability Engineering', 'Performance Analysis', 'Security'],
    isOwnProfile: false,
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '234',
      trend: '+18'
    }, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: 'Average Merit Score',
      value: '4.7',
      trend: '+0.1'
    }, {
      icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
      label: 'Resurrections',
      value: '42',
      trend: '+7'
    }, {
      icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
      label: 'Mentorships',
      value: '89',
      trend: '+12'
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Experienced researcher with high stats and many interests.'
      }
    }
  }
};
export const WithAvatar = {
  args: {
    username: 'Dr. Emily Rodriguez',
    joinDate: 'August 2023',
    bio: 'DevOps engineer focused on infrastructure failures and recovery strategies.',
    interests: ['DevOps', 'Infrastructure', 'Monitoring', 'Incident Response'],
    isOwnProfile: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '67',
      trend: '+9'
    }, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: 'Average Merit Score',
      value: '4.1',
      trend: '+0.2'
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile with custom avatar image.'
      }
    }
  }
};
export const MinimalProfile = {
  args: {
    username: 'CodeCrafter42',
    joinDate: 'Last month',
    bio: 'Software developer learning from failures.',
    interests: ['Coding', 'Learning'],
    isOwnProfile: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal profile without stats.'
      }
    }
  }
};
export const LongBio = {
  args: {
    username: 'Dr. Alexandra Petrov',
    joinDate: 'February 2023',
    bio: 'Senior software architect with over 20 years of experience in large-scale distributed systems. I have witnessed countless failures across different industries and technologies, from early web applications to modern cloud-native architectures. My passion lies in understanding the root causes of systemic failures and developing patterns that help teams avoid similar pitfalls. I believe that failure documentation is one of the most valuable but underutilized resources in our industry.',
    interests: ['Enterprise Architecture', 'Distributed Systems', 'Cloud Computing', 'Microservices', 'Event-Driven Architecture', 'Database Design', 'Performance Engineering', 'Team Leadership'],
    isOwnProfile: false,
    stats: [{
      icon: /*#__PURE__*/_jsx(ExperimentOutlined, {}),
      label: 'Failures Documented',
      value: '178',
      trend: '+15'
    }, {
      icon: /*#__PURE__*/_jsx(TrophyOutlined, {}),
      label: 'Average Merit Score',
      value: '4.5',
      trend: '+0.2'
    }, {
      icon: /*#__PURE__*/_jsx(RocketOutlined, {}),
      label: 'Resurrections',
      value: '29',
      trend: '+4'
    }, {
      icon: /*#__PURE__*/_jsx(TeamOutlined, {}),
      label: 'Community Impact',
      value: '312',
      trend: '+45'
    }]
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile with long bio and many interests to test layout.'
      }
    }
  }
};