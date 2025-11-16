#!/usr/bin/env node

/**
 * Validation script for postweb/index
 * Ensures all site entries follow the schema and best practices
 */

const fs = require('fs');
const path = require('path');

// Allowed tags
const ALLOWED_TAGS = [
  // Site types
  'blog', 'portfolio', 'docs', 'landing', 'dashboard', 'ecommerce',
  'tools', 'games', 'education', 'social',
  
  // Framework
  'minimact', 'tsx-native', 'posthydration',
  
  // Component libraries
  'components', 'ui', 'auth', 'forms', 'charts', 'icons',
  
  // Industry
  'finance', 'healthcare', 'entertainment', 'productivity',
  
  // Misc
  'template', 'examples', 'starter'
];

// Required fields
const REQUIRED_FIELDS = [
  'name', 'repo', 'entry', 'tags', 'description', 'author'
];

// gh:// URL pattern
const GH_URL_PATTERN = /^gh:\/\/[\w-]+\/[\w-]+(\/[\w\/-]+)?$/;

class Validator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  error(message) {
    this.errors.push(message);
  }

  warning(message) {
    this.warnings.push(message);
  }

  validateSitesJson() {
    console.log('🔍 Validating sites.json...\n');

    // Load sites.json
    let sites;
    try {
      const content = fs.readFileSync('sites.json', 'utf-8');
      sites = JSON.parse(content);
    } catch (err) {
      this.error(`Failed to parse sites.json: ${err.message}`);
      return false;
    }

    if (!Array.isArray(sites)) {
      this.error('sites.json must be an array');
      return false;
    }

    // Track seen repos to detect duplicates
    const seenRepos = new Set();

    // Validate each site
    sites.forEach((site, index) => {
      this.validateSite(site, index, seenRepos);
    });

    // Check alphabetical order
    this.checkAlphabeticalOrder(sites);

    return true;
  }

  validateSite(site, index, seenRepos) {
    const prefix = `Site #${index + 1} (${site.name || 'unnamed'})`;

    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!(field in site)) {
        this.error(`${prefix}: Missing required field "${field}"`);
      }
    });

    // Validate name
    if (site.name) {
      if (typeof site.name !== 'string') {
        this.error(`${prefix}: "name" must be a string`);
      }
      if (site.name.length < 3) {
        this.error(`${prefix}: "name" must be at least 3 characters`);
      }
      if (site.name.length > 100) {
        this.warning(`${prefix}: "name" is very long (${site.name.length} chars)`);
      }
    }

    // Validate repo
    if (site.repo) {
      if (typeof site.repo !== 'string') {
        this.error(`${prefix}: "repo" must be a string`);
      } else {
        if (!GH_URL_PATTERN.test(site.repo)) {
          this.error(`${prefix}: "repo" must be a valid gh:// URL`);
        }
        
        // Check for duplicates
        if (seenRepos.has(site.repo)) {
          this.error(`${prefix}: Duplicate repo "${site.repo}"`);
        }
        seenRepos.add(site.repo);
      }
    }

    // Validate entry
    if (site.entry) {
      if (typeof site.entry !== 'string') {
        this.error(`${prefix}: "entry" must be a string`);
      } else {
        if (!site.entry.endsWith('.tsx')) {
          this.error(`${prefix}: "entry" must be a .tsx file`);
        }
        if (!site.entry.startsWith('pages/')) {
          this.warning(`${prefix}: "entry" should typically start with "pages/"`);
        }
      }
    }

    // Validate tags
    if (site.tags) {
      if (!Array.isArray(site.tags)) {
        this.error(`${prefix}: "tags" must be an array`);
      } else {
        if (site.tags.length === 0) {
          this.error(`${prefix}: "tags" must contain at least one tag`);
        }
        if (site.tags.length > 10) {
          this.warning(`${prefix}: Too many tags (${site.tags.length}), consider limiting to 5-7`);
        }
        
        site.tags.forEach(tag => {
          if (typeof tag !== 'string') {
            this.error(`${prefix}: All tags must be strings`);
          } else if (!ALLOWED_TAGS.includes(tag)) {
            this.error(`${prefix}: Unknown tag "${tag}"`);
          }
        });

        // Check for duplicates
        const uniqueTags = new Set(site.tags);
        if (uniqueTags.size < site.tags.length) {
          this.warning(`${prefix}: Duplicate tags detected`);
        }
      }
    }

    // Validate description
    if (site.description) {
      if (typeof site.description !== 'string') {
        this.error(`${prefix}: "description" must be a string`);
      } else {
        if (site.description.length < 10) {
          this.error(`${prefix}: "description" too short (min 10 chars)`);
        }
        if (site.description.length > 500) {
          this.warning(`${prefix}: "description" very long (${site.description.length} chars)`);
        }
      }
    }

    // Validate author
    if (site.author) {
      if (typeof site.author !== 'string') {
        this.error(`${prefix}: "author" must be a string`);
      } else {
        // GitHub username validation
        if (!/^[a-zA-Z0-9-]+$/.test(site.author)) {
          this.error(`${prefix}: "author" contains invalid characters`);
        }
      }
    }

    // Validate optional fields
    if ('homepage' in site && site.homepage !== null) {
      if (typeof site.homepage !== 'string') {
        this.error(`${prefix}: "homepage" must be a string or null`);
      } else if (!site.homepage.startsWith('http://') && !site.homepage.startsWith('https://')) {
        this.error(`${prefix}: "homepage" must be a valid URL`);
      }
    }

    if ('license' in site) {
      const validLicenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC'];
      if (!validLicenses.includes(site.license)) {
        this.warning(`${prefix}: Uncommon license "${site.license}"`);
      }
    }

    if ('stars' in site && typeof site.stars !== 'number') {
      this.error(`${prefix}: "stars" must be a number`);
    }

    if ('forks' in site && typeof site.forks !== 'number') {
      this.error(`${prefix}: "forks" must be a number`);
    }

    if ('featured' in site && typeof site.featured !== 'boolean') {
      this.error(`${prefix}: "featured" must be a boolean`);
    }

    // Validate components array (for component libraries)
    if ('components' in site) {
      if (!Array.isArray(site.components)) {
        this.error(`${prefix}: "components" must be an array`);
      } else {
        site.components.forEach((comp, i) => {
          if (!comp.name) {
            this.error(`${prefix}: Component #${i + 1} missing "name"`);
          }
          if (!comp.path) {
            this.error(`${prefix}: Component #${i + 1} missing "path"`);
          }
          if (comp.path && !comp.path.endsWith('.tsx')) {
            this.error(`${prefix}: Component #${i + 1} path must be .tsx file`);
          }
        });
      }
    }

    // Validate links
    if ('links' in site && typeof site.links !== 'object') {
      this.error(`${prefix}: "links" must be an object`);
    }

    // Validate dependencies
    if ('dependencies' in site && typeof site.dependencies !== 'object') {
      this.error(`${prefix}: "dependencies" must be an object`);
    }
  }

  checkAlphabeticalOrder(sites) {
    for (let i = 1; i < sites.length; i++) {
      const prev = sites[i - 1].name?.toLowerCase();
      const curr = sites[i].name?.toLowerCase();
      
      if (prev && curr && prev > curr) {
        this.warning(`Sites not in alphabetical order: "${sites[i - 1].name}" comes before "${sites[i].name}"`);
      }
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Validation passed! No errors or warnings.');
      return true;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ ${this.errors.length} ERROR(S):\n`);
      this.errors.forEach(err => console.log(`  • ${err}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} WARNING(S):\n`);
      this.warnings.forEach(warn => console.log(`  • ${warn}`));
    }

    console.log('\n' + '='.repeat(60));

    return this.errors.length === 0;
  }
}

// Run validation
const validator = new Validator();

if (!validator.validateSitesJson()) {
  process.exit(1);
}

const success = validator.printResults();
process.exit(success ? 0 : 1);
