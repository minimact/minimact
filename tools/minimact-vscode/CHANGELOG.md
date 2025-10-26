# Changelog

All notable changes to the Minimact VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
