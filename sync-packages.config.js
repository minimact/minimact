/**
 * Local Package Sync Configuration
 *
 * Defines which local packages should be synced to which target projects.
 * This allows development without publishing or npm link.
 */

module.exports = {
  /**
   * Local packages to sync
   */
  packages: [
    {
      // Package identifier
      name: '@minimact/babel-plugin',

      // Source directory (relative to project root)
      source: 'src/babel-plugin-minimact',

      // Files/folders to copy
      include: [
        'dist/**/*',
        'src/**/*',
        'index.cjs',
        'package.json',
        'README.md',
        'node_modules/@babel/types/**/*'  // Include @babel/types dependency
      ],

      // Files/folders to exclude
      exclude: [
        '*.log',
        '.git',
        'test',
        'examples',
        'rollup.config.js'  // Don't copy rollup config (prevents build issues)
      ],

      // Whether to build before syncing
      buildCommand: 'npm run build',

      // Whether to install dependencies in target
      // Set to false because we copy node_modules/@babel/types directly
      installDependencies: false
    },
    {
      name: '@minimact/punch',
      source: 'src/minimact-punch',
      include: [
        'dist/**/*',
        'src/**/*',
        'package.json',
        'README.md'
      ],
      exclude: [
        'node_modules',
        '*.log',
        '.git'
      ],
      buildCommand: 'npm run build',
      installDependencies: true
    },
    {
      name: '@minimact/core',
      source: 'src/client-runtime',
      include: [
        'dist/**/*',
        'src/**/*',
        'package.json',
        'README.md'
      ],
      exclude: [
        'node_modules',
        '*.log',
        '.git'
      ],
      buildCommand: 'npm run build',
      installDependencies: true
    },
    {
      name: '@minimact/query',
      source: 'src/minimact-query',
      include: [
        'dist/**/*',
        'src/**/*',
        'package.json',
        'README.md'
      ],
      exclude: [
        'node_modules',
        '*.log',
        '.git'
      ],
      buildCommand: 'npm run build',
      installDependencies: true
    },
    {
      name: '@minimact/trees',
      source: 'src/minimact-trees',
      include: [
        'dist/**/*',
        'src/**/*',
        'package.json',
        'README.md'
      ],
      exclude: [
        'node_modules',
        '*.log',
        '.git'
      ],
      buildCommand: 'npm run build',
      installDependencies: true
    }
  ],

  /**
   * Target projects that should receive synced packages
   */
  targets: [
    {
      // Target project name
      name: 'minimact-swig-electron',

      // Path to target's mact_modules (relative to project root)
      // Using mact_modules instead of node_modules for custom module resolution
      path: 'src/minimact-swig-electron/mact_modules',

      // Which packages this target needs
      packages: [
        '@minimact/babel-plugin',
        '@minimact/punch',
        '@minimact/core',
        '@minimact/query',
        '@minimact/trees'
      ]
    }
    // Add more targets as needed:
    // {
    //   name: 'example-app',
    //   path: 'examples/todo-app/mact_modules',
    //   packages: ['@minimact/core', '@minimact/punch']
    // }
  ],

  /**
   * Global options
   */
  options: {
    // Whether to build packages before syncing (can be overridden per package)
    autoBuild: true,

    // Whether to install dependencies (can be overridden per package)
    autoInstallDeps: true,

    // Whether to show verbose output
    verbose: false,

    // Whether to use symlinks instead of copying (faster, but less isolated)
    useSymlinks: false,

    // Whether to watch for changes and auto-sync
    watch: false
  }
};
