-- Programmers Are People Too: Solved Errors Display
-- Displays solved errors inline with "(good job)" message

local M = {}

local cache_manager = nil
local config = nil

-- Get solved errors for a buffer
function M.get_solved_errors(bufnr)
  -- Check if solved style is "none" - don't show anything
  if config and config.get and config.get("solved_style") == "none" then
    return {}
  end
  
  if not cache_manager or not bufnr then
    return {}
  end

  local bufname = vim.api.nvim_buf_get_name(bufnr)
  if not bufname or bufname == "" then
    return {}
  end

  local cache_data = cache_manager.load_file_cache(bufname)
  if not cache_data or not cache_data.errors then
    return {}
  end

  local solved_errors = {}
  local seen_locations = {}  -- Deduplicate by location

  for error_id, error_data in pairs(cache_data.errors) do
    -- Show both "fixed" and "displayed" status errors (displayed means it was shown once, still show it)
    if error_data.status == "fixed" or error_data.status == "displayed" then
      -- Create unique location key to prevent duplicates
      local location_key = string.format("%d:%d", error_data.lnum, error_data.col)
      
      -- Only add if we haven't seen this location yet
      if not seen_locations[location_key] then
        seen_locations[location_key] = true
        
        -- Convert to diagnostic-like format for display
        local message = " (good job)"
        
        -- Extended style: include original error message
        if config and config.get and config.get("solved_style") == "extended" then
          message = error_data.message .. message
        end
        
        table.insert(solved_errors, {
          lnum = error_data.lnum,
          col = error_data.col,
          end_lnum = error_data.end_lnum or error_data.lnum,
          end_col = error_data.end_col or error_data.col,
          severity = vim.diagnostic.severity.INFO,  -- Use INFO severity (less intrusive than ERROR)
          message = message,
          source = nil,  -- Don't show source (no "clang" etc.)
          code = nil,  -- Don't show code
          _solved = true,  -- Mark as solved for special handling
        })
      end
    end
  end

  return solved_errors
end

-- Setup function
function M.setup(opts)
  opts = opts or {}
  cache_manager = opts.cache_manager
  config = opts.config
end

return M
