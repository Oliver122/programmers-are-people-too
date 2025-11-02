# AI Agent Instructions for ProgrammersArePeopleToo

## Project Mission

**"Programmers Are People Too"** - Breaking the negative feedback loop in development environments by introducing positive reinforcement. Instead of only showing red underlines for errors and yellow for warnings, this project celebrates developer achievements with visual feedback like sparkles, smooth pulses, confetti, and green highlights when code improves.

## Project Architecture

This BaselHack 2025 hackathon project implements editor extensions for positive developer feedback:
- `code/vscode/` - VS Code extension for positive reinforcement (v0.0.7 published)
- `code/nvim/` - Neovim plugin for terminal-native positive feedback (v1.0.0 available)
- `presentation/` - BaselHack 2025 pitch deck using reveal.js
- `documentation/` - Project documentation 
- `assets/` - Media and presentation files
- Root-level `tsconfig.json` compiles from `code/vscode/src` to `out/`

## Core Features to Implement

### Positive Feedback Events
- **Sparkles** when linter/prettier goes silent (errors → clean)
- **Smooth pulse** on successful build completion
- **Confetti** in terminal after clean CI runs
- **Green highlights** when syntax errors are fixed (red → normal)
- **AI-powered appreciation** for especially clever/clean code snippets

### Integration Points
- Hook into Language Server Protocol (LSP) for real-time feedback
- Monitor diagnostic changes (errors/warnings clearing)
- Watch build task completion and test results
- Integrate with formatters and linters for style achievements

## VS Code Extension Structure

The extension (`code/vscode/`) follows standard VS Code extension patterns:
- Entry point: `src/extension.ts` with `activate()` and `deactivate()` functions
- Commands registered in `package.json` under `contributes.commands`
- Currently implements: `programmersarepeopletoo.helloWorld` command
- Extension activates on-demand (empty `activationEvents`)

## Development Workflow

### Build & Watch
- Use the pre-configured npm watch task: Run Task → "npm: watch"
- TypeScript compiles from `src/` to `out/` with source maps enabled
- Watch task runs in background with `$tsc-watch` problem matcher

### Testing & Debugging
- **Run Extension**: Use F5 or "Run Extension" launch configuration
- Opens new VS Code window with extension loaded at `--extensionDevelopmentPath=${workspaceFolder}/code/vscode`
- **Tests**: Located in `src/test/extension.test.ts` using Mocha
- Run tests with: `npm run test` (includes compile and lint steps)

### Code Quality
- **ESLint**: Modern flat config in `eslint.config.mjs` with TypeScript rules
- **TypeScript**: Strict mode enabled, ES2022 target, Node16 modules
- **Linting**: Enforces naming conventions, curly braces, strict equality

## Key Conventions

1. **Dual tsconfig pattern**: Root `tsconfig.json` for workspace compilation, `code/vscode/tsconfig.json` for extension-specific settings
2. **Command naming**: Use `programmersarepeopletoo.` prefix for all commands
3. **Error handling**: Use `vscode.window.showInformationMessage()` for user feedback
4. **Disposables**: Always push command registrations to `context.subscriptions`
5. **Positive feedback principle**: Celebrate achievements, don't just highlight problems
6. **Multi-editor support**: Design patterns that can work across VS Code and Neovim

## File Locations

- VS Code extension manifest: `code/vscode/package.json`
- VS Code main source: `code/vscode/src/extension.ts`
- Neovim plugin: `code/nvim/programmers-are-people-too/` (Lua implementation available)
- VS Code config: `.vscode/` (launch.json, tasks.json, settings.json)
- Build output: `code/vscode/out/` (git-ignored, search-excluded)
- Presentation: `presentation/index.html` and `presentation/standalone.html`

## Development Notes

- The `out/` folder is visible in file explorer but excluded from search
- TypeScript auto-detection is disabled (relies on npm scripts)
- Watch task runs silently (`reveal: never`) to avoid terminal clutter
- Extension uses VS Code API ^1.105.0 with ES2022 language features