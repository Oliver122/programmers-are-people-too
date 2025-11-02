# Programmers Are People Too

A Neovim plugin that tracks LSP diagnostics and celebrates when you fix errors!

## How to Install

**Note**: For the best experience, you might want to use the notification system ([nvim-notify](https://github.com/rcarriga/nvim-notify)) which provides beautiful toast notifications when errors are fixed.

### Using lazy.nvim

Add this to your `plugins.lua` (or equivalent):

```lua
{
  dir = "/path/to/programmers-are-people-too",
  -- Or if using a git repo:
  -- "your-username/programmers-are-people-too",
  config = function()
    require("plugins.programmers-are-people-too").setup({
      -- Optional configuration
      enabled = true,
      solved_notification = "both", -- "inline", "notification", "both", or "none"
      notify_on_save = true,
    })
  end,
}
```

### Manual Installation

1. Clone or copy the plugin directory to your Neovim config:
   ```bash
   cp -r programmers-are-people-too ~/.config/nvim/lua/plugins/
   ```

2. Add to your `init.lua` or `plugins.lua`:
   ```lua
   require("plugins.programmers-are-people-too").setup()
   ```

## How to Use

### Basic Usage

The plugin works automatically once installed! It will:

- Track all LSP diagnostics (errors, warnings, hints) across your files
- Detect when errors are fixed and mark them as "solved"
- Display solved errors inline with celebration messages
- Show notifications when errors are fixed

### Commands

- `:CheerMeUp` - Shows a summary of all fixed errors and hints with celebratory messages

### Configuration Options

```lua
require("plugins.programmers-are-people-too").setup({
  -- Enable/disable the plugin
  enabled = true,
  
  -- How to show solved errors: "inline", "notification", "both", or "none"
  solved_notification = "both",
  
  -- Show notification when file is saved
  notify_on_save = true,
  
  -- Cache directory (optional, defaults to cache directory)
  cache_dir = nil,
  
  -- Auto-save cache (optional, defaults to true)
  auto_save_cache = true,
})
```

### Notification Styles

- `"inline"` - Shows solved errors inline in the editor (default)
- `"notification"` - Shows summary notifications using nvim-notify (e.g., "Cleared two errors")
- `"both"` - Shows both inline and notification
- `"none"` - Disables all notifications

**Note**: For best notification results, install [nvim-notify](https://github.com/rcarriga/nvim-notify).

