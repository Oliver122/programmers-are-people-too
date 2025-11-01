-- Programmers Are People Too: Configuration
-- Default configuration and config management

local M = {}

-- Default configuration
M.defaults = {
  -- Plugin enabled/disabled
  enabled = true,
  
  -- Error display style: "lsp", "nice", or "none"
  -- "lsp": Show raw LSP error messages
  -- "nice": Show friendly messages like "(look here m8)"
  -- "none": Don't show any error display
  error_display = "nice",
  
  -- Solved celebration style: "basic", "extended", or "none"
  -- "basic": Just "(yay good job!)"
  -- "extended": Include original error message + celebration
  -- "none": Don't show any fix notices
  solved_style = "basic",
  
  -- Solved notification style: "inline", "notification", "both", or "none"
  -- "inline": Show solved errors inline in the editor (default)
  -- "notification": Show summary notification using nvim-notify (e.g., "Cleared two errors")
  -- "both": Show both inline and notification
  -- "none": Don't show any notifications
  -- Note: For best results, install nvim-notify: https://github.com/rcarriga/nvim-notify
  solved_notification = "both",
}

-- Current configuration (merged with user opts)
M.config = {}

-- Setup configuration
function M.setup(opts)
  opts = opts or {}
  
  -- Merge user options with defaults
  M.config = vim.tbl_deep_extend("force", {}, M.defaults, opts)
  
  return M.config
end

-- Get configuration value
function M.get(key)
  return M.config[key]
end

-- Check if plugin is enabled
function M.is_enabled()
  return M.config.enabled ~= false
end

return M

