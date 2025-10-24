import { fn } from '@storybook/test';
import FailureCard from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/FailureCard.js';
import { jsx as _jsx } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/FailureCard',
  component: FailureCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A card component for displaying failure documentation summaries in FailSquare. Shows key information about documented failures including approach, failure mode, technologies used, and engagement metrics.'
      }
    }
  },
  argTypes: {
    meritScore: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01
      },
      description: 'Merit score from 0 to 1'
    },
    explorationDuration: {
      control: {
        type: 'number',
        min: 1,
        max: 365
      },
      description: 'Duration of exploration in days'
    },
    isResurrected: {
      control: 'boolean',
      description: 'Whether this failure has been successfully resurrected'
    },
    onView: {
      action: 'viewed'
    },
    onLike: {
      action: 'liked'
    },
    onComment: {
      action: 'commented'
    }
  }
};
export default meta;
const baseProps = {
  id: 'failure-001',
  title: 'Base Failure Title',
  approach: 'Base approach description',
  failureMode: 'Base failure mode',
  domain: 'Base Domain',
  author: {
    name: 'Dr. Sarah Chen',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=2563eb&color=fff'
  },
  createdAt: new Date('2024-01-15'),
  meritScore: 0.75,
  engagement: {
    views: 342,
    likes: 23,
    comments: 8
  },
  technologies: ['Base Tech'],
  onView: fn(),
  onLike: fn(),
  onComment: fn()
};
export const HighValueFailure = {
  args: {
    ...baseProps,
    title: 'Neural Network Tensor-as-Vector Architecture',
    approach: 'We attempted to implement a novel neural network architecture that treats tensors as vectors rather than scalars in intermediate layers, hypothesizing this would improve representational capacity for complex geometric data.',
    failureMode: 'Exponential Memory Scaling',
    domain: 'Machine Learning',
    explorationDuration: 89,
    meritScore: 0.87,
    technologies: ['PyTorch', 'CUDA', 'NumPy', 'Transformers', 'Docker'],
    isResurrected: false
  }
};
export const ResurrectedFailure = {
  args: {
    ...baseProps,
    title: 'Quantum Error Correction with Classical Feedback',
    approach: 'Implemented a hybrid quantum-classical error correction scheme using real-time classical feedback to adjust quantum gate parameters during computation.',
    failureMode: 'Decoherence Time Constraints',
    domain: 'Quantum Computing',
    explorationDuration: 156,
    meritScore: 0.93,
    technologies: ['Qiskit', 'IBM Quantum', 'Python', 'Jupyter'],
    isResurrected: true,
    revivalYear: 2024
  }
};
export const LowSignalFailure = {
  args: {
    ...baseProps,
    title: 'Basic CNN Modification Attempt',
    approach: 'Tried adding extra convolutional layers to ResNet-50 without proper architectural considerations.',
    failureMode: 'Vanishing Gradients',
    domain: 'Deep Learning',
    explorationDuration: 12,
    meritScore: 0.23,
    technologies: ['TensorFlow', 'Keras'],
    isResurrected: false,
    author: {
      name: 'John Doe'
    }
  }
};
export const DatabaseFailure = {
  args: {
    ...baseProps,
    title: 'Distributed Graph Database for Social Networks',
    approach: 'Built a custom distributed graph database optimized for social network queries using consistent hashing and custom graph partitioning algorithms.',
    failureMode: 'Network Partition Tolerance',
    domain: 'Distributed Systems',
    explorationDuration: 203,
    meritScore: 0.76,
    technologies: ['Rust', 'RocksDB', 'gRPC', 'Kubernetes', 'Prometheus', 'Docker', 'Redis'],
    isResurrected: false
  }
};
export const CryptographyFailure = {
  args: {
    ...baseProps,
    title: 'Post-Quantum Lattice-Based Signature Scheme',
    approach: 'Developed a novel lattice-based digital signature scheme designed to be resistant to quantum computer attacks while maintaining smaller signature sizes than existing solutions.',
    failureMode: 'Security Proof Gaps',
    domain: 'Cryptography',
    explorationDuration: 312,
    meritScore: 0.81,
    technologies: ['SageMath', 'Python', 'OpenSSL', 'C++'],
    isResurrected: false,
    author: {
      name: 'Prof. Alex Hoffman'
    }
  }
};

// Layout story showing multiple cards
export const CardGrid = {
  render: () => {
    const cards = [{
      ...baseProps,
      title: 'Neural Network Tensor Architecture',
      meritScore: 0.87
    }, {
      ...baseProps,
      title: 'Quantum Error Correction',
      meritScore: 0.93,
      isResurrected: true
    }, {
      ...baseProps,
      title: 'Basic CNN Modification',
      meritScore: 0.23
    }, {
      ...baseProps,
      title: 'Distributed Graph Database',
      meritScore: 0.76
    }, {
      ...baseProps,
      title: 'Post-Quantum Cryptography',
      meritScore: 0.81
    }];
    return /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6",
      children: cards.map((cardProps, index) => /*#__PURE__*/_jsx(FailureCard, {
        ...cardProps
      }, index))
    });
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Example of how FailureCard components look when displayed in a grid layout, as they would appear on the main FailSquare dashboard.'
      }
    }
  }
};