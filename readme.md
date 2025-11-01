# Programmers Are People Too ✨

![Programmers Are People Too Logo](assets/ProgrammersArepeopleToo.png)

> *Breaking the negative feedback loop in development environments with positive reinforcement*

## The Problem 🚨

Every day, developers face a courtroom of development tools:
- **Red underlines** screaming about errors
- **Yellow warnings** nagging about potential issues  
- **Angry compiler messages** judging our every keystroke
- **Success = silence** - the mere absence of problems

This creates a **negative feedback loop** that makes programming feel tedious and draining. We celebrate nothing. We only notice when things go wrong.

## Our Solution 🌟

**What if development tools celebrated your wins instead of just punishing your mistakes?**

We're building editor extensions that introduce **positive reinforcement** into your coding workflow:

### ✨ Celebration Moments
- **Sparkles** when your linter or prettier goes silent (errors → clean code)
- **Smooth pulse** animations on successful builds
- **Confetti** in the terminal after clean CI runs
- **Green highlights** when syntax errors disappear (red → normal)
- **AI-powered appreciation** for especially clever or clean code snippets

### 🎯 The Vision
Like good teachers who use green pens to highlight excellent work alongside red pens for corrections, we want development tools that celebrate achievements, not just point out problems.

## What We're Building 🛠️

### VS Code Extension (`code/vscode/`)
- Hooks into the Language Server Protocol (LSP) for real-time feedback
- Monitors diagnostic changes and celebrates improvements
- Integrates with build tasks, formatters, and linters
- Beautiful visual feedback for coding achievements

### Neovim Plugin (`code/nvim/`) *[Planned]*
- Cross-platform positive reinforcement
- Vim-native celebration mechanics
- Shared core logic with VS Code extension

### Future Possibilities 🚀
- **AI-powered code appreciation** using MCP servers
- **CLI tools** for terminal-based celebrations
- **Integration with popular tools** (Jest, ESLint, Prettier, etc.)
- **Team celebration modes** for collaborative wins

## Quick Start 🎬

### Development Setup
```bash
# Clone and navigate
git clone https://github.com/Oliver122/programmers-are-people-too.git
cd programmers-are-people-too

# VS Code Extension Development
cd code/vscode
npm install
npm run watch  # Start TypeScript compiler in watch mode

# Press F5 to launch extension in new VS Code window
```

### Project Structure
```
├── code/
│   ├── vscode/          # VS Code extension source
│   └── nvim/            # Neovim plugin (planned)
├── documentation/       # Project docs
├── assets/             # Media and presentations
└── .github/            # AI agent instructions
```

## Contributing 🤝

We believe **developers deserve positive feedback**. Join us in changing how development tools make us feel.

### Core Principles
1. **Celebrate achievements**, don't just highlight problems
2. **Visual feedback** should feel delightful, not intrusive  
3. **Multi-editor support** - positive vibes for everyone
4. **Real-time responsiveness** - celebrate the moment it happens

## License 📄

MIT License - Spread the positive vibes! 🎉

---

*Built with ❤️ for BaselHack 2025*  
*Because programmers are people too, and people deserve to feel good about their work.*
