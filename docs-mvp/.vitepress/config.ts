import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Minimact',
  description: 'Server-side React for ASP.NET Core with predictive rendering',

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Use Cases', link: '/use-cases' },
      { text: 'API Reference', link: '/api/hooks' },
      { text: 'Examples', link: '/examples' },
      {
        text: 'v1.0',
        items: [
          {
            text: 'Changelog',
            link: '/changelog'
          },
          {
            text: 'Release Notes',
            link: '/releases/v1.0'
          }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' },
            { text: 'Use Cases', link: '/use-cases' }
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Predictive Rendering', link: '/guide/predictive-rendering' },
            { text: 'Server Tasks', link: '/use-cases#server-tasks-heavy-computation' },
            { text: 'Pagination & Data', link: '/use-cases#pagination-data-fetching' },
            { text: 'Real-Time Communication', link: '/use-cases#real-time-communication' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'DOM as Data Source', link: '/use-cases#dom-as-data-source-extensions' },
            { text: 'Performance & Scheduling', link: '/use-cases#performance-scheduling' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'Hooks API', link: '/api/hooks' },
            { text: 'Examples', link: '/examples' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Hooks', link: '/api/hooks' }
          ]
        },
        {
          text: 'Quick Links',
          items: [
            { text: 'Use Cases', link: '/use-cases' },
            { text: 'Examples', link: '/examples' },
            { text: 'Getting Started', link: '/guide/getting-started' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername/minimact' }
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
