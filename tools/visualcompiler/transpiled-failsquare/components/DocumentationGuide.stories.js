import DocumentationGuide from './DocumentationGuide';
const meta = {
  title: 'FailSquare/DocumentationGuide',
  component: DocumentationGuide,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Documentation guide component that provides tips and best practices for writing high-quality failure documentation in FailSquare.'
      }
    }
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'default'],
      description: 'Size of the component'
    },
    collapsible: {
      control: 'boolean',
      description: 'Make all sections collapsible'
    }
  }
};
export default meta;
export const Default = {
  args: {
    size: 'default',
    collapsible: false
  }
};
export const SmallSize = {
  args: {
    size: 'small',
    collapsible: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version for sidebars or limited space.'
      }
    }
  }
};
export const AllCollapsible = {
  args: {
    size: 'default',
    collapsible: true
  },
  parameters: {
    docs: {
      description: {
        story: 'All sections are collapsible for better space management.'
      }
    }
  }
};
const customSections = [{
  title: 'Getting Started',
  tips: [{
    id: 'choose-title',
    text: 'Choose a descriptive, specific title',
    type: 'info',
    priority: 'high'
  }, {
    id: 'select-domain',
    text: 'Select the most relevant research domain',
    type: 'tip',
    priority: 'medium'
  }]
}, {
  title: 'Advanced Tips',
  collapsible: true,
  defaultExpanded: false,
  tips: [{
    id: 'code-snippets',
    text: 'Include code snippets that demonstrate the issue',
    type: 'success',
    priority: 'high'
  }, {
    id: 'performance-data',
    text: 'Add performance benchmarks when relevant',
    type: 'info',
    priority: 'medium'
  }]
}];
export const CustomSections = {
  args: {
    sections: customSections,
    title: 'Submission Guide'
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom sections with different tips and priorities.'
      }
    }
  }
};
export const SingleSection = {
  args: {
    sections: [{
      title: 'Quick Tips',
      tips: [{
        id: 'be-specific',
        text: 'Be as specific as possible with error messages',
        type: 'warning',
        priority: 'high'
      }, {
        id: 'include-context',
        text: 'Include relevant context and environment details',
        type: 'info',
        priority: 'high'
      }, {
        id: 'add-timeline',
        text: 'Add a timeline of what you tried',
        type: 'tip',
        priority: 'medium'
      }]
    }],
    title: 'Essential Tips'
  },
  parameters: {
    docs: {
      description: {
        story: 'Single section with focused tips.'
      }
    }
  }
};
export const NoTitle = {
  args: {
    title: '',
    sections: customSections
  },
  parameters: {
    docs: {
      description: {
        story: 'Guide without a title for embedded use.'
      }
    }
  }
};