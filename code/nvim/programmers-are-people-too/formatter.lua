-- Programmers Are People Too: Formatter
-- Formats diagnostics for output

local M = {}

-- Format all diagnostics for full report
function M.format_full_report(diagnostics_cache)
  local lines = {}
  local total_count = { error = 0, warn = 0, info = 0, hint = 0 }

  table.insert(lines, "=== LSP Diagnostics Report ===")
  table.insert(lines, string.format("Generated: %s", os.date("%Y-%m-%d %H:%M:%S")))
  table.insert(lines, "")

  for bufname, diags in pairs(diagnostics_cache) do
    table.insert(lines, string.format("File: %s", bufname))
    table.insert(lines, string.rep("-", 80))

    -- Sort diagnostics by line number
    table.sort(diags, function(a, b)
      return a.lnum < b.lnum
    end)

    for _, diag in ipairs(diags) do
      local severity_name = vim.diagnostic.severity[diag.severity]:lower()
      total_count[severity_name] = (total_count[severity_name] or 0) + 1

      local line_info = string.format(
        "  Line %d, Col %d: [%s] %s",
        diag.lnum + 1, -- lnum is 0-indexed
        diag.col + 1,
        severity_name:upper(),
        diag.message
      )
      table.insert(lines, line_info)

      -- Include source if available
      if diag.source then
        table.insert(lines, string.format("    Source: %s", diag.source))
      end
      table.insert(lines, "")
    end
    table.insert(lines, "")
  end

  -- Summary
  table.insert(lines, "=== Summary ===")
  table.insert(lines, string.format("Errors:   %d", total_count.error or 0))
  table.insert(lines, string.format("Warnings:  %d", total_count.warn or 0))
  table.insert(lines, string.format("Info:      %d", total_count.info or 0))
  table.insert(lines, string.format("Hints:     %d", total_count.hint or 0))
  table.insert(lines, string.format("Total:     %d", 
    (total_count.error or 0) + 
    (total_count.warn or 0) + 
    (total_count.info or 0) + 
    (total_count.hint or 0)))

  return table.concat(lines, "\n")
end

-- Format a single error for auto-logging
function M.format_single_error(bufname, diag)
  local severity_name = vim.diagnostic.severity[diag.severity]:lower()
  local timestamp = os.date("%Y-%m-%d %H:%M:%S")
  
  local lines = {}
  table.insert(lines, string.format("[%s]", timestamp))
  table.insert(lines, string.format("File: %s", bufname))
  table.insert(lines, string.format("Line %d, Col %d: [%s] %s", 
    diag.lnum + 1, 
    diag.col + 1,
    severity_name:upper(),
    diag.message))
  if diag.source then
    table.insert(lines, string.format("Source: %s", diag.source))
  end
  table.insert(lines, "")
  
  return table.concat(lines, "\n")
end

return M

