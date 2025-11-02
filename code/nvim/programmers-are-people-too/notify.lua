-- Programmers Are People Too: Notification Helper
-- Handles displaying notifications when errors are fixed and files are saved

local M = {}

-- Show notifications with nvim-notify (if available)
function M.show_notification(message, level, opts)
  level = level or vim.log.levels.INFO
  opts = opts or {}
  
  -- Try to use nvim-notify (best option for nice notifications)
  local ok, notify = pcall(require, "notify")
  
  if ok then
    -- nvim-notify with beautiful styling
    local notify_opts = vim.tbl_extend("keep", {
      timeout = opts.timeout or 2000,
      render = "default",
      position = opts.position or "bottom_right",
      stages = opts.stages or "fade_in_slide_out",
      max_height = function() return math.floor(vim.o.lines * 0.25) end,
      max_width = function() return math.floor(vim.o.columns * 0.25) end,
      on_open = function(win)
        vim.api.nvim_win_set_config(win, { zindex = 1000 })
      end,
    }, opts)
    
    notify(message, level, notify_opts)
  else
    -- Fallback to vim.notify if nvim-notify not installed
    vim.notify(message, level, opts)
  end
end

-- Show notification when errors are fixed
function M.notify_fixed(message, level, opts)
  opts = opts or {}
  opts.title = opts.title or "✓ Errors Fixed"
  opts.timeout = opts.timeout or 3000
  M.show_notification(message, level, opts)
end

-- Show notification when file is saved
function M.notify_saved(filepath)
  if not filepath or filepath == "" then
    return
  end
  
  -- Get just the filename for cleaner notification
  local filename = vim.fn.fnamemodify(filepath, ":t")
  
  M.show_notification(
    string.format("Saved: %s", filename),
    vim.log.levels.INFO,
    {
      title = "✓ File Saved",
      timeout = 1500,
      position = "bottom_right",
    }
  )
end

return M

