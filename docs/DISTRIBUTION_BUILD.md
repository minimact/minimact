# 📦 Minimact Swig Distribution Build

Complete guide for building and distributing Minimact Swig as a standalone Electron app.

## 🎯 Goal

Create a **public-facing distribution repository** where users can:
1. Clone the repo
2. Run `npm install`
3. Run `npm start`
4. App launches immediately (no build step needed)

## 📂 What Gets Built

### Source (Development Repo)
```
minimact/
├── src/
│   ├── babel-plugin-minimact/       # TypeScript source
│   ├── minimact-punch/              # TypeScript source
│   ├── client-runtime/              # TypeScript source
│   └── minimact-swig-electron/      # Electron source
├── scripts/
│   └── build-distribution.js        # 🔧 The magic script
└── package.json
```

### Distribution (Public Repo)
```
minimact-swig-dist/                  # ← Created in ../minimact-swig-dist
├── dist/                            # ← Built Electron app
│   ├── main/
│   │   └── index.js                 # Minified main process
│   ├── preload/
│   │   └── index.js                 # Minified preload
│   └── renderer/
│       ├── index.html
│       └── assets/                  # CSS, JS, images
├── mact_modules/                    # ← Built Minimact packages
│   └── @minimact/
│       ├── babel-plugin/
│       │   ├── index.cjs
│       │   ├── dist/
│       │   └── node_modules/
│       │       └── @babel/types/    # Bundled dependencies
│       ├── core/
│       │   └── dist/
│       └── punch/
│           └── dist/
├── resources/                       # ← App icons, assets
├── build/                           # ← Electron-builder configs
├── package.json                     # ← Runtime deps only, no devDeps
├── package-lock.json                # ← Exact versions
├── .gitignore
└── README.md                        # ← User-facing docs
```

## 🚀 Usage

### Build the Distribution

```bash
cd J:\projects\minimact

# Build distribution (runs all steps automatically)
npm run build:dist
```

### What the Script Does

The script performs these steps automatically:

1. **Builds all packages** (`@minimact/babel-plugin`, `@minimact/punch`, `@minimact/core`)
2. **Syncs to mact_modules** (copies built files)
3. **Builds Electron app** (TypeScript → JavaScript, minified)
4. **Creates distribution directory** (`../minimact-swig-dist`)
5. **Copies built files** (dist/, mact_modules/, resources/)
6. **Creates clean package.json** (runtime deps only)
7. **Copies package-lock.json** (exact versions)
8. **Creates .gitignore**
9. **Creates README.md** (user-facing instructions)
10. **Shows summary** (file sizes, next steps)

### Output

```
🏗️  Building Minimact Swig Distribution

1️⃣  Building packages (babel-plugin, punch, core)...
✓ Packages built

2️⃣  Syncing packages to mact_modules...
✓ Packages synced to mact_modules

3️⃣  Building Electron app...
✓ Electron app built

4️⃣  Creating distribution directory...
✓ Created J:\projects\minimact-swig-dist

5️⃣  Copying built Electron app...
  Copied main process (1.2 MB)
  Copied preload (0.05 MB)
  Copied renderer (2.3 MB)
✓ Built Electron app copied

6️⃣  Copying mact_modules (built packages)...
✓ Copied mact_modules (1.1 MB)

7️⃣  Copying resources (icons, assets)...
  Copied resources (0.8 MB)
  Copied build assets (0.5 MB)
✓ Resources copied

8️⃣  Creating clean package.json...
✓ Created package.json (runtime deps only)

9️⃣  Copying package-lock.json...
✓ Copied package-lock.json (exact versions)

10️⃣ Copying electron-builder config...
  Copied electron-builder.yml

11️⃣ Creating .gitignore...
✓ Created .gitignore

12️⃣ Creating README.md...
✓ Created README.md

13️⃣ Calculating distribution size...
  Total size: 6.2 MB
  Location: J:\projects\minimact-swig-dist

✅ Distribution Built Successfully!
```

## 🧪 Testing the Distribution

### Local Test

```bash
# Navigate to distribution
cd ../minimact-swig-dist

# Install dependencies (gets Electron at exact version)
npm install

# Start the app
npm start
```

**Expected Result:**
- Minimact Swig launches
- Monaco editor loads
- Terminal works
- Transpiler works (TSX → C#)

### Verify Contents

```bash
cd ../minimact-swig-dist

# Check main entry point
cat package.json | grep "main"
# Should show: "main": "dist/main/index.js"

# Check mact_modules
ls mact_modules/@minimact
# Should show: babel-plugin  core  punch

# Check dependencies
cat package.json | grep -A 20 "dependencies"
# Should NOT show devDependencies
# Should NOT show @minimact/* packages (they're in mact_modules!)
```

## 📤 Publishing to GitHub

### Create Distribution Repository

```bash
cd ../minimact-swig-dist

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Release v1.0.0"

# Add remote (create repo on GitHub first)
git remote add origin https://github.com/yourusername/minimact-swig

# Push
git push -u origin main
```

### Create GitHub Release

1. Go to GitHub repo → Releases → New Release
2. Tag: `v1.0.0`
3. Title: `Minimact Swig v1.0.0`
4. Description:
```markdown
## Minimact Swig - Desktop IDE

**Quick Start:**
```bash
git clone https://github.com/yourusername/minimact-swig
cd minimact-swig
npm install
npm start
```

### Features
- Monaco editor with TSX support
- Real-time transpilation (TSX → C#)
- Integrated terminal
- Project management
- Live preview

### System Requirements
- Node.js 18+
- npm 9+
- Windows 10+, macOS 10.13+, or Linux
```

5. Attach built binaries (optional, see below)

### Building Binaries (Optional)

If you want to provide installers (`.exe`, `.dmg`, `.AppImage`):

```bash
cd ../minimact-swig-dist

# Add build scripts to package.json
npm install --save-dev electron-builder

# Build for current platform
npm run build:dist   # Assuming electron-builder.yml exists

# Build for specific platforms
npx electron-builder --win
npx electron-builder --mac
npx electron-builder --linux
```

Binaries will be in `dist-electron/`.

## 👥 User Experience

### What Users See

1. **Clone repo**
```bash
git clone https://github.com/yourusername/minimact-swig
cd minimact-swig
```

2. **Install** (downloads Electron + deps at exact versions)
```bash
npm install
```

3. **Start** (launches immediately!)
```bash
npm start
```

4. **Use app**
- Create/open Minimact projects
- Edit TSX files
- Auto-transpile to C#
- Build and run apps

### What Users DON'T See

- ❌ No TypeScript source code
- ❌ No build step required
- ❌ No `src/` directory
- ❌ No devDependencies
- ❌ No rollup/babel/vite configs

Just **built files** and a simple `npm start`.

## 📊 Size Comparison

### Development Repo (with source)
```
minimact/                           ~300 MB
├── src/                            ~50 MB (source code)
├── node_modules/                   ~200 MB
├── src/minimact-swig-electron/     ~50 MB
│   ├── src/                        ~5 MB (TypeScript)
│   ├── node_modules/               ~40 MB
│   └── out/                        ~5 MB (built)
```

### Distribution Repo (no source)
```
minimact-swig-dist/                 ~6 MB
├── dist/                           ~3.5 MB (minified JS)
├── mact_modules/                   ~1.1 MB (built packages)
├── resources/                      ~1.0 MB (icons)
└── build/                          ~0.4 MB (configs)

After npm install:                  ~46 MB
└── node_modules/                   ~40 MB (Electron + deps)
```

**Repo size savings: ~294 MB (98% smaller!)**

## 🔄 Update Workflow

### When to Rebuild

Rebuild the distribution when:
- You fix bugs in source code
- You add new features
- You update dependencies
- You release a new version

### Update Process

1. **Make changes** in development repo
```bash
cd J:\projects\minimact
# Edit src files...
git commit -m "Fix: transpiler bug"
```

2. **Rebuild distribution**
```bash
npm run build:dist
```

3. **Test distribution**
```bash
cd ../minimact-swig-dist
npm install
npm start
```

4. **Commit and push**
```bash
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main --tags
```

5. **Update GitHub release**
- Create new release with v1.0.1 tag
- Add changelog
- Attach binaries (optional)

## 🛠️ Customization

### Modify package.json Output

Edit `scripts/build-distribution.js`:

```javascript
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  // Add custom fields
  repository: 'https://github.com/yourusername/minimact-swig',
  bugs: 'https://github.com/yourusername/minimact-swig/issues',
  // Add more dependencies
  dependencies: {
    'electron': pkg.dependencies.electron,
    // ... add more
  }
};
```

### Modify README Template

Edit `scripts/build-distribution.js`, find the `readme` variable:

```javascript
const readme = `# Your Custom Title

Your custom content...
`;
```

### Add Additional Files

Edit `scripts/build-distribution.js`, add copy steps:

```javascript
// Step N: Copy additional files
fs.copySync(
  path.join(ELECTRON_APP, 'CHANGELOG.md'),
  path.join(DIST_REPO, 'CHANGELOG.md')
);
```

## 🐛 Troubleshooting

### "out/ directory not found"

**Cause:** Electron app not built.

**Fix:**
```bash
cd src/minimact-swig-electron
npm run build
```

### "mact_modules/ not found"

**Cause:** Packages not synced.

**Fix:**
```bash
cd J:\projects\minimact
npm run sync
```

### "Module not found: @minimact/..."

**Cause:** Built electron app doesn't have correct paths.

**Fix:** Check `dist/main/index.js` has:
```javascript
const babelPluginPath = path.join(__dirname, '../../mact_modules/@minimact/babel-plugin/index.cjs');
```

### Distribution runs but transpiler fails

**Cause:** `@babel/types` not in mact_modules.

**Fix:** Check sync config includes:
```javascript
include: [
  'dist/**/*',
  'node_modules/@babel/types/**/*'
]
```

## 📚 Related Docs

- [LOCAL_PACKAGE_SYNC.md](./LOCAL_PACKAGE_SYNC.md) - How mact_modules works
- [BABEL_DEPENDENCIES.md](./BABEL_DEPENDENCIES.md) - Why @babel/types is needed
- [MINIMACT_SWIG_ELECTRON_PLAN.md](./MINIMACT_SWIG_ELECTRON_PLAN.md) - Original plan

## ✅ Checklist

Before publishing:

- [ ] Run `npm run build:dist`
- [ ] Test distribution locally
- [ ] Verify `npm install && npm start` works
- [ ] Check file sizes are reasonable
- [ ] Update version in package.json
- [ ] Create git tag
- [ ] Write release notes
- [ ] Push to GitHub
- [ ] Create GitHub release

## 🎉 Summary

**Single command creates distribution:**
```bash
npm run build:dist
```

**Creates repo where users run:**
```bash
git clone <repo>
npm install
npm start
```

**Benefits:**
- ✅ No source code in distribution
- ✅ 98% smaller repo size
- ✅ Zero build step for users
- ✅ Exact dependency versions
- ✅ Professional UX

Perfect for public-facing developer tools! 🚀
