# 🗂️ GitHub Web Index Repository - Complete Structure

This document lists all files created for the `postweb/index` repository - the DNS/registry of the Posthydrationist Web.

---

## 📁 Repository Structure

```
postweb/index/
├── README.md                           ✅ Main documentation
├── sites.json                          ✅ Central registry of all sites
├── trending.json                       ✅ Top sites by popularity
├── package.json                        ✅ NPM scripts and dependencies
│
├── .github/
│   ├── workflows/
│   │   ├── validate-pr.yml            ✅ Validates pull requests automatically
│   │   └── update-stats.yml           ✅ Updates stats daily
│   └── PULL_REQUEST_TEMPLATE.md       ✅ Template for site submissions
│
├── scripts/
│   ├── validate.js                    ✅ Validates site entries
│   ├── generate-tags.js               🚧 Generates tag-specific files
│   ├── update-stats.js                🚧 Updates GitHub stats
│   └── check-sites.js                 🚧 Verifies site accessibility
│
├── tags/                               🚧 Auto-generated tag files
│   ├── blog.json
│   ├── portfolio.json
│   ├── docs.json
│   └── ...
│
├── users/                              🚧 Auto-generated user files
│   ├── minimact.json
│   ├── you.json
│   └── ...
│
└── components/                         🚧 Component library index
    ├── ui.json
    ├── auth.json
    └── ...
```

Legend:
- ✅ Created and ready
- 🚧 To be implemented

---

## 📄 File Descriptions

### Core Files

#### README.md
**Purpose:** Complete documentation for the index  
**Contains:**
- What is the GitHub Web Index
- How to submit sites
- Entry format and schema
- Tag categories
- Search and discovery
- API access (future)
- FAQ

**View:** [POSTWEB_INDEX_README.md](./POSTWEB_INDEX_README.md)

---

#### sites.json
**Purpose:** Main registry of all published sites  
**Format:** JSON array of site objects  
**Schema:**
```json
{
  "name": "Site Name",
  "repo": "gh://user/repo",
  "entry": "pages/index.tsx",
  "tags": ["tag1", "tag2"],
  "description": "Description",
  "author": "github-username",
  "homepage": "https://...",
  "license": "MIT",
  "stars": 42,
  "featured": false
}
```

**Current entries:** 6 example sites  
**View:** [sites.json](./sites.json)

---

#### trending.json
**Purpose:** Top sites ranked by stars and recent growth  
**Updates:** Daily via GitHub Actions  
**Contains:**
- Top 10 trending sites
- Stars this week
- Overall statistics
- Fastest growing site

**View:** [trending.json](./trending.json)

---

#### package.json
**Purpose:** NPM configuration and scripts  
**Scripts:**
- `npm run validate` - Validate sites.json
- `npm run generate-tags` - Generate tag files
- `npm run update-stats` - Update GitHub stats
- `npm run check-sites` - Verify site accessibility
- `npm test` - Run validation

**View:** [package.json](./package.json)

---

### GitHub Actions

#### .github/workflows/validate-pr.yml
**Purpose:** Automatically validate pull requests  
**Triggers:**
- On PR to sites.json
- Manual dispatch

**Actions:**
1. Run validation script
2. Check site accessibility
3. Comment on PR with results

**View:** [validate-pr.yml](./.github/workflows/validate-pr.yml)

---

#### .github/workflows/update-stats.yml
**Purpose:** Update stats daily  
**Schedule:** Daily at 00:00 UTC  
**Actions:**
1. Fetch stars/forks from GitHub API
2. Update sites.json
3. Generate trending.json
4. Generate tag files
5. Commit changes

**View:** [update-stats.yml](./.github/workflows/update-stats.yml)

---

#### .github/PULL_REQUEST_TEMPLATE.md
**Purpose:** Template for submitting new sites  
**Contains:**
- Submission checklist
- Entry format example
- Required/optional fields
- Available tags
- Review process

**View:** [PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)

---

### Scripts

#### scripts/validate.js
**Purpose:** Comprehensive validation of site entries  
**Checks:**
- Required fields present
- Valid gh:// URLs
- Tags from allowed list
- No duplicate repos
- Alphabetical order
- Field type validation
- Component schema (for libraries)

**Usage:** `npm run validate`  
**Exit codes:**
- 0: Success
- 1: Validation failed

**View:** [validate.js](./scripts/validate.js)

---

#### scripts/generate-tags.js
**Purpose:** Auto-generate tag-specific JSON files  
**Status:** 🚧 To be implemented  
**Generates:**
- `tags/blog.json` - All sites tagged "blog"
- `tags/portfolio.json` - All sites tagged "portfolio"
- etc.

**Usage:** `npm run generate-tags`

**Pseudocode:**
```javascript
// Read sites.json
// Group sites by tags
// Write tags/[tag].json for each tag
// Include only relevant fields
```

---

#### scripts/update-stats.js
**Purpose:** Update GitHub stats (stars, forks, etc.)  
**Status:** 🚧 To be implemented  
**Uses:** GitHub API v4 (GraphQL)

**Updates:**
- Star counts
- Fork counts
- Last updated dates
- Trending rankings

**Usage:** `npm run update-stats`  
**Requires:** `GITHUB_TOKEN` environment variable

**Pseudocode:**
```javascript
// Read sites.json
// For each site:
//   Fetch repo stats from GitHub API
//   Update stars, forks, updated
// Calculate trending (stars gained this week)
// Write updated sites.json
// Write trending.json
```

---

#### scripts/check-sites.js
**Purpose:** Verify sites are accessible  
**Status:** 🚧 To be implemented  
**Checks:**
- Repository exists
- Is public
- Has pages/ folder
- Entry file exists
- Has minimact.config.json
- Loads in Cactus Browser (optional)

**Usage:** `npm run check-sites`

**Pseudocode:**
```javascript
// Read sites.json
// For each site:
//   Check repo exists via GitHub API
//   Check repo is public
//   Check pages/ folder exists
//   Check entry file exists
//   Report any issues
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
gh repo clone postweb/index
cd index
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Validate Current Entries

```bash
npm run validate
```

### 4. Submit Your Site

```bash
# Fork the repo
gh repo fork postweb/index

# Add your entry to sites.json
vim sites.json

# Validate
npm run validate

# Commit and push
git add sites.json
git commit -m "Add my-awesome-site"
git push

# Create PR
gh pr create
```

---

## 📊 Statistics (as of 2025-11-15)

```
Total Sites:        6 (example entries)
Total Authors:      1
Total Components:   5
Total Tags:         13 unique tags used
Featured Sites:     4
Sites This Week:    0 (new repo)
```

---

## 🔮 Roadmap

### Phase 1: Core Registry ✅
- ✅ Basic sites.json structure
- ✅ README documentation
- ✅ Validation script
- ✅ PR automation

### Phase 2: Auto-Updates (In Progress)
- 🚧 Stats update script
- 🚧 Tag generation
- 🚧 Site accessibility checks
- 🚧 Daily GitHub Actions

### Phase 3: Discovery Features
- ⏳ Tag-based browsing
- ⏳ User pages
- ⏳ Component registry
- ⏳ Search functionality

### Phase 4: API & Integration
- ⏳ REST API
- ⏳ GraphQL API
- ⏳ Cactus Browser integration
- ⏳ CLI tool

### Phase 5: Advanced Features
- ⏳ Featured site curation
- ⏳ Recommendation engine
- ⏳ Analytics dashboard
- ⏳ Verified publishers

---

## 🤝 Contributing

### Add a Site
1. Fork this repo
2. Add entry to `sites.json`
3. Run `npm run validate`
4. Submit PR

### Improve Scripts
1. Implement missing scripts
2. Add tests
3. Improve validation logic
4. Submit PR

### Documentation
1. Fix typos
2. Add examples
3. Clarify instructions
4. Submit PR

---

## 📝 Notes

### Allowed Tags

**Site Types:**
- blog, portfolio, docs, landing, dashboard, ecommerce, tools, games, education, social

**Framework:**
- minimact, tsx-native, posthydration

**Component Libraries:**
- components, ui, auth, forms, charts, icons

**Industry:**
- finance, healthcare, entertainment, productivity

**Misc:**
- template, examples, starter

### Schema Validation

The validation script checks:
- ✅ Required fields (name, repo, entry, tags, description, author)
- ✅ Valid gh:// URL format
- ✅ Tags from allowed list
- ✅ No duplicate repos
- ✅ Alphabetical order
- ✅ Field types
- ✅ Description length (10-500 chars)
- ✅ Component schema (for libraries)

### Auto-Generated Files

These files are generated automatically and should not be manually edited:
- `tags/*.json` - Generated from sites.json
- `users/*.json` - Generated from sites.json
- `trending.json` - Updated daily from GitHub API
- Star/fork counts in sites.json - Updated daily

---

## 🔗 Links

- **Main Repo:** https://github.com/postweb/index
- **Cactus Browser:** https://github.com/minimact/cactus-browser
- **Minimact Framework:** https://github.com/minimact/minimact
- **Discord:** https://discord.gg/posthydration
- **Website:** https://posthydration.dev

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

<p align="center">
  <strong>The DNS of the Posthydrationist Web</strong>
</p>

<p align="center">
  Browse, discover, and share TSX-native websites built for Cactus Browser
</p>

<p align="center">
  🌵 gh://postweb/index 🌵
</p>
