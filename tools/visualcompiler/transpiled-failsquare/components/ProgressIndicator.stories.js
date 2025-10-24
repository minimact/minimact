import ProgressIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/ProgressIndicator.js';
const meta = {
  title: 'FailSquare/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Progress indicator component for showing completion status of multi-step processes like failure documentation submission.'
      }
    }
  },
  argTypes: {
    current: {
      control: {
        type: 'number',
        min: 0,
        max: 10
      },
      description: 'Current step number'
    },
    total: {
      control: {
        type: 'number',
        min: 1,
        max: 10
      },
      description: 'Total number of steps'
    },
    size: {
      control: 'radio',
      options: ['small', 'default', 'large'],
      description: 'Size of the progress indicator'
    },
    type: {
      control: 'radio',
      options: ['circle', 'line'],
      description: 'Type of progress display'
    },
    showPercentage: {
      control: 'boolean',
      description: 'Show percentage value'
    },
    showStepCount: {
      control: 'boolean',
      description: 'Show step count (e.g., "3 of 6")'
    }
  }
};
export default meta;
export const Default = {
  args: {
    current: 3,
    total: 6,
    title: 'Progress',
    showPercentage: true,
    showStepCount: true,
    size: 'default',
    type: 'circle'
  }
};
export const SmallCircular = {
  args: {
    current: 2,
    total: 5,
    title: 'Form Progress',
    size: 'small',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Small circular progress for sidebars or compact layouts.'
      }
    }
  }
};
export const LargeCircular = {
  args: {
    current: 4,
    total: 6,
    title: 'Submission Progress',
    size: 'large',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Large circular progress for prominent display.'
      }
    }
  }
};
export const LinearProgress = {
  args: {
    current: 3,
    total: 6,
    title: 'Documentation Progress',
    type: 'line',
    showPercentage: true,
    showStepCount: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Linear progress bar for horizontal layouts.'
      }
    }
  }
};
export const PercentageOnly = {
  args: {
    current: 4,
    total: 6,
    title: 'Completion',
    showPercentage: true,
    showStepCount: false,
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Show only percentage without step count.'
      }
    }
  }
};
export const StepCountOnly = {
  args: {
    current: 2,
    total: 8,
    title: 'Steps',
    showPercentage: false,
    showStepCount: true,
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Show only step count without percentage.'
      }
    }
  }
};
export const EarlyStage = {
  args: {
    current: 1,
    total: 6,
    title: 'Just Started',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Low progress (red color) at the beginning.'
      }
    }
  }
};
export const MidProgress = {
  args: {
    current: 3,
    total: 6,
    title: 'Halfway There',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Mid progress (blue color) around 50%.'
      }
    }
  }
};
export const NearCompletion = {
  args: {
    current: 5,
    total: 6,
    title: 'Almost Done',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'High progress (green color) near completion.'
      }
    }
  }
};
export const Complete = {
  args: {
    current: 6,
    total: 6,
    title: 'Complete!',
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: '100% completion (green color).'
      }
    }
  }
};
export const CustomColor = {
  args: {
    current: 3,
    total: 6,
    title: 'Custom Progress',
    strokeColor: '#722ed1',
    // Purple
    type: 'circle'
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom color override for branding or specific contexts.'
      }
    }
  }
};
export const FailureDocumentationExample = {
  args: {
    current: 4,
    total: 6,
    title: 'Failure Documentation',
    type: 'circle',
    size: 'default'
  },
  parameters: {
    docs: {
      description: {
        story: 'Example usage in FailSquare failure documentation form.'
      }
    }
  }
};
export const OnboardingExample = {
  args: {
    current: 2,
    total: 4,
    title: 'Account Setup',
    type: 'line',
    showPercentage: true,
    showStepCount: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Example usage in user onboarding flow.'
      }
    }
  }
};