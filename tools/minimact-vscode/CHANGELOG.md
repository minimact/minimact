# Changelog

All notable changes to the Minimact VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-01-XX (Tier 2 Features)

### Added
- **Preview Generated C#** - Live transformation preview
  - Side-by-side diff view showing TSX → C# transformation
  - Right-click context menu: "Preview Generated C#"
  - Editor title bar icon for quick access
  - Command palette integration
  - Babel plugin integration for real-time transformation
  - Error handling and user feedback
- **Component Scaffolding Wizard** - Interactive component creation
  - Multi-step wizard with validation
  - Component name validation (PascalCase)
  - Smart location detection (defaults to `src/components`)
  - Multi-select options:
    - Create codebehind file
    - Add useState example
    - Add useEffect example
    - Add useDomElementState (Minimact Punch)
    - Include TypeScript types file
  - Auto-generates TSX with selected hooks
  - Auto-generates codebehind with proper namespace
  - Auto-generates types file if requested
  - Right-click folder → "Create Component"
- **Compare with Generated** - Compare preview with actual file
  - Compares live transformation with build output
  - Helps verify build process
  - Shows differences if build is stale

### Changed
- Enhanced context menus for `.tsx` files
- Improved error messages and user guidance
- Better project structure detection

### Dependencies
- Added `@babel/core@^7.24.0`
- Added `@babel/preset-react@^7.24.0`
- Added `@babel/preset-typescript@^7.24.0`
- Added `@types/babel__core@^7.20.5`

### Added (Additional Tier 2 Features)
- **Build Status Indicator** - Real-time build monitoring
  - Status bar item showing component count and last build time
  - File watcher for `.tsx` files
  - Transformation tracking with success/error metrics
  - Detailed build status panel (click status bar)
  - Output channel for transformation logs
  - Configurable notifications on build errors
- **Quick Fixes & Code Actions** - Smart code suggestions
  - "Create codebehind file" quick fix
  - "Add missing imports" for Minimact hooks
  - "Add usePredictHint" for optimistic updates
  - "Convert to Minimact component" refactoring
  - Lightbulb (💡) appears automatically when applicable
- **Enhanced Syntax Highlighting** - Codebehind highlighting
  - Special highlighting for partial classes
  - EF Core query method highlighting
  - Async/await pattern highlighting
  - DbContext injection highlighting
  - Comment keyword highlighting (TODO, HACK, etc.)

### Configuration
- Added `minimact.showBuildStatus` setting
- Added `minimact.notifyOnBuildError` setting

## [0.1.0] - 2025-01-XX

### Added
- File icons and visual indicators for Minimact files
  - 📘 Blue badge for `.tsx` component files
  - 🔒 Gray badge for auto-generated `.cs` files
  - ⚙️ Green badge for `.codebehind.cs` files
- Warning message when opening auto-generated `.cs` files
  - "Edit TSX Instead" quick action
  - "Open Codebehind" quick action
- Quick navigation commands with keyboard shortcuts
  - Go to TSX Source (`Cmd+K, Cmd+T`)
  - Go to Generated C# (`Cmd+K, Cmd+C`)
  - Go to Codebehind (`Cmd+K, Cmd+B`)
  - Cycle through related files (`Cmd+K, Cmd+S`)
- Auto-create codebehind files with proper templates
  - Partial class declaration
  - Dependency injection constructor
  - Example database query method (commented)
- Comprehensive snippet library
  - `mcomp` - Component template
  - `mstate` - useState hook
  - `meffect` - useEffect hook
  - `mref` - useRef hook
  - `mpred` - usePredictHint
  - `mdom` - useDomElementState (Minimact Punch)
  - `mclient` - useClientState
  - `mtemplate` - useTemplate
  - `mcb` - Codebehind class
  - `mdb` - Database query method
  - `mauth` - Authorize attribute
- Configuration settings
  - `minimact.warnOnGeneratedFileEdit`
  - `minimact.makeGeneratedFilesReadOnly`
  - `minimact.componentsDirectory`
- Welcome message for first-time users

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Roadmap

### Version 0.2.0 (Tier 2 Features)
- Preview Generated C# side-by-side
- Component scaffolding wizard
- Build status indicator in status bar
- Syntax highlighting enhancements
- Quick fixes and code actions

### Version 0.3.0 (Tier 3 Features)
- Hook hover tooltips showing generated C#
- Inline diagnostics for type mismatches
- Prediction Inspector panel
- SignalR traffic viewer
- Rename refactoring across files

---

[Unreleased]: https://github.com/minimact/minimact-vscode/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/minimact/minimact-vscode/releases/tag/v0.1.0
