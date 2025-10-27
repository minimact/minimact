import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Minimact',
  description: 'Server-side React for ASP.NET Core with predictive rendering',

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/hooks' },
      { text: 'Examples', link: '/examples' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' }
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Predictive Rendering', link: '/guide/predictive-rendering' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Hooks', link: '/api/hooks' }
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
