import { defineConfig } from 'vitepress'

const currentVersion = '1.0'

export default defineConfig({
  title: 'Minimact',
  description: 'Server-side React for ASP.NET Core with predictive rendering',

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/v1.0/guide/getting-started' },
      { text: 'Architecture', link: '/v1.0/architecture/what-makes-minimact-different' },
      { text: 'Use Cases', link: '/v1.0/use-cases' },
      { text: 'API Reference', link: '/v1.0/api/hooks' },
      { text: 'Examples', link: '/v1.0/examples' },
      {
        text: `v${currentVersion}`,
        items: [
          {
            text: 'v1.0 (Latest)',
            link: '/v1.0/guide/getting-started',
            activeMatch: '/v1.0/'
          }
          // Future versions will be added here:
          // {
          //   text: 'v2.0',
          //   link: '/v2.0/guide/getting-started'
          // }
        ]
      }
    ],

    sidebar: {
      '/v1.0/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/v1.0/guide/getting-started' },
            { text: 'Core Concepts', link: '/v1.0/guide/concepts' },
            { text: 'Use Cases', link: '/v1.0/use-cases' }
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Predictive Rendering', link: '/v1.0/guide/predictive-rendering' },
            { text: 'Server Tasks', link: '/v1.0/use-cases#server-tasks-heavy-computation' },
            { text: 'Pagination & Data', link: '/v1.0/use-cases#pagination-data-fetching' },
            { text: 'Real-Time Communication', link: '/v1.0/use-cases#real-time-communication' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'DOM as Data Source', link: '/v1.0/use-cases#dom-as-data-source-extensions' },
            { text: 'Performance & Scheduling', link: '/v1.0/use-cases#performance-scheduling' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'Hooks API', link: '/v1.0/api/hooks' },
            { text: 'Examples', link: '/v1.0/examples' }
          ]
        }
      ],
      '/v1.0/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Hooks', link: '/v1.0/api/hooks' }
          ]
        },
        {
          text: 'Quick Links',
          items: [
            { text: 'Use Cases', link: '/v1.0/use-cases' },
            { text: 'Examples', link: '/v1.0/examples' },
            { text: 'Getting Started', link: '/v1.0/guide/getting-started' }
          ]
        }
      ],
      '/v1.0/use-cases': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/v1.0/guide/getting-started' },
            { text: 'Core Concepts', link: '/v1.0/guide/concepts' },
            { text: 'Use Cases', link: '/v1.0/use-cases' }
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Predictive Rendering', link: '/v1.0/guide/predictive-rendering' },
            { text: 'Server Tasks', link: '/v1.0/use-cases#server-tasks-heavy-computation' },
            { text: 'Pagination & Data', link: '/v1.0/use-cases#pagination-data-fetching' },
            { text: 'Real-Time Communication', link: '/v1.0/use-cases#real-time-communication' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'DOM as Data Source', link: '/v1.0/use-cases#dom-as-data-source-extensions' },
            { text: 'Performance & Scheduling', link: '/v1.0/use-cases#performance-scheduling' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'Hooks API', link: '/v1.0/api/hooks' },
            { text: 'Examples', link: '/v1.0/examples' }
          ]
        }
      ],
      '/v1.0/architecture/': [
        {
          text: 'Architecture & Philosophy',
          items: [
            { text: 'What Makes Minimact Different', link: '/v1.0/architecture/what-makes-minimact-different' },
            { text: 'Benefits Over React', link: '/v1.0/architecture/benefits-over-react' },
            { text: 'Predictive Rendering 101', link: '/v1.0/architecture/predictive-rendering-101' },
            { text: 'Client Stack Overview', link: '/v1.0/architecture/client-stack' },
            { text: 'Posthydrationist Manifesto', link: '/v1.0/architecture/posthydrationist-manifesto' }
          ]
        },
        {
          text: 'Quick Links',
          items: [
            { text: 'Getting Started', link: '/v1.0/guide/getting-started' },
            { text: 'Use Cases', link: '/v1.0/use-cases' },
            { text: 'API Reference', link: '/v1.0/api/hooks' }
          ]
        }
      ],
      '/v1.0/examples': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/v1.0/guide/getting-started' },
            { text: 'Core Concepts', link: '/v1.0/guide/concepts' },
            { text: 'Use Cases', link: '/v1.0/use-cases' }
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Predictive Rendering', link: '/v1.0/guide/predictive-rendering' },
            { text: 'Server Tasks', link: '/v1.0/use-cases#server-tasks-heavy-computation' },
            { text: 'Pagination & Data', link: '/v1.0/use-cases#pagination-data-fetching' },
            { text: 'Real-Time Communication', link: '/v1.0/use-cases#real-time-communication' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'DOM as Data Source', link: '/v1.0/use-cases#dom-as-data-source-extensions' },
            { text: 'Performance & Scheduling', link: '/v1.0/use-cases#performance-scheduling' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'Hooks API', link: '/v1.0/api/hooks' },
            { text: 'Examples', link: '/v1.0/examples' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/minimact/minimact' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Minimact'
    },

    search: {
      provider: 'local'
    }
  }
})
