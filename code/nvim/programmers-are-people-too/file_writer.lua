-- Programmers Are People Too: File Writer
-- Handles writing diagnostics to files

local M = {}

local collector = nil
local formatter = nil

-- Ensure directory exists
local function ensure_dir(filepath)
  local dir = vim.fn.fnamemodify(filepath, ":h")
  if dir ~= "." and dir ~= "" then
    vim.fn.mkdir(dir, "p")
  end
end

-- Write full diagnostics report to file
function M.write_full_report(filepath)
  if not collector or not formatter then
    vim.notify("Programmers Are People Too: collector or formatter not initialized", vim.log.levels.ERROR)
    return false
  end

  local diagnostics_cache = collector.collect_all()
  local content = formatter.format_full_report(diagnostics_cache)

  ensure_dir(filepath)

  -- Write to file
  local file = io.open(filepath, "w")
  if not file then
    vim.notify("Failed to open file: " .. filepath, vim.log.levels.ERROR)
    return false
  end

  file:write(content)
  file:close()

  vim.notify(
    string.format("LSP diagnostics written to: %s", filepath),
    vim.log.levels.INFO,
    { title = "Programmers Are People Too" }
  )

  return true
end

-- Append error to log file
function M.append_error(filepath, bufname, diag)
  if not formatter then
    return false
  end

  ensure_dir(filepath)

  -- Append error to file
  local file = io.open(filepath, "a")
  if not file then
    return false
  end

  -- Check if this is first write (write header if file is new/empty)
  local size = file:seek("end")
  file:seek("set", 0)
  if size == 0 then
    file:write("=== LSP Error Log (Auto-logged) ===\n")
    file:write(string.format("Started: %s\n", os.date("%Y-%m-%d %H:%M:%S")))
    file:write("\n")
  end

  -- Write error
  file:write(formatter.format_single_error(bufname, diag))
  file:close()

  return true
end

-- Setup function
function M.setup(opts)
  opts = opts or {}
  collector = opts.collector
  formatter = opts.formatter
end

return M

