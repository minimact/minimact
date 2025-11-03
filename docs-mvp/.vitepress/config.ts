import { defineConfig } from 'vitepress'

const currentVersion = '1.0'

export default defineConfig({
  title: 'Minimact',
  description: 'Server-side React for ASP.NET Core with predictive rendering',
  ignoreDeadLinks: true,

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/v1.0/guide/getting-started' },
      { text: 'Extensions', link: '/v1.0/extensions/' },
      { text: 'Architecture', link: '/v1.0/architecture/what-makes-minimact-different' },
      { text: 'Community', link: '/v1.0/community' },
      { text: 'Use Cases', link: '/v1.0/use-cases' },
      { text: 'API Reference', link: '/v1.0/api/hooks' },
      { text: 'Examples', link: '/v1.0/examples' },
      { text: 'Glossary', link: '/v1.0/glossary' },
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
          text: 'Development Tools',
          items: [
            { text: 'Minimact SWIG', link: '/v1.0/guide/minimact-swig' }
          ]
        },
        {
          text: 'Plugin System',
          items: [
            { text: 'Creating Plugins', link: '/v1.0/guide/creating-plugins' }
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
          text: 'Client API (TypeScript)',
          items: [
            { text: 'Hooks', link: '/v1.0/api/hooks' }
          ]
        },
        {
          text: 'Server API (C#)',
          items: [
            { text: 'Overview', link: '/v1.0/api/csharp/' },
            { text: 'MinimactComponent', link: '/v1.0/api/csharp/minimact-component' }
          ]
        },
        {
          text: 'Plugin System',
          items: [
            { text: 'Plugin API Reference', link: '/v1.0/api/plugin-api' }
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
            { text: 'Key Insights', link: '/v1.0/architecture/key-insights' },
            { text: 'What Makes Minimact Different', link: '/v1.0/architecture/what-makes-minimact-different' },
            { text: 'Benefits Over React', link: '/v1.0/architecture/benefits-over-react' },
            { text: 'Why No \'use client\'?', link: '/v1.0/architecture/no-use-client' },
            { text: 'Predictive Rendering 101', link: '/v1.0/architecture/predictive-rendering-101' },
            { text: 'Client Stack Overview', link: '/v1.0/architecture/client-stack' },
            { text: 'Template Patch System', link: '/v1.0/architecture/template-patch-system' },
            { text: 'Posthydrationist Manifesto', link: '/v1.0/architecture/posthydrationist-manifesto' },
            { text: 'It Doesn\'t Matter What Your Name Is 🎤', link: '/v1.0/architecture/it-doesnt-matter' }
          ]
        },
        {
          text: 'Deep Dives',
          items: [
            { text: 'Template Patch System - Deep Dive', link: '/v1.0/architecture/template-patch-system-deep-dive' },
            { text: 'State Synchronization', link: '/v1.0/architecture/state-synchronization' }
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
      ],
      '/v1.0/extensions/': [
        {
          text: 'Official Extensions',
          items: [
            { text: 'Overview', link: '/v1.0/extensions/' },
            { text: 'MVC Bridge 🎤', link: '/v1.0/extensions/mvc-bridge' }
          ]
        },
        {
          text: 'Quantum Stack',
          items: [
            { text: '@minimact/punch 🥊', link: '/v1.0/extensions/punch' },
            { text: '@minimact/query 🗃️', link: '/v1.0/extensions/query' },
            { text: '@minimact/quantum 🌌', link: '/v1.0/extensions/quantum' },
            { text: '@minimact/bundle 🎯', link: '/v1.0/extensions/bundle' },
            { text: '@minimact/spatial 📐', link: '/v1.0/extensions/spatial' },
            { text: '@minimact/trees 🌳', link: '/v1.0/extensions/trees' }
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
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/minimact/minimact' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Minimact'
    },

    search: {
      provider: 'local'
    }
  }
})
