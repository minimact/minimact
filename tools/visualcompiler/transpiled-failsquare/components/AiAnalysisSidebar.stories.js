import AiAnalysisSidebar from './AiAnalysisSidebar';
const meta = {
  title: 'FailSquare/AiAnalysisSidebar',
  component: AiAnalysisSidebar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'AI analysis sidebar that provides real-time feedback on failure documentation quality. Shows merit scores, component breakdowns, and actionable suggestions.'
      }
    }
  },
  argTypes: {
    isAnalyzing: {
      control: 'boolean',
      description: 'Loading state while AI analysis is running'
    },
    title: {
      control: 'text',
      description: 'Card title'
    },
    emptyStateMessage: {
      control: 'text',
      description: 'Message shown when no analysis is available'
    }
  }
};
export default meta;
const highQualityAnalysis = {
  overallScore: 0.87,
  clarityScore: 0.92,
  noveltyScore: 0.78,
  rigorScore: 0.91,
  reproducibilityScore: 0.88,
  isComplete: true,
  suggestions: [{
    type: 'success',
    message: 'Excellent quantitative metrics and error analysis',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Consider adding more details about the experimental setup',
    priority: 'medium'
  }, {
    type: 'tip',
    message: 'Links to code repositories would improve reproducibility',
    priority: 'low'
  }]
};
const mediumQualityAnalysis = {
  overallScore: 0.64,
  clarityScore: 0.71,
  noveltyScore: 0.82,
  rigorScore: 0.45,
  reproducibilityScore: 0.58,
  isComplete: true,
  suggestions: [{
    type: 'warning',
    message: 'More rigorous testing methodology needed',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Add specific error messages and logs',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Document all hyperparameters and configuration',
    priority: 'medium'
  }, {
    type: 'tip',
    message: 'Consider exploring additional variants',
    priority: 'medium'
  }]
};
const lowQualityAnalysis = {
  overallScore: 0.23,
  clarityScore: 0.31,
  noveltyScore: 0.45,
  rigorScore: 0.12,
  reproducibilityScore: 0.05,
  isComplete: true,
  suggestions: [{
    type: 'warning',
    message: 'Description is too vague - add specific details',
    priority: 'high'
  }, {
    type: 'warning',
    message: 'No quantitative results provided',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Include systematic testing methodology',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Add reproduction steps and code examples',
    priority: 'high'
  }, {
    type: 'improvement',
    message: 'Explain why this approach was chosen',
    priority: 'medium'
  }]
};
const incompleteAnalysis = {
  overallScore: 0.45,
  clarityScore: 0.67,
  noveltyScore: undefined,
  // Not yet analyzed
  rigorScore: undefined,
  reproducibilityScore: 0.34,
  isComplete: false,
  suggestions: [{
    type: 'improvement',
    message: 'Good start - continue filling out the methodology section',
    priority: 'medium'
  }, {
    type: 'tip',
    message: 'The approach description is clear and well-structured',
    priority: 'low'
  }]
};
export const EmptyState = {
  args: {
    analysis: undefined,
    isAnalyzing: false
  }
};
export const LoadingState = {
  args: {
    analysis: undefined,
    isAnalyzing: true
  }
};
export const HighQuality = {
  args: {
    analysis: highQualityAnalysis,
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'High-quality failure documentation with excellent scores across all dimensions.'
      }
    }
  }
};
export const MediumQuality = {
  args: {
    analysis: mediumQualityAnalysis,
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Medium-quality documentation that needs improvement in rigor and reproducibility.'
      }
    }
  }
};
export const LowQuality = {
  args: {
    analysis: lowQualityAnalysis,
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Low-quality documentation with many areas for improvement.'
      }
    }
  }
};
export const IncompleteAnalysis = {
  args: {
    analysis: incompleteAnalysis,
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Partial analysis while user is still filling out the form.'
      }
    }
  }
};
export const AnalyzingInProgress = {
  args: {
    analysis: incompleteAnalysis,
    isAnalyzing: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows both partial results and loading state when analysis is updating.'
      }
    }
  }
};
export const CustomTitle = {
  args: {
    analysis: mediumQualityAnalysis,
    isAnalyzing: false,
    title: 'Quality Assessment'
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom title for different contexts.'
      }
    }
  }
};
export const CustomEmptyMessage = {
  args: {
    analysis: undefined,
    isAnalyzing: false,
    emptyStateMessage: 'Start documenting your failure to receive AI-powered quality feedback and suggestions.'
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom empty state message for different contexts.'
      }
    }
  }
};

// Component breakdown only (minimal suggestions)
export const ComponentScoresOnly = {
  args: {
    analysis: {
      overallScore: 0.75,
      clarityScore: 0.85,
      noveltyScore: 0.70,
      rigorScore: 0.80,
      reproducibilityScore: 0.65,
      isComplete: true,
      suggestions: [] // No suggestions
    },
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Analysis focusing on component scores without specific suggestions.'
      }
    }
  }
};

// Overall score only (no component breakdown)
export const OverallScoreOnly = {
  args: {
    analysis: {
      overallScore: 0.68,
      isComplete: true,
      suggestions: [{
        type: 'improvement',
        message: 'Consider adding more specific technical details',
        priority: 'medium'
      }, {
        type: 'tip',
        message: 'Good structure - the failure timeline is clear',
        priority: 'low'
      }]
    },
    isAnalyzing: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple analysis with only overall score and suggestions.'
      }
    }
  }
};