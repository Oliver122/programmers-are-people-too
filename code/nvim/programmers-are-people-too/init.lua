-- Programmers Are People Too Plugin
-- Main entry point - loads all modules

local M = {}

-- Load all plugin modules
local collector = require("plugins.programmers-are-people-too.collector")
local formatter = require("plugins.programmers-are-people-too.formatter")
local file_writer = require("plugins.programmers-are-people-too.file_writer")
local cache_manager = require("plugins.programmers-are-people-too.cache")
local solved_display = require("plugins.programmers-are-people-too.solved_display")
local config_module = require("plugins.programmers-are-people-too.config")

-- Namespace for solved errors
local solved_namespace = vim.api.nvim_create_namespace("programmers-are-people-too-solved")

-- Plugin state
local config = {}
local plugin_config = {}  -- Store plugin config for access in callbacks


-- Setup function
function M.setup(opts)
  opts = opts or {}
  
  -- Initialize configuration module
  plugin_config = config_module.setup(opts)
  
  -- Check if plugin is enabled
  if not plugin_config.enabled then
    return  -- Early exit if disabled
  end
  
  local default_filepath = opts.filepath or vim.fn.stdpath("cache") .. "/lsp_diagnostics.log"
  local cache_dir = opts.cache_dir or (vim.fn.stdpath("cache") .. "/programmers-are-people-too/diagnostics_cache")
  
  -- Store configuration (legacy compatibility)
  config.filepath = default_filepath
  config.cache_dir = cache_dir
  config.keymap = opts.keymap
  config.auto_log = opts.auto_log ~= false
  config.auto_save_cache = opts.auto_save_cache ~= false

  -- Initialize cache manager
  cache_manager.setup({
    cache_dir = cache_dir,
  })

  -- Initialize solved display with config
  solved_display.setup({
    cache_manager = cache_manager,
    config = config_module,
  })

  -- Initialize modules
  collector.setup({
    cache_manager = cache_manager,
    auto_save_cache = config.auto_save_cache,
  })

  file_writer.setup({
    collector = collector,
    formatter = formatter,
  })

  -- Create command to write diagnostics
  vim.api.nvim_create_user_command("ProgrammersErrorLog", function(args)
    local filepath = args.args ~= "" and args.args or config.filepath
    file_writer.write_full_report(filepath)
  end, {
    desc = "Write all LSP diagnostics to a file",
    nargs = "?",
    complete = "file",
  })

  -- Optionally add keybinding
  if config.keymap then
    vim.keymap.set("n", config.keymap, function()
      file_writer.write_full_report(config.filepath)
    end, { desc = "Log LSP errors to file" })
  end

  -- Flag to prevent recursion
  local updating_solved = false

  -- Helper to check if buffer is still valid
  local function is_buffer_valid(buf)
    if not buf then
      return false
    end
    local ok, is_loaded = pcall(vim.api.nvim_buf_is_loaded, buf)
    return ok and is_loaded
  end

  -- Helper function to show beautiful notifications using nvim-notify
  local function notify_fixed(message, level, opts)
    level = level or vim.log.levels.INFO
    opts = opts or {}
    
    -- Try to use nvim-notify (best option for nice notifications)
    local ok, notify = pcall(require, "notify")
    
    if ok then
      -- nvim-notify with beautiful styling
      local notify_opts = vim.tbl_extend("keep", {
        title = opts.title or "✓ Errors Fixed",
        timeout = 3000,
        render = "default",
        position = "bottom_right",
        stages = "fade_in_slide_out",
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

  -- Function to update solved errors display
  local function update_solved_errors()
    local bufnrs = {}
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if is_buffer_valid(buf) then
        local ok, bufname = pcall(vim.api.nvim_buf_get_name, buf)
        if ok and bufname and bufname ~= "" then
          bufnrs[#bufnrs + 1] = buf
        end
      end
    end

    for _, bufnr in ipairs(bufnrs) do
      -- Validate buffer is still valid before processing
      if not is_buffer_valid(bufnr) then
        goto continue
      end
      
      local ok, bufname = pcall(vim.api.nvim_buf_get_name, bufnr)
      if not ok or not bufname or bufname == "" then
        goto continue
      end

      -- Get current diagnostics to track which lines have active errors
      local ok_diags, current_diags = pcall(vim.diagnostic.get, bufnr)
      if not ok_diags then
        goto continue
      end
      
      local lines_with_errors = {}  -- Track which lines have active errors
      
      for _, diag in ipairs(current_diags) do
        -- Track line numbers with active errors (errors are more dominant)
        lines_with_errors[diag.lnum] = true
      end

      -- Get solved errors (already filtered and deduplicated)
      -- Display them BEFORE cleaning up so they're visible
      local solved_errors = solved_display.get_solved_errors(bufnr)
      local diagnostics_to_show = {}
      
      -- Check if line still exists in buffer
      local ok_count, max_line_count = pcall(vim.api.nvim_buf_line_count, bufnr)
      if not ok_count then
        goto continue
      end
      
      local max_line = max_line_count - 1  -- 0-indexed
      
      for _, solved in ipairs(solved_errors) do
        -- Check if line still exists (line wasn't removed)
        if solved.lnum <= max_line then
          -- Check if there's an active error on the same line
          local has_error_on_line = lines_with_errors[solved.lnum] or false
          
          -- Only show if no active errors on the same line (errors are more dominant)
          if not has_error_on_line then
            table.insert(diagnostics_to_show, {
              lnum = solved.lnum,
              col = solved.col,
              end_lnum = solved.end_lnum or solved.lnum,
              end_col = solved.end_col or solved.col,
              severity = solved.severity,  -- Use severity from solved_display (INFO)
              message = solved.message,
              source = solved.source,  -- Will be nil from solved_display
              code = solved.code,  -- Will be nil from solved_display
            })
          end
        end
        -- If line was removed (lnum > max_line), don't show it
      end

      -- Always set diagnostics (even if empty) to clear old ones
      local opts = {
        severity = { min = vim.diagnostic.severity.HINT },  -- Allow all severities
      }
      
      local ok_set, _ = pcall(vim.diagnostic.set, solved_namespace, bufnr, diagnostics_to_show, opts)
      
      ::continue::
    end
  end

  -- Update plugin on save only
  vim.api.nvim_create_autocmd({ "BufWritePost" }, {
    callback = function(args)
      local bufnr = args.buf
      if not bufnr then
        return
      end

      -- Prevent recursive updates
      if updating_solved then
        return
      end

      updating_solved = true
      
      -- Use vim.schedule to defer the update and ensure cache is saved first
      vim.schedule(function()
        local bufname = vim.api.nvim_buf_get_name(bufnr)
        if bufname and bufname ~= "" then
          -- Collect all diagnostics for this buffer
          local current_diags = vim.diagnostic.get(bufnr)
          
          -- Update collector (collects all diagnostics from all buffers)
          collector.collect_all()
          
          -- Save to cache (marks errors as solved when they disappear)
          local cache_data = nil
          if cache_manager and config.auto_save_cache then
            -- Save to cache even if no diagnostics (to mark old errors as solved)
            local ok, data = cache_manager.save_file_cache(bufname, current_diags)
            if ok and data then
              cache_data = data
            end
          end
          
          -- Count newly fixed errors for notification
          local notification_style = plugin_config.solved_notification or "inline"
          local newly_fixed_count = 0
          if notification_style == "notification" or notification_style == "both" then
            if cache_data and cache_data.errors then
              local seen_locations = {}  -- Deduplicate by location like solved_display does
              
              for error_id, error_data in pairs(cache_data.errors) do
                -- Only count "fixed" status (not "displayed"), since "fixed" = newly fixed
                if error_data.status == "fixed" then
                  local location_key = string.format("%d:%d", error_data.lnum, error_data.col)
                  if not seen_locations[location_key] then
                    seen_locations[location_key] = true
                    -- Check if line still exists and doesn't have active errors
                    local current_diags = vim.diagnostic.get(bufnr)
                    local lines_with_errors = {}
                    for _, diag in ipairs(current_diags) do
                      lines_with_errors[diag.lnum] = true
                    end
                    
                    local ok_count, max_line_count = pcall(vim.api.nvim_buf_line_count, bufnr)
                    if ok_count and error_data.lnum <= (max_line_count - 1) then
                      if not lines_with_errors[error_data.lnum] then
                        newly_fixed_count = newly_fixed_count + 1
                      end
                    end
                  end
                end
              end
              
              -- Fallback: reload from disk if cache_data not available
              if newly_fixed_count == 0 and cache_manager then
                local absolute_path = vim.fn.fnamemodify(bufname, ":p")
                local fallback_cache = cache_manager.load_file_cache(absolute_path)
                if fallback_cache and fallback_cache.errors then
                  local seen_locations = {}
                  for error_id, error_data in pairs(fallback_cache.errors) do
                    if error_data.status == "fixed" then
                      local location_key = string.format("%d:%d", error_data.lnum, error_data.col)
                      if not seen_locations[location_key] then
                        seen_locations[location_key] = true
                        local current_diags = vim.diagnostic.get(bufnr)
                        local lines_with_errors = {}
                        for _, diag in ipairs(current_diags) do
                          lines_with_errors[diag.lnum] = true
                        end
                        local ok_count, max_line_count = pcall(vim.api.nvim_buf_line_count, bufnr)
                        if ok_count and error_data.lnum <= (max_line_count - 1) then
                          if not lines_with_errors[error_data.lnum] then
                            newly_fixed_count = newly_fixed_count + 1
                          end
                        end
                      end
                    end
                  end
                end
              end
            end
          end
          
          -- Show notification if enabled
          if newly_fixed_count > 0 and (notification_style == "notification" or notification_style == "both") then
            local message
            if newly_fixed_count == 1 then
              message = "Cleared one error"
            else
              message = string.format("Cleared %d errors", newly_fixed_count)
            end
            -- Schedule notification separately to ensure it shows nicely
            vim.schedule(function()
              -- Use SUCCESS level for positive feedback and nice green color
              notify_fixed(message, vim.log.levels.SUCCESS, {
                title = newly_fixed_count == 1 and "✓ Error Fixed" or "✓ Errors Fixed",
              })
            end)
          end
          
          -- Auto-log errors if enabled (logs current errors to file)
          if config.auto_log then
            -- Log errors from this buffer
            local errors = vim.diagnostic.get(bufnr, { severity = vim.diagnostic.severity.ERROR })
            for _, diag in ipairs(errors) do
              file_writer.append_error(config.filepath, bufname, diag)
            end
          end
          
          -- Display solved errors inline if enabled
          if notification_style == "inline" or notification_style == "both" then
            update_solved_errors()
          elseif notification_style == "notification" then
            -- Still update to clear old inline diagnostics
            update_solved_errors()
            -- But clear them immediately if only using notification
            for _, buf in ipairs(vim.api.nvim_list_bufs()) do
              if is_buffer_valid(buf) then
                local ok, _ = pcall(vim.diagnostic.set, solved_namespace, buf, {}, {})
              end
            end
          elseif notification_style == "none" then
            -- Clear old inline diagnostics when notifications are disabled
            for _, buf in ipairs(vim.api.nvim_list_bufs()) do
              if is_buffer_valid(buf) then
                local ok, _ = pcall(vim.diagnostic.set, solved_namespace, buf, {}, {})
              end
            end
          end
          
          -- Then clean up old solved errors from cache file (they've been displayed)
          cache_manager.cleanup_old_solved_errors(bufname)
        end
        
        updating_solved = false
      end)
    end,
  })

  -- Clean up cache directory on exit
  vim.api.nvim_create_autocmd({ "VimLeavePre" }, {
    callback = function()
      if config.cache_dir and vim.fn.isdirectory(config.cache_dir) == 1 then
        -- Remove all files in the cache directory
        local files = vim.fn.glob(config.cache_dir .. "/*", false, true)
        for _, file in ipairs(files) do
          os.remove(file)
        end
        -- Remove the cache directory itself
        os.execute(string.format("rmdir '%s' 2>/dev/null", config.cache_dir))
      end
    end,
  })

end

return M

