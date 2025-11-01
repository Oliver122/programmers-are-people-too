# Notification Setup

This plugin uses **nvim-notify** for beautiful bottom-right notifications when errors are fixed.

## Installation

### Using lazy.nvim:

```lua
{
  "rcarriga/nvim-notify",
  config = function()
    require("notify").setup({
      position = "bottom_right",
      stages = "fade_in_slide_out",
      timeout = 3000,
      max_height = function() return math.floor(vim.o.lines * 0.25) end,
      max_width = function() return math.floor(vim.o.columns * 0.25) end,
    })
  end,
}
```

### Using packer.nvim:

```lua
use({
  "rcarriga/nvim-notify",
  config = function()
    require("notify").setup({
      position = "bottom_right",
      stages = "fade_in_slide_out",
      timeout = 3000,
    })
  end,
})
```

### Using vim-plug:

```vim
Plug 'rcarriga/nvim-notify'
```

Then add to your config:
```lua
require("notify").setup({
  position = "bottom_right",
  stages = "fade_in_slide_out",
  timeout = 3000,
})
```

## Optional: Override vim.notify

If you want ALL notifications in Neovim to use nvim-notify:

```lua
vim.notify = require("notify")
```

## That's it!

After installing nvim-notify, your error notifications will appear beautifully in the bottom-right corner with fade-in animations when you fix errors!

