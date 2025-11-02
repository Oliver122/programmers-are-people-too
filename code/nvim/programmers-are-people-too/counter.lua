-- Programmers Are People Too: Fixed Errors Counter
-- Tracks the total number of fixed errors and hints, and files worked on

local M = {}

local fixed_errors = 0
local fixed_hints = 0
local files_with_fixes = {}  -- Set of file paths that have had fixes

-- Increment counter for a fixed diagnostic
function M.increment_fixed(severity, filepath)
  -- LSP severity levels: ERROR=1, WARN=2, INFO=4, HINT=8
  if severity == vim.diagnostic.severity.ERROR or severity == vim.diagnostic.severity.WARN then
    fixed_errors = fixed_errors + 1
  elseif severity == vim.diagnostic.severity.HINT then
    fixed_hints = fixed_hints + 1
  -- INFO (4) is treated as neither error nor hint, could add separate counter if needed
  end
  
  -- Track unique files that have had fixes
  if filepath and filepath ~= "" then
    local absolute_path = vim.fn.fnamemodify(filepath, ":p")
    if absolute_path and absolute_path ~= "" then
      files_with_fixes[absolute_path] = true
    end
  end
end

-- Get current counts
function M.get_counts()
  local file_count = 0
  for _ in pairs(files_with_fixes) do
    file_count = file_count + 1
  end
  
  return {
    errors = fixed_errors,
    hints = fixed_hints,
    files = file_count,
  }
end

-- Reset counters (optional, for testing or manual reset)
function M.reset()
  fixed_errors = 0
  fixed_hints = 0
  files_with_fixes = {}
end

return M

