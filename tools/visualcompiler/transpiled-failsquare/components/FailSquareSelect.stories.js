import React from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import FailSquareSelect from './FailSquareSelect';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const meta = {
  title: 'FailSquare/Form Components/FailSquareSelect',
  component: FailSquareSelect,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Custom select dropdown component for FailSquare with controlled and uncontrolled modes, custom styling, and accessibility features.'
      }
    }
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Controlled selected value'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no option is selected'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled'
    },
    onValueChange: {
      action: 'value-changed',
      description: 'Callback when selection changes'
    },
    options: {
      description: 'Array of select options'
    }
  }
};
export default meta;
const basicOptions = [{
  value: 'option1',
  label: 'Option 1'
}, {
  value: 'option2',
  label: 'Option 2'
}, {
  value: 'option3',
  label: 'Option 3'
}];
export const Default = {
  args: {
    placeholder: 'Choose an option...',
    options: basicOptions
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic select dropdown with placeholder.'
      }
    }
  }
};
export const Selected = {
  args: {
    placeholder: 'Choose an option...',
    options: basicOptions,
    value: 'option2'
  },
  parameters: {
    docs: {
      description: {
        story: 'Select with pre-selected option.'
      }
    }
  }
};
export const Disabled = {
  args: {
    placeholder: 'Choose an option...',
    options: basicOptions,
    value: 'option1',
    disabled: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled select that cannot be interacted with.'
      }
    }
  }
};
export const ControlledExample = {
  render: () => {
    const [selectedValue, setSelectedValue] = useState('');
    const severityOptions = [{
      value: 'low',
      label: 'Low Severity'
    }, {
      value: 'medium',
      label: 'Medium Severity'
    }, {
      value: 'high',
      label: 'High Severity'
    }, {
      value: 'critical',
      label: 'Critical Severity'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Severity"
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Select severity level...",
        value: selectedValue,
        onValueChange: setSelectedValue,
        options: severityOptions
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-2",
        children: [/*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue('critical'),
          className: "px-3 py-1 bg-red-600 text-white rounded text-sm",
          children: "Set Critical"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue('low'),
          className: "px-3 py-1 bg-green-600 text-white rounded text-sm",
          children: "Set Low"
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => setSelectedValue(''),
          className: "px-3 py-1 bg-gray-600 text-white rounded text-sm",
          children: "Clear"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "p-3 bg-gray-50 rounded text-sm",
        children: [/*#__PURE__*/_jsx("strong", {
          children: "Selected:"
        }), " ", selectedValue || 'None']
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled select with external state management.'
      }
    }
  }
};
export const FailureCategories = {
  render: () => {
    const [category, setCategory] = useState('');
    const categoryOptions = [{
      value: 'infrastructure',
      label: 'Infrastructure Failure'
    }, {
      value: 'application',
      label: 'Application Error'
    }, {
      value: 'database',
      label: 'Database Issue'
    }, {
      value: 'network',
      label: 'Network Problem'
    }, {
      value: 'security',
      label: 'Security Incident'
    }, {
      value: 'performance',
      label: 'Performance Degradation'
    }, {
      value: 'user-error',
      label: 'User Error'
    }, {
      value: 'third-party',
      label: 'Third-party Service'
    }];
    const getCategoryDescription = cat => {
      const descriptions = {
        'infrastructure': 'Hardware, cloud services, or infrastructure-related failures',
        'application': 'Software bugs, crashes, or application-level issues',
        'database': 'Database connectivity, query performance, or data integrity issues',
        'network': 'Network connectivity, latency, or routing problems',
        'security': 'Security breaches, vulnerabilities, or access control issues',
        'performance': 'Slow response times, high resource usage, or capacity issues',
        'user-error': 'Human error or misuse of the system',
        'third-party': 'External service dependencies or API failures'
      };
      return descriptions[cat] || '';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Category"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the primary category that best describes this failure."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Choose a failure category...",
        value: category,
        onValueChange: setCategory,
        options: categoryOptions
      }), category && /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-blue-50 border border-blue-200 rounded",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium text-blue-800 mb-1",
          children: categoryOptions.find(opt => opt.value === category)?.label
        }), /*#__PURE__*/_jsx("p", {
          className: "text-sm text-blue-700",
          children: getCategoryDescription(category)
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Select for failure categories with dynamic descriptions.'
      }
    }
  }
};
export const TechnicalStack = {
  render: () => {
    const [stack, setStack] = useState({
      language: '',
      framework: '',
      database: '',
      cloud: ''
    });
    const languageOptions = [{
      value: 'javascript',
      label: 'JavaScript'
    }, {
      value: 'typescript',
      label: 'TypeScript'
    }, {
      value: 'python',
      label: 'Python'
    }, {
      value: 'java',
      label: 'Java'
    }, {
      value: 'csharp',
      label: 'C#'
    }, {
      value: 'go',
      label: 'Go'
    }, {
      value: 'rust',
      label: 'Rust'
    }];
    const frameworkOptions = [{
      value: 'react',
      label: 'React'
    }, {
      value: 'vue',
      label: 'Vue.js'
    }, {
      value: 'angular',
      label: 'Angular'
    }, {
      value: 'svelte',
      label: 'Svelte'
    }, {
      value: 'express',
      label: 'Express.js'
    }, {
      value: 'fastapi',
      label: 'FastAPI'
    }, {
      value: 'django',
      label: 'Django'
    }, {
      value: 'spring',
      label: 'Spring Boot'
    }];
    const databaseOptions = [{
      value: 'postgresql',
      label: 'PostgreSQL'
    }, {
      value: 'mysql',
      label: 'MySQL'
    }, {
      value: 'mongodb',
      label: 'MongoDB'
    }, {
      value: 'redis',
      label: 'Redis'
    }, {
      value: 'elasticsearch',
      label: 'Elasticsearch'
    }, {
      value: 'cassandra',
      label: 'Cassandra'
    }];
    const cloudOptions = [{
      value: 'aws',
      label: 'Amazon Web Services'
    }, {
      value: 'gcp',
      label: 'Google Cloud Platform'
    }, {
      value: 'azure',
      label: 'Microsoft Azure'
    }, {
      value: 'digitalocean',
      label: 'DigitalOcean'
    }, {
      value: 'heroku',
      label: 'Heroku'
    }, {
      value: 'vercel',
      label: 'Vercel'
    }];
    const updateStack = key => value => {
      setStack(prev => ({
        ...prev,
        [key]: value
      }));
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Technical Stack"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Specify the technologies involved in this failure."
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-3",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-1",
            children: "Programming Language"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select language...",
            value: stack.language,
            onValueChange: updateStack('language'),
            options: languageOptions
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-1",
            children: "Framework"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select framework...",
            value: stack.framework,
            onValueChange: updateStack('framework'),
            options: frameworkOptions
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-1",
            children: "Database"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select database...",
            value: stack.database,
            onValueChange: updateStack('database'),
            options: databaseOptions
          })]
        }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-sm font-medium text-gray-600 mb-1",
            children: "Cloud Provider"
          }), /*#__PURE__*/_jsx(FailSquareSelect, {
            placeholder: "Select cloud provider...",
            value: stack.cloud,
            onValueChange: updateStack('cloud'),
            options: cloudOptions
          })]
        })]
      }), Object.values(stack).some(Boolean) && /*#__PURE__*/_jsxs("div", {
        className: "p-4 bg-gray-50 rounded",
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium text-gray-700 mb-2",
          children: "Selected Stack:"
        }), /*#__PURE__*/_jsxs("ul", {
          className: "text-sm text-gray-600 space-y-1",
          children: [stack.language && /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Language:"
            }), " ", languageOptions.find(opt => opt.value === stack.language)?.label]
          }), stack.framework && /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Framework:"
            }), " ", frameworkOptions.find(opt => opt.value === stack.framework)?.label]
          }), stack.database && /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Database:"
            }), " ", databaseOptions.find(opt => opt.value === stack.database)?.label]
          }), stack.cloud && /*#__PURE__*/_jsxs("li", {
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Cloud:"
            }), " ", cloudOptions.find(opt => opt.value === stack.cloud)?.label]
          })]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple selects for building a complete technical stack configuration.'
      }
    }
  }
};
export const Priority = {
  render: () => {
    const [priority, setPriority] = useState('');
    const priorityOptions = [{
      value: 'p0',
      label: 'P0 - Critical (Service Down)'
    }, {
      value: 'p1',
      label: 'P1 - High (Major Feature Broken)'
    }, {
      value: 'p2',
      label: 'P2 - Medium (Minor Feature Issue)'
    }, {
      value: 'p3',
      label: 'P3 - Low (Enhancement/Polish)'
    }, {
      value: 'p4',
      label: 'P4 - Lowest (Nice to Have)'
    }];
    const getPriorityColor = prio => {
      const colors = {
        'p0': 'bg-red-100 border-red-300 text-red-800',
        'p1': 'bg-orange-100 border-orange-300 text-orange-800',
        'p2': 'bg-yellow-100 border-yellow-300 text-yellow-800',
        'p3': 'bg-blue-100 border-blue-300 text-blue-800',
        'p4': 'bg-gray-100 border-gray-300 text-gray-800'
      };
      return colors[prio] || 'bg-gray-100 border-gray-300 text-gray-800';
    };
    const getSLA = prio => {
      const slas = {
        'p0': 'Response: Immediate, Resolution: 2 hours',
        'p1': 'Response: 1 hour, Resolution: 8 hours',
        'p2': 'Response: 4 hours, Resolution: 2 days',
        'p3': 'Response: 1 day, Resolution: 1 week',
        'p4': 'Response: 1 week, Resolution: Next release'
      };
      return slas[prio] || '';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Priority"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the priority level based on business impact and urgency."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Choose priority level...",
        value: priority,
        onValueChange: setPriority,
        options: priorityOptions
      }), priority && /*#__PURE__*/_jsxs("div", {
        className: `p-4 border rounded ${getPriorityColor(priority)}`,
        children: [/*#__PURE__*/_jsx("h5", {
          className: "font-medium mb-1",
          children: priorityOptions.find(opt => opt.value === priority)?.label
        }), /*#__PURE__*/_jsxs("p", {
          className: "text-sm",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "SLA:"
          }), " ", getSLA(priority)]
        })]
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Priority selection with SLA information and color coding.'
      }
    }
  }
};
export const TimeZones = {
  render: () => {
    const [timezone, setTimezone] = useState('');
    const timezoneOptions = [{
      value: 'utc',
      label: 'UTC - Coordinated Universal Time'
    }, {
      value: 'est',
      label: 'EST - Eastern Standard Time (UTC-5)'
    }, {
      value: 'cst',
      label: 'CST - Central Standard Time (UTC-6)'
    }, {
      value: 'mst',
      label: 'MST - Mountain Standard Time (UTC-7)'
    }, {
      value: 'pst',
      label: 'PST - Pacific Standard Time (UTC-8)'
    }, {
      value: 'gmt',
      label: 'GMT - Greenwich Mean Time'
    }, {
      value: 'cet',
      label: 'CET - Central European Time (UTC+1)'
    }, {
      value: 'jst',
      label: 'JST - Japan Standard Time (UTC+9)'
    }, {
      value: 'aest',
      label: 'AEST - Australian Eastern Standard Time (UTC+10)'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-lg",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Failure Occurrence Timezone"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the timezone where the failure occurred for accurate timeline analysis."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Select timezone...",
        value: timezone,
        onValueChange: setTimezone,
        options: timezoneOptions
      }), timezone && /*#__PURE__*/_jsx("div", {
        className: "p-3 bg-blue-50 border border-blue-200 rounded",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-sm text-blue-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Selected:"
          }), " ", timezoneOptions.find(opt => opt.value === timezone)?.label]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Timezone selection for failure documentation.'
      }
    }
  }
};
export const Environment = {
  render: () => {
    const [environment, setEnvironment] = useState('');
    const environmentOptions = [{
      value: 'production',
      label: '🔴 Production'
    }, {
      value: 'staging',
      label: '🟡 Staging'
    }, {
      value: 'development',
      label: '🟢 Development'
    }, {
      value: 'testing',
      label: '🔵 Testing'
    }, {
      value: 'sandbox',
      label: '🟣 Sandbox'
    }, {
      value: 'local',
      label: '⚪ Local'
    }];
    const getEnvironmentWarning = env => {
      if (env === 'production') {
        return 'Production environment failure - High priority alert activated';
      }
      if (env === 'staging') {
        return 'Staging environment - May affect upcoming releases';
      }
      return 'Development/testing environment - Lower priority';
    };
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Environment"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the environment where the failure occurred."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Choose environment...",
        value: environment,
        onValueChange: setEnvironment,
        options: environmentOptions
      }), environment && /*#__PURE__*/_jsx("div", {
        className: `p-4 rounded border ${environment === 'production' ? 'bg-red-50 border-red-200' : environment === 'staging' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`,
        children: /*#__PURE__*/_jsx("p", {
          className: `text-sm font-medium ${environment === 'production' ? 'text-red-800' : environment === 'staging' ? 'text-yellow-800' : 'text-green-800'}`,
          children: getEnvironmentWarning(environment)
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Environment selection with emoji indicators and contextual warnings.'
      }
    }
  }
};
export const UncontrolledExample = {
  render: () => {
    const categoryOptions = [{
      value: 'bug',
      label: 'Bug Report'
    }, {
      value: 'feature',
      label: 'Feature Request'
    }, {
      value: 'improvement',
      label: 'Improvement'
    }, {
      value: 'documentation',
      label: 'Documentation'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Uncontrolled Select"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "This select manages its own state internally."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Select issue type...",
        onValueChange: value => console.log('Selected:', value),
        options: categoryOptions
      }), /*#__PURE__*/_jsx("p", {
        className: "text-xs text-gray-500",
        children: "Check the browser console to see value changes."
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Uncontrolled select that manages its own state.'
      }
    }
  }
};
export const LargeDataset = {
  render: () => {
    const [country, setCountry] = useState('');

    // Generate a large list of countries
    const countryOptions = [{
      value: 'af',
      label: 'Afghanistan'
    }, {
      value: 'al',
      label: 'Albania'
    }, {
      value: 'dz',
      label: 'Algeria'
    }, {
      value: 'ad',
      label: 'Andorra'
    }, {
      value: 'ao',
      label: 'Angola'
    }, {
      value: 'ar',
      label: 'Argentina'
    }, {
      value: 'am',
      label: 'Armenia'
    }, {
      value: 'au',
      label: 'Australia'
    }, {
      value: 'at',
      label: 'Austria'
    }, {
      value: 'az',
      label: 'Azerbaijan'
    }, {
      value: 'bs',
      label: 'Bahamas'
    }, {
      value: 'bh',
      label: 'Bahrain'
    }, {
      value: 'bd',
      label: 'Bangladesh'
    }, {
      value: 'bb',
      label: 'Barbados'
    }, {
      value: 'by',
      label: 'Belarus'
    }, {
      value: 'be',
      label: 'Belgium'
    }, {
      value: 'bz',
      label: 'Belize'
    }, {
      value: 'bj',
      label: 'Benin'
    }, {
      value: 'bt',
      label: 'Bhutan'
    }, {
      value: 'bo',
      label: 'Bolivia'
    }, {
      value: 'br',
      label: 'Brazil'
    }, {
      value: 'bg',
      label: 'Bulgaria'
    }, {
      value: 'ca',
      label: 'Canada'
    }, {
      value: 'cl',
      label: 'Chile'
    }, {
      value: 'cn',
      label: 'China'
    }, {
      value: 'co',
      label: 'Colombia'
    }, {
      value: 'cr',
      label: 'Costa Rica'
    }, {
      value: 'hr',
      label: 'Croatia'
    }, {
      value: 'cu',
      label: 'Cuba'
    }, {
      value: 'cy',
      label: 'Cyprus'
    }, {
      value: 'cz',
      label: 'Czech Republic'
    }, {
      value: 'dk',
      label: 'Denmark'
    }, {
      value: 'ec',
      label: 'Ecuador'
    }, {
      value: 'eg',
      label: 'Egypt'
    }, {
      value: 'fi',
      label: 'Finland'
    }, {
      value: 'fr',
      label: 'France'
    }, {
      value: 'de',
      label: 'Germany'
    }, {
      value: 'gh',
      label: 'Ghana'
    }, {
      value: 'gr',
      label: 'Greece'
    }, {
      value: 'in',
      label: 'India'
    }, {
      value: 'id',
      label: 'Indonesia'
    }, {
      value: 'ir',
      label: 'Iran'
    }, {
      value: 'ie',
      label: 'Ireland'
    }, {
      value: 'it',
      label: 'Italy'
    }, {
      value: 'jp',
      label: 'Japan'
    }, {
      value: 'jo',
      label: 'Jordan'
    }, {
      value: 'kz',
      label: 'Kazakhstan'
    }, {
      value: 'ke',
      label: 'Kenya'
    }, {
      value: 'kr',
      label: 'South Korea'
    }, {
      value: 'mx',
      label: 'Mexico'
    }, {
      value: 'nl',
      label: 'Netherlands'
    }, {
      value: 'nz',
      label: 'New Zealand'
    }, {
      value: 'no',
      label: 'Norway'
    }, {
      value: 'pk',
      label: 'Pakistan'
    }, {
      value: 'pl',
      label: 'Poland'
    }, {
      value: 'pt',
      label: 'Portugal'
    }, {
      value: 'ru',
      label: 'Russia'
    }, {
      value: 'sa',
      label: 'Saudi Arabia'
    }, {
      value: 'sg',
      label: 'Singapore'
    }, {
      value: 'za',
      label: 'South Africa'
    }, {
      value: 'es',
      label: 'Spain'
    }, {
      value: 'se',
      label: 'Sweden'
    }, {
      value: 'ch',
      label: 'Switzerland'
    }, {
      value: 'th',
      label: 'Thailand'
    }, {
      value: 'tr',
      label: 'Turkey'
    }, {
      value: 'ua',
      label: 'Ukraine'
    }, {
      value: 'ae',
      label: 'United Arab Emirates'
    }, {
      value: 'gb',
      label: 'United Kingdom'
    }, {
      value: 'us',
      label: 'United States'
    }, {
      value: 've',
      label: 'Venezuela'
    }, {
      value: 'vn',
      label: 'Vietnam'
    }];
    return /*#__PURE__*/_jsxs("div", {
      className: "space-y-4 max-w-md",
      children: [/*#__PURE__*/_jsx("h4", {
        className: "font-medium text-gray-700",
        children: "Server Location"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-sm text-gray-600",
        children: "Select the country where the affected server is located."
      }), /*#__PURE__*/_jsx(FailSquareSelect, {
        placeholder: "Choose country...",
        value: country,
        onValueChange: setCountry,
        options: countryOptions
      }), country && /*#__PURE__*/_jsx("div", {
        className: "p-3 bg-green-50 border border-green-200 rounded",
        children: /*#__PURE__*/_jsxs("p", {
          className: "text-sm text-green-800",
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Selected:"
          }), " ", countryOptions.find(opt => opt.value === country)?.label]
        })
      })]
    });
  },
  parameters: {
    docs: {
      description: {
        story: 'Select with a large dataset of options (countries).'
      }
    }
  }
};