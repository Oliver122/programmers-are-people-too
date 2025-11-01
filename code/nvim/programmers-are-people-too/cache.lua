-- Programmers Are People Too: Cache Manager
-- Handles saving and loading diagnostics cache to/from files

local M = {}

local cache_dir = nil

-- Simple hash function for file paths
local function hash_string(str)
  local hash = 0
  for i = 1, #str do
    local char = string.byte(str, i)
    hash = ((hash * 31) + char) % (2^32)
  end
  return math.abs(hash)
end

-- Normalize file path to absolute path
local function normalize_path(filepath)
  if not filepath or filepath == "" then
    return nil
  end
  
  -- Convert to absolute path
  local absolute_path = vim.fn.fnamemodify(filepath, ":p")
  
  -- Get the absolute path with filename
  -- This includes the full directory path + filename
  return absolute_path
end

-- Get cache file path for a given file path
local function get_cache_filepath(filepath)
  if not cache_dir or not filepath or filepath == "" then
    return nil
  end
  
  -- Normalize to absolute path + filename
  local absolute_path = normalize_path(filepath)
  if not absolute_path then
    return nil
  end
  
  -- Hash the absolute path + filename
  local hash = hash_string(absolute_path)
  return string.format("%s/%08x.json", cache_dir, hash)
end

-- Generate unique error ID from diagnostic
-- This includes identifying fields (excluding column positions) so the hashmap naturally prevents duplicates
-- Column positions are excluded because the same error can be reported at different positions on the same line
local function generate_error_id(diag)
  local str = string.format("%d:%s:%s:%s:%d", 
    diag.lnum or 0,
    diag.message or "", 
    diag.source or "",
    diag.code or "",
    diag.severity or 0)
  local hash = hash_string(str)
  return string.format("%08x", hash)
end

-- Generate hash from line text
local function hash_line_text(line_text)
  if not line_text then
    return nil
  end
  local hash = hash_string(line_text)
  return string.format("%08x", hash)
end

-- Save diagnostics for a file to cache
function M.save_file_cache(filepath, diagnostics)
  -- Normalize to absolute path for consistent hashing
  local absolute_path = normalize_path(filepath)
  if not absolute_path then
    return false
  end
  
  local cache_file = get_cache_filepath(absolute_path)
  if not cache_file then
    return false
  end

  -- Ensure cache directory exists
  vim.fn.mkdir(cache_dir, "p")
  
  -- Helper to check if buffer is still valid
  local function is_buffer_valid(buf)
    if not buf then
      return false
    end
    -- Check if buffer exists and is loaded
    local ok, _ = pcall(vim.api.nvim_buf_is_loaded, buf)
    return ok and vim.api.nvim_buf_is_loaded(buf)
  end

  -- Get buffer number from filepath (if available) - do this early
  local bufnr = nil
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if is_buffer_valid(buf) then
      local bufname = vim.api.nvim_buf_get_name(buf)
      if bufname == absolute_path then
        bufnr = buf
        break
      end
    end
  end
  
  -- Load existing cache to preserve solved errors
  local existing_cache = M.load_file_cache(absolute_path)
  local existing_errors = {}
  
  if existing_cache and existing_cache.errors then
    -- Clean up corrupted messages that might have "(good job)" in them
    for error_id, error_data in pairs(existing_cache.errors) do
      if error_data.message then
        -- Strip all instances of "(good job)" from cached messages
        error_data.message = error_data.message:gsub("%s*%(good job%)", "")
      end
    end
    existing_errors = existing_cache.errors
  end

  -- Create map of current diagnostics by error ID and by line number
  -- Also create a reverse lookup: diagnostic properties -> diagnostic
  local current_error_ids = {}
  local current_error_lines = {}  -- Track which lines have current errors
  local diagnostics_by_key = {}  -- Map diagnostic key -> diagnostic for matching existing errors
  for _, diag in ipairs(diagnostics) do
    local error_id = generate_error_id(diag)
    current_error_ids[error_id] = true
    current_error_lines[diag.lnum] = true
    -- Create a key for matching (same as error ID generation)
    local key = string.format("%d:%s:%s:%s:%d",
      diag.lnum or 0,
      diag.message or "",
      diag.source or "",
      diag.code or "",
      diag.severity or 0)
    diagnostics_by_key[key] = diag
  end

  -- Prepare cache data
  local cache_data = {
    filepath = filepath,
    absolute_path = absolute_path,
    errors = {}
  }

  -- Get buffer line count to check if lines still exist
  local max_line = nil
  if bufnr and is_buffer_valid(bufnr) then
    local ok, count = pcall(vim.api.nvim_buf_line_count, bufnr)
    if ok then
      max_line = count - 1  -- 0-indexed
    else
      bufnr = nil  -- Buffer is invalid, don't use it
    end
  end

  -- Process existing errors - mark as fixed if not in current diagnostics OR if line changed/removed
  for old_error_id, error_data in pairs(existing_errors) do
    -- Check if this error matches a current diagnostic (using new ID format)
    local error_key = string.format("%d:%s:%s:%s:%d",
      error_data.lnum or 0,
      error_data.message or "",
      error_data.source or "",
      error_data.code or "",
      error_data.severity or 0)
    local matching_diag = diagnostics_by_key[error_key]
    local is_still_active = matching_diag ~= nil
    local line_has_errors = current_error_lines[error_data.lnum]
    
    -- If error was previously fixed/displayed but now comes back - remove it from cache
    if (error_data.status == "fixed" or error_data.status == "displayed") and is_still_active then
      -- Error came back after being fixed - remove from cache (don't reactivate)
      goto continue
    end
    
    -- Skip already fixed or displayed errors - keep them for display, cleanup happens on save
    if error_data.status == "fixed" or error_data.status == "displayed" then
      -- Keep fixed/displayed errors temporarily for display
      cache_data.errors[old_error_id] = error_data
      goto continue
    end
    
    -- Check if line still exists in buffer (wasn't removed)
    local line_exists = true
    if bufnr and max_line ~= nil then
      line_exists = error_data.lnum <= max_line
    end
    
    -- Get current line text to compare (only if line exists)
    local current_line_text = nil
    if bufnr and is_buffer_valid(bufnr) and line_exists then
      local ok, lines = pcall(vim.api.nvim_buf_get_lines, bufnr, error_data.lnum, error_data.lnum + 1, false)
      if ok and lines and #lines > 0 then
        current_line_text = lines[1]
      end
    end
    
    local current_line_hash = hash_line_text(current_line_text)
    local cached_line_hash = hash_line_text(error_data.line_text)
    local line_changed = current_line_hash and cached_line_hash and current_line_hash ~= cached_line_hash
    
    if is_still_active then
      -- Error still exists - use new ID format and update
      local new_error_id = generate_error_id(matching_diag)
      error_data.status = "active"
      -- Always update column positions to current ones to avoid showing offset/old positions
      error_data.col = matching_diag.col
      error_data.end_col = matching_diag.end_col
      error_data.end_lnum = matching_diag.end_lnum
      if current_line_text then
        error_data.line_text = current_line_text  -- Update line text
      end
      -- Use new ID format (hashmap will prevent duplicates naturally)
      cache_data.errors[new_error_id] = error_data
    elseif not line_exists or (line_changed and not line_has_errors) or not is_still_active then
      -- Error no longer exists or line changed - mark as fixed
      error_data.status = "fixed"
      -- Keep in cache briefly for display (will be removed on next save)
      cache_data.errors[old_error_id] = error_data
    end
    
    ::continue::
  end

  -- Helper to get line text
  local function get_line_text(lnum)
    if bufnr and is_buffer_valid(bufnr) then
      local ok, lines = pcall(vim.api.nvim_buf_get_lines, bufnr, lnum, lnum + 1, false)
      if ok and lines and #lines > 0 then
        return lines[1]
      end
    end
    return nil
  end

  -- Add/update current diagnostics
  for _, diag in ipairs(diagnostics) do
    local error_id = generate_error_id(diag)
    local line_text = get_line_text(diag.lnum)
    
    if cache_data.errors[error_id] then
      -- Check if this error was previously fixed/displayed - if so, remove it (error came back)
      if cache_data.errors[error_id].status == "fixed" or cache_data.errors[error_id].status == "displayed" then
        -- Error came back after being fixed - remove from cache instead of reactivating
        cache_data.errors[error_id] = nil
      else
        -- Update existing error with current column positions (always update to latest)
        cache_data.errors[error_id].status = "active"
        -- Always update column positions to current ones to avoid showing offset/old positions
        cache_data.errors[error_id].col = diag.col
        cache_data.errors[error_id].end_col = diag.end_col
        cache_data.errors[error_id].end_lnum = diag.end_lnum
        if line_text then
          cache_data.errors[error_id].line_text = line_text
        end
      end
    else
      -- New error - check if this matches any previously fixed/displayed error (in original cache)
      -- If it does, we should skip adding it (error came back after being fixed)
      local should_skip = false
      for existing_id, existing_error in pairs(existing_errors) do
        if (existing_error.status == "fixed" or existing_error.status == "displayed") and 
           existing_error.lnum == diag.lnum and
           existing_error.message == diag.message and
           existing_error.source == diag.source and
           existing_error.code == diag.code and
           existing_error.severity == diag.severity then
          -- This matches a previously fixed error - don't add it (error came back)
          should_skip = true
          -- Also remove it from cache_data.errors if it was added there temporarily
          if cache_data.errors[existing_id] then
            cache_data.errors[existing_id] = nil
          end
          break
        end
      end
      
      if not should_skip then
        -- New error (not a return of a fixed one)
        cache_data.errors[error_id] = {
          message = diag.message,
          lnum = diag.lnum,
          col = diag.col,
          end_lnum = diag.end_lnum,
          end_col = diag.end_col,
          severity = diag.severity,
          source = diag.source,
          code = diag.code,
          status = "active",
          line_text = line_text,
        }
      end
    end
  end

  -- Write to file
  local file = io.open(cache_file, "w")
  if not file then
    return false
  end

  local json = vim.json.encode(cache_data)
  file:write(json)
  file:close()

  -- Return cache_data for use by callers
  return true, cache_data
end

-- Load diagnostics for a file from cache
function M.load_file_cache(filepath)
  -- Normalize to absolute path for consistent lookup
  local absolute_path = normalize_path(filepath)
  if not absolute_path then
    return nil
  end
  
  local cache_file = get_cache_filepath(absolute_path)
  if not cache_file then
    return nil
  end

  local file = io.open(cache_file, "r")
  if not file then
    return nil
  end

  local content = file:read("*all")
  file:close()

  if not content or content == "" then
    return nil
  end

  local ok, cache_data = pcall(vim.json.decode, content)
  if not ok or not cache_data then
    return nil
  end

  -- Verify absolute path matches (check both stored paths for backwards compatibility)
  local stored_absolute = cache_data.absolute_path or normalize_path(cache_data.filepath)
  if stored_absolute ~= absolute_path then
    return nil
  end

  -- Clean up messages
  local cleaned_errors = {}
  
  for error_id, error_data in pairs(cache_data.errors or {}) do
    -- Clean up any "(good job)" from cached messages (should never be there)
    if error_data.message then
      error_data.message = error_data.message:gsub("%s*%(good job%)", "")
    end
    
    -- Keep the error with its existing ID
    cleaned_errors[error_id] = error_data
  end
  
  cache_data.errors = cleaned_errors

  return cache_data
end

-- Clean up old solved errors from a file's cache
-- Changes "fixed" to "displayed" on first save, removes "displayed" on subsequent saves
function M.cleanup_old_solved_errors(filepath)
  if not filepath or filepath == "" then
    return false
  end

  local absolute_path = normalize_path(filepath)
  if not absolute_path then
    return false
  end

  local cache_data = M.load_file_cache(absolute_path)
  if not cache_data or not cache_data.errors then
    return false
  end

  local cleaned_errors = {}
  local changed = false

  for error_id, error_data in pairs(cache_data.errors) do
    if error_data.status == "fixed" then
      -- On save: change "fixed" to "displayed" so it persists until next save
      error_data.status = "displayed"
      cleaned_errors[error_id] = error_data
      changed = true
    elseif error_data.status == "displayed" then
      -- On next save: remove "displayed" errors (they've been shown twice now)
      changed = true
      -- Don't add to cleaned_errors (remove it)
    else
      -- Keep active errors
      cleaned_errors[error_id] = error_data
    end
  end

  -- Only save if something changed
  if changed then
    cache_data.errors = cleaned_errors
    local cache_file = get_cache_filepath(absolute_path)
    if cache_file then
      local file = io.open(cache_file, "w")
      if file then
        local json = vim.json.encode(cache_data)
        file:write(json)
        file:close()
        return true
      end
    end
  end

  return false
end

-- Setup function
function M.setup(opts)
  opts = opts or {}
  cache_dir = opts.cache_dir
end

return M
