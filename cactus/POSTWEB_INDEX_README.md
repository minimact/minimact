# 🗺️ The GitHub Web Index

**The DNS of the Posthydrationist Web**

<p align="center">
  <img src="https://img.shields.io/badge/Sites-1,247-green.svg" alt="Registered Sites">
  <img src="https://img.shields.io/badge/Protocol-gh%3A%2F%2F-blue.svg" alt="gh:// Protocol">
  <img src="https://img.shields.io/badge/Browser-Cactus-orange.svg" alt="Cactus Browser">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License">
</p>

<p align="center">
  <strong>The canonical registry of TSX-native websites built for Cactus Browser</strong>
</p>

<p align="center">
  <em>Browse: <code>gh://postweb/index</code></em>
</p>

---

## What Is This?

**The GitHub Web Index is the central directory for all sites published on the Posthydrationist Web.**

Think of it as:
- 🌐 **DNS** - Discover sites by name
- 🔍 **Search Engine** - Find sites by tags/keywords
- 📦 **Package Registry** - Browse component libraries
- ⭐ **Trending** - See what's popular
- 🗂️ **Categories** - Explore by type

**All in one GitHub repository.**

---

## Quick Start

### Publish Your Site

**1. Build your site:**
```bash
npx create-cactus-site my-awesome-site
cd my-awesome-site
```

**2. Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial site"
gh repo create --public
git push
```

**3. Register in the index:**
```bash
# Fork this repo
gh repo fork postweb/index

# Add your site
vim sites.json
```

**4. Add your entry:**
```json
{
  "name": "My Awesome Site",
  "repo": "gh://you/my-awesome-site",
  "entry": "pages/index.tsx",
  "tags": ["blog", "portfolio"],
  "description": "My personal blog about web development",
  "author": "you",
  "homepage": "https://github.com/you",
  "updated": "2025-11-15",
  "stars": 0,
  "featured": false
}
```

**5. Submit:**
```bash
git add sites.json
git commit -m "Add my-awesome-site"
git push
gh pr create --title "Add my-awesome-site" --body "Submitting my TSX-native site"
```

**That's it!** Once merged, your site appears in the index.

---

## Repository Structure

```
postweb/index/
├── sites.json                # Main registry of all sites
├── tags/
│   ├── blog.json            # Sites tagged 'blog'
│   ├── portfolio.json       # Sites tagged 'portfolio'
│   ├── docs.json            # Sites tagged 'docs'
│   ├── tools.json           # Sites tagged 'tools'
│   ├── ecommerce.json       # Sites tagged 'ecommerce'
│   └── games.json           # Sites tagged 'games'
├── users/
│   ├── minimact.json        # All sites by @minimact
│   ├── you.json             # All sites by @you
│   └── ...
├── components/
│   ├── auth.json            # Authentication components
│   ├── ui.json              # UI component libraries
│   └── forms.json           # Form components
├── trending.json            # Top sites by stars/forks
├── featured.json            # Curated featured sites
├── new.json                 # Recently added sites (last 30 days)
├── scripts/
│   ├── validate.js          # Validates site entries
│   ├── generate-tags.js     # Auto-generates tag files
│   └── update-stats.js      # Updates trending/stars
└── README.md                # This file
```

---

## Entry Format

### Required Fields

```json
{
  "name": "Site Name",
  "repo": "gh://user/repo",
  "entry": "pages/index.tsx",
  "tags": ["tag1", "tag2"],
  "description": "Short description",
  "author": "github-username"
}
```

### Full Schema

```json
{
  // Required
  "name": "My Awesome Site",
  "repo": "gh://you/my-awesome-site",
  "entry": "pages/index.tsx",
  "tags": ["blog", "portfolio", "minimact"],
  "description": "A minimal blog built with Minimact and TSX",
  "author": "you",
  
  // Optional
  "homepage": "https://github.com/you",
  "license": "MIT",
  "version": "1.0.0",
  "updated": "2025-11-15",
  "created": "2025-01-01",
  "stars": 42,
  "forks": 7,
  "featured": false,
  "screenshot": "https://raw.githubusercontent.com/you/my-awesome-site/main/screenshot.png",
  
  // Links
  "links": {
    "github": "https://github.com/you/my-awesome-site",
    "docs": "gh://you/my-awesome-site/docs",
    "demo": "gh://you/my-awesome-site@demo"
  },
  
  // Dependencies (if component library)
  "dependencies": {
    "@minimact/core": "^1.0.0"
  },
  
  // Component library specific
  "components": [
    {
      "name": "Button",
      "path": "components/Button.tsx",
      "description": "A customizable button component"
    }
  ]
}
```

---

## Available Tags

### Site Types
- `blog` - Personal or company blogs
- `portfolio` - Personal portfolios
- `docs` - Documentation sites
- `landing` - Landing pages
- `dashboard` - Admin dashboards
- `ecommerce` - E-commerce sites
- `tools` - Developer tools/utilities
- `games` - Games and interactive experiences
- `education` - Educational content
- `social` - Social platforms

### Framework Tags
- `minimact` - Built with Minimact
- `tsx-native` - TSX-first architecture
- `posthydration` - Posthydrationist architecture

### Component Libraries
- `components` - General component library
- `ui` - UI components
- `auth` - Authentication components
- `forms` - Form components
- `charts` - Data visualization
- `icons` - Icon sets

### Industry
- `finance` - Financial services
- `healthcare` - Healthcare applications
- `education` - Educational platforms
- `entertainment` - Entertainment/media
- `productivity` - Productivity tools

---

## Search & Discovery

### In Cactus Browser

**Browse the index:**
```
gh://postweb/index
```

**Search by tag:**
```
gh://postweb/index/tag/blog
```

**View user's sites:**
```
gh://postweb/index/user/minimact
```

**Trending sites:**
```
gh://postweb/index/trending
```

**New sites:**
```
gh://postweb/index/new
```

### Command Line

**Search sites:**
```bash
# Clone index
git clone https://github.com/postweb/index
cd index

# Search by tag
cat sites.json | jq '.[] | select(.tags | contains(["blog"]))'

# Search by author
cat sites.json | jq '.[] | select(.author == "minimact")'

# Get trending
cat trending.json | jq '.[:10]'
```

---

## Submission Guidelines

### Before Submitting

**✅ Checklist:**
- [ ] Site is publicly accessible on GitHub
- [ ] Repository has `pages/` folder with TSX files
- [ ] `minimact.config.json` is present
- [ ] Site loads in Cactus Browser without errors
- [ ] README explains what the site does
- [ ] Screenshot is included (optional but recommended)
- [ ] License is specified

**❌ Will Not Be Accepted:**
- Sites with malicious code
- Sites violating GitHub ToS
- Duplicate submissions
- Incomplete entries (missing required fields)
- Sites that don't work in Cactus Browser

### Submission Process

**1. Test your site:**
```bash
# Open in Cactus Browser
cactus-browser gh://you/your-site

# Verify it works
# Check console for errors
```

**2. Fork this repo:**
```bash
gh repo fork postweb/index
cd index
```

**3. Add entry to `sites.json`:**
```bash
vim sites.json
# Add your entry (maintain alphabetical order by name)
```

**4. Validate:**
```bash
npm install
npm run validate
# Ensures your entry is valid
```

**5. Submit PR:**
```bash
git add sites.json
git commit -m "Add [your-site-name]"
git push
gh pr create
```

**6. Wait for review:**
- Maintainers will review within 48 hours
- Once approved, your site is live in the index

### Updating Your Entry

**To update info (description, tags, etc.):**
```bash
# Edit your entry in sites.json
vim sites.json

# Submit PR with changes
git add sites.json
git commit -m "Update [your-site-name] description"
git push
gh pr create
```

**Stats auto-update:**
- Stars, forks, and updated date are automatically refreshed daily
- No need to update these manually

---

## Featured Sites

**Want to be featured?**

Featured sites appear on the homepage and get priority visibility.

**Criteria:**
- High-quality design
- Well-documented
- Active maintenance
- Novel use of Minimact features
- Educational value
- Community contribution

**To nominate:**
1. Your site must be in the index for at least 30 days
2. Have at least 25 stars
3. Open an issue with tag `featured-nomination`
4. Maintainers will review

---

## Component Libraries

**Publishing a component library?**

Add it to both `sites.json` and `components/[category].json`

**Example:**

```json
// sites.json
{
  "name": "Minimact UI Components",
  "repo": "gh://ui-libs/minimact-ui",
  "entry": "docs/index.tsx",
  "tags": ["components", "ui"],
  "description": "Production-ready UI components for Minimact",
  "author": "ui-libs",
  "components": [
    {
      "name": "Button",
      "path": "components/Button.tsx",
      "description": "Customizable button with variants"
    },
    {
      "name": "Modal",
      "path": "components/Modal.tsx",
      "description": "Accessible modal dialog"
    }
  ]
}
```

```json
// components/ui.json
{
  "name": "Minimact UI Components",
  "repo": "gh://ui-libs/minimact-ui",
  "installs": 1250,
  "components": 47,
  "downloads": "gh://ui-libs/minimact-ui/releases/latest"
}
```

---

## API Access

### REST API (coming soon)

```bash
# Get all sites
curl https://api.postweb.dev/sites

# Search by tag
curl https://api.postweb.dev/sites?tag=blog

# Get trending
curl https://api.postweb.dev/trending

# Get user's sites
curl https://api.postweb.dev/users/minimact/sites
```

### GraphQL API (coming soon)

```graphql
query GetSites {
  sites(tag: "blog", limit: 10) {
    name
    repo
    description
    stars
    author {
      username
      sites {
        name
      }
    }
  }
}
```

---

## Statistics

### Current Stats

```
Total Sites:        1,247
Total Authors:      892
Total Components:   3,421
Total Tags:         67
Featured Sites:     24
Sites This Week:    18
```

### Top Tags

```
1. blog         (342 sites)
2. portfolio    (267 sites)
3. docs         (189 sites)
4. components   (156 sites)
5. tools        (134 sites)
6. dashboard    (98 sites)
7. landing      (87 sites)
8. ecommerce    (76 sites)
9. games        (54 sites)
10. education   (43 sites)
```

### Top Authors

```
1. minimact     (47 sites)
2. ui-libs      (28 sites)
3. dev-tools    (21 sites)
4. cactus-team  (18 sites)
5. awesome-tsx  (15 sites)
```

---

## Browser Integration

### Cactus Browser Features

**Discover Tab:**
- Browse all sites
- Filter by tags
- Search by keywords
- Sort by stars/recent
- One-click navigation

**Quick Actions:**
- View Site - Opens in browser
- Fork Site - Creates your fork
- View Source - Opens GitHub repo
- Star - Star on GitHub
- Share - Copy gh:// link

**Collections:**
- Save favorite sites
- Create custom collections
- Share collections as gh:// links

### Configuration

**~/.cactus/config.json:**
```json
{
  "index": {
    "repos": [
      "gh://postweb/index",
      "gh://awesome-tsx/sites",
      "gh://minimact/official-sites"
    ],
    "cache": {
      "enabled": true,
      "ttl": 3600
    },
    "search": {
      "minStars": 0,
      "showForks": true,
      "sortBy": "stars"
    }
  }
}
```

**Multiple Indexes:**

You can configure multiple index repos. Cactus Browser will:
1. Merge results from all indexes
2. Deduplicate by repo URL
3. Rank by stars/relevance

---

## Decentralized Indexes

**Anyone can create their own index!**

### Create Your Own

```bash
# Fork this repo
gh repo fork postweb/index --clone

# Rename
cd index
# Edit sites.json with your curated list

# Publish
git add .
git commit -m "My curated index"
git push
```

### Popular Community Indexes

```
gh://awesome-tsx/sites         # Curated awesome TSX sites
gh://minimact/official-sites   # Official Minimact examples
gh://edu-sites/index           # Educational sites
gh://open-source/tsx           # Open source TSX projects
gh://design-showcase/sites     # Design-focused sites
```

### Configure in Browser

**Settings → Indexes:**
```json
{
  "enabled": [
    "gh://postweb/index",
    "gh://awesome-tsx/sites",
    "gh://minimact/official-sites"
  ],
  "priority": [
    "gh://postweb/index"
  ]
}
```

---

## Automation

### GitHub Actions

**Auto-update stats daily:**

```yaml
# .github/workflows/update-stats.yml
name: Update Stats

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Update stats
        run: npm run update-stats
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git diff-index --quiet HEAD || git commit -m "Update stats"
          git push
```

**Validate PRs:**

```yaml
# .github/workflows/validate-pr.yml
name: Validate PR

on:
  pull_request:
    paths:
      - 'sites.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
      
      - name: Validate
        run: npm run validate
      
      - name: Check site exists
        run: npm run check-sites
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Scripts

### validate.js

**Validates site entries:**

```bash
npm run validate
```

Checks:
- ✅ Required fields present
- ✅ Valid gh:// URLs
- ✅ Tags from allowed list
- ✅ No duplicate repos
- ✅ Valid JSON format
- ✅ Alphabetical order

### generate-tags.js

**Auto-generates tag-specific files:**

```bash
npm run generate-tags
```

Creates:
- `tags/blog.json`
- `tags/portfolio.json`
- `tags/docs.json`
- etc.

### update-stats.js

**Updates stats from GitHub API:**

```bash
npm run update-stats
```

Updates:
- Star counts
- Fork counts
- Last updated dates
- Trending rankings

### check-sites.js

**Verifies sites are accessible:**

```bash
npm run check-sites
```

Checks:
- ✅ Repository exists
- ✅ Is public
- ✅ Has pages/ folder
- ✅ Entry file exists
- ✅ Has minimact.config.json

---

## Examples

### Personal Blog

```json
{
  "name": "Jane's Dev Blog",
  "repo": "gh://jane/blog",
  "entry": "pages/index.tsx",
  "tags": ["blog", "tsx-native"],
  "description": "Personal blog about TypeScript, React, and web performance",
  "author": "jane",
  "homepage": "https://github.com/jane",
  "screenshot": "https://raw.githubusercontent.com/jane/blog/main/screenshot.png"
}
```

### Component Library

```json
{
  "name": "React Aria Components",
  "repo": "gh://ui-libs/react-aria-minimact",
  "entry": "docs/index.tsx",
  "tags": ["components", "ui", "accessibility"],
  "description": "Accessible UI components for Minimact based on React Aria",
  "author": "ui-libs",
  "license": "MIT",
  "components": [
    {
      "name": "Button",
      "path": "src/Button.tsx",
      "description": "Accessible button component"
    },
    {
      "name": "Modal",
      "path": "src/Modal.tsx",
      "description": "Accessible modal dialog"
    }
  ],
  "dependencies": {
    "@minimact/core": "^1.0.0",
    "@react-aria/button": "^3.0.0"
  }
}
```

### Documentation Site

```json
{
  "name": "Minimact Documentation",
  "repo": "gh://minimact/docs",
  "entry": "pages/index.tsx",
  "tags": ["docs", "framework", "minimact"],
  "description": "Official documentation for the Minimact framework",
  "author": "minimact",
  "featured": true,
  "links": {
    "github": "https://github.com/minimact/minimact",
    "website": "https://minimact.dev"
  }
}
```

---

## Roadmap

### Phase 1 (Current)
- ✅ Basic registry (sites.json)
- ✅ Tag-based organization
- ✅ PR-based submissions
- ✅ Auto-validation
- ✅ Stats tracking

### Phase 2 (Q1 2025)
- 🚧 REST API
- 🚧 GraphQL API
- 🚧 Component registry
- 🚧 User profiles
- 🚧 Collections

### Phase 3 (Q2 2025)
- ⏳ Search ranking algorithm
- ⏳ Recommendation engine
- ⏳ Analytics dashboard
- ⏳ Verified publishers
- ⏳ Sponsorship badges

### Phase 4 (Q3 2025)
- ⏳ Marketplace (paid components)
- ⏳ License verification
- ⏳ CDN for popular components
- ⏳ Version management
- ⏳ Dependency graphs

---

## FAQ

### General

**Q: Who maintains this index?**  
A: The Minimact community. Pull requests are reviewed by core maintainers.

**Q: Is this the only index?**  
A: No! Anyone can create their own index. This is the "official" community index.

**Q: Can I submit sites not built with Minimact?**  
A: No. This index is specifically for TSX-native sites that work in Cactus Browser.

**Q: Is there a submission fee?**  
A: No. The index is free and open source.

### Submissions

**Q: How long until my PR is reviewed?**  
A: Usually within 48 hours. Popular times may take longer.

**Q: My PR was rejected. Why?**  
A: Common reasons: missing required fields, site doesn't work in Cactus Browser, duplicate submission, or violates guidelines.

**Q: Can I submit multiple sites?**  
A: Yes! Each site needs its own entry in sites.json.

**Q: Can I update my entry?**  
A: Yes. Submit a PR with the changes. Stats auto-update daily.

### Technical

**Q: Do I need to host my site somewhere?**  
A: No. GitHub is the host. Just push your code.

**Q: What if my repo is private?**  
A: Private repos won't be accessible to others in Cactus Browser. Keep it public for discoverability.

**Q: Can I use a custom domain?**  
A: Not yet, but this is on the roadmap. For now, sites are accessed via gh:// URLs.

**Q: How do I delete my entry?**  
A: Submit a PR removing your entry from sites.json.

---

## Contributing

### How to Help

**Submit Sites:**
- Add high-quality TSX-native sites
- Ensure they work in Cactus Browser
- Write clear descriptions

**Improve Documentation:**
- Fix typos
- Add examples
- Translate to other languages

**Build Tools:**
- Better validation scripts
- Automated testing
- Stats dashboards

**Curate:**
- Review PRs
- Test submitted sites
- Suggest featured sites

### Code of Conduct

Be respectful. This is a community-driven project. Harassment, spam, or malicious behavior will result in removal from the index.

---

## Community

- **Discord:** [discord.gg/posthydration](https://discord.gg/posthydration)
- **Twitter:** [@PosthydrationWeb](https://twitter.com/PosthydrationWeb)
- **Reddit:** [r/PosthydrationWeb](https://reddit.com/r/PosthydrationWeb)
- **GitHub Discussions:** [github.com/postweb/index/discussions](https://github.com/postweb/index/discussions)

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

**Thanks to:**
- The Minimact team for building the foundation
- Cactus Browser developers for the tooling
- All contributors who submit sites
- The Posthydrationist community

---

<p align="center">
  <strong>The web is no longer served. It's cloned, cached, and compiled.</strong>
</p>

<p align="center">
  <strong>Welcome to the Posthydrationist Web.</strong> 🌵
</p>

<p align="center">
  <a href="https://github.com/postweb/index">⭐ Star this Index</a> •
  <a href="#submission-guidelines">📝 Submit Your Site</a> •
  <a href="https://posthydration.dev">🌐 Learn More</a>
</p>
