# Submit Your Site to the GitHub Web Index

Thank you for submitting your site to the Posthydrationist Web!

## Submission Checklist

Before submitting, please ensure:

- [ ] My site is publicly accessible at `gh://[username]/[repo]`
- [ ] The repository contains a `pages/` folder with TSX files
- [ ] The repository has a `minimact.config.json` file
- [ ] My site loads correctly in Cactus Browser
- [ ] I've tested all interactive features
- [ ] I've added a README.md explaining what my site does
- [ ] I've included a screenshot (optional but recommended)
- [ ] My entry follows the schema in sites.json

## Your Site Entry

Please add the following to `sites.json` (in alphabetical order by name):

```json
{
  "name": "Your Site Name",
  "repo": "gh://your-username/your-repo",
  "entry": "pages/index.tsx",
  "tags": ["blog", "portfolio"],
  "description": "A brief description of your site (10-200 characters)",
  "author": "your-username",
  "homepage": "https://github.com/your-username",
  "license": "MIT",
  "screenshot": "https://raw.githubusercontent.com/your-username/your-repo/main/screenshot.png"
}
```

## Required Fields

- **name**: Your site's display name
- **repo**: Full gh:// URL to your repository
- **entry**: Path to entry file (usually `pages/index.tsx`)
- **tags**: 1-7 tags describing your site
- **description**: Brief description (10-200 characters)
- **author**: Your GitHub username

## Available Tags

Choose from:
- **Site types**: blog, portfolio, docs, landing, dashboard, ecommerce, tools, games, education, social
- **Framework**: minimact, tsx-native, posthydration
- **Components**: components, ui, auth, forms, charts, icons
- **Other**: template, examples, starter

## Optional Fields

- `homepage`: Link to your GitHub profile or personal site
- `license`: Software license (MIT, Apache-2.0, etc.)
- `screenshot`: Direct link to screenshot image
- `links`: Object with github, docs, demo URLs
- `components`: Array of components (for component libraries)

## Review Process

1. Submit your PR
2. Automated validation will run
3. Maintainers will review within 48 hours
4. Once approved, your site will appear in the index
5. Stats (stars, forks) will auto-update daily

## Questions?

- Read the [full documentation](https://github.com/postweb/index/blob/main/README.md)
- Join our [Discord](https://discord.gg/posthydration)
- Open an [issue](https://github.com/postweb/index/issues) if you need help

Thank you for contributing to the Posthydrationist Web! 🌵
