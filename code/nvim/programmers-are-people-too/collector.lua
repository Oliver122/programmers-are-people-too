-- Programmers Are People Too: Diagnostics Collector
-- Collects diagnostics from all buffers

local M = {}

local diagnostics_cache = {}
local cache_manager = nil
local auto_save_cache = false

-- Collect all LSP diagnostics from all buffers
function M.collect_all()
  diagnostics_cache = {}
  local bufs = vim.api.nvim_list_bufs()

  for _, buf in ipairs(bufs) do
    -- Check if buffer is still valid before accessing
    local ok, is_loaded = pcall(vim.api.nvim_buf_is_loaded, buf)
    if ok and is_loaded then
      -- Validate buffer is still valid before getting diagnostics
      ok, _ = pcall(vim.api.nvim_buf_get_name, buf)
      if not ok then
        goto continue
      end
      
      local diags = vim.diagnostic.get(buf)
      local bufname = vim.api.nvim_buf_get_name(buf)
      if bufname == "" then
        bufname = string.format("[No Name %d]", buf)
      end
      
      -- Always save to cache if enabled (even if no diagnostics, to mark errors as fixed)
      -- This ensures errors are marked as "fixed" when they disappear from LSP diagnostics
      if auto_save_cache and cache_manager and bufname ~= "" and not bufname:match("^%[No Name") then
        -- Validate buffer is still valid before saving to cache
        ok, _ = pcall(vim.api.nvim_buf_is_loaded, buf)
        if ok and vim.api.nvim_buf_is_loaded(buf) then
          cache_manager.save_file_cache(bufname, diags)
        end
      end
      
      if #diags > 0 then
        diagnostics_cache[bufname] = diags
      end
    end
    
    ::continue::
  end

  return diagnostics_cache
end

-- Setup function
function M.setup(opts)
  opts = opts or {}
  cache_manager = opts.cache_manager
  auto_save_cache = opts.auto_save_cache ~= false
  
  -- Cache updates happen on save only (via BufWritePost in init.lua)
end

return M

