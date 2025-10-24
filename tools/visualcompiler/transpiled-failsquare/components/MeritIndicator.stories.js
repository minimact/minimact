import MeritIndicator from 'file://E:/allocation/failsquare/failsquare-frontend/src/file:/E:/allocation/failsquare/failsquare-frontend/src/components/MeritIndicator.js';
const meta = {
  title: 'FailSquare/MeritIndicator',
  component: MeritIndicator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Merit indicator component ported from Meritocious Blazor. Shows merit scores using stars or hearts with optional detailed breakdown.'
      }
    }
  },
  argTypes: {
    score: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01
      },
      description: 'Merit score from 0 to 1'
    },
    variant: {
      control: 'radio',
      options: ['hearts', 'stars'],
      description: 'Icon style for merit display'
    },
    size: {
      control: 'radio',
      options: ['small', 'default', 'large'],
      description: 'Size of the indicator'
    },
    maxStars: {
      control: {
        type: 'number',
        min: 3,
        max: 10
      },
      description: 'Maximum number of icons to display'
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover'
    },
    showNumeric: {
      control: 'boolean',
      description: 'Show numeric score'
    }
  }
};
export default meta;
export const Default = {
  args: {
    score: 0.75,
    variant: 'stars',
    size: 'default',
    showTooltip: true,
    showNumeric: true
  }
};
export const Hearts = {
  args: {
    score: 0.68,
    variant: 'hearts',
    size: 'default',
    showTooltip: true,
    showNumeric: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Heart variant for a more FailSquare-specific aesthetic.'
      }
    }
  }
};
export const WithDetails = {
  args: {
    score: 0.83,
    variant: 'stars',
    size: 'default',
    showTooltip: true,
    showNumeric: true,
    details: {
      clarity: 0.92,
      novelty: 0.78,
      rigor: 0.91,
      reproducibility: 0.75,
      contribution: 0.88
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows merit breakdown for FailSquare scoring dimensions.'
      }
    }
  }
};
export const Small = {
  args: {
    score: 0.65,
    variant: 'stars',
    size: 'small',
    showTooltip: true,
    showNumeric: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version for inline use or lists.'
      }
    }
  }
};
export const Large = {
  args: {
    score: 0.91,
    variant: 'stars',
    size: 'large',
    showTooltip: true,
    showNumeric: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Large version for prominent display.'
      }
    }
  }
};
export const ExceptionalScore = {
  args: {
    score: 0.95,
    variant: 'stars',
    size: 'default',
    showTooltip: true,
    showNumeric: true,
    details: {
      clarity: 0.98,
      novelty: 0.89,
      rigor: 0.96,
      reproducibility: 0.94,
      contribution: 0.97
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'High-quality failure documentation with exceptional merit score.'
      }
    }
  }
};
export const LowScore = {
  args: {
    score: 0.23,
    variant: 'stars',
    size: 'default',
    showTooltip: true,
    showNumeric: true,
    details: {
      clarity: 0.31,
      novelty: 0.45,
      rigor: 0.12,
      reproducibility: 0.05,
      contribution: 0.22
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Low-quality documentation that needs improvement.'
      }
    }
  }
};
export const PartialScore = {
  args: {
    score: 0.37,
    variant: 'hearts',
    size: 'default',
    showTooltip: true,
    showNumeric: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows partial fill for fractional scores.'
      }
    }
  }
};
export const NumericOnly = {
  args: {
    score: 0.78,
    variant: 'stars',
    size: 'small',
    showTooltip: false,
    showNumeric: true,
    maxStars: 0 // Hide icons
  },
  parameters: {
    docs: {
      description: {
        story: 'Numeric-only display for space-constrained layouts.'
      }
    }
  }
};
export const TenStarScale = {
  args: {
    score: 0.73,
    variant: 'stars',
    size: 'default',
    maxStars: 10,
    showTooltip: true,
    showNumeric: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Ten-star scale for more granular merit display.'
      }
    }
  }
};