#!/usr/bin/env jq -f

# Claude stream-json output formatter
# Usage: claude "prompt" --print --output-format stream-json | jq -R -r -f claude-stream-formatter.jq

# Parse each line as JSON and format based on type
fromjson? |
if .type == "system" then
  if .subtype == "init" then
    "\u001b[90m━━━ Session Init ━━━\u001b[0m",
    "\u001b[36m📁 Directory:\u001b[0m \(.cwd)",
    "\u001b[36m🆔 Session:\u001b[0m \(.session_id)",
    "\u001b[36m🤖 Model:\u001b[0m \(.model)",
    "\u001b[36m🔧 Tools:\u001b[0m \(.tools | length) available",
    "\u001b[36m🔌 MCP Servers:\u001b[0m \(.mcp_servers | map(.name + " (" + .status + ")") | join(", "))",
    "\u001b[90m━━━━━━━━━━━━━━━━━━━\u001b[0m\n"
  else
    .
  end
elif .type == "assistant" then
  if .message.content then
    "\u001b[32m🤖 Claude:\u001b[0m",
    (.message.content | map(
      if .type == "text" then
        .text
      elif .type == "tool_use" then
        "\u001b[33m🔧 Using tool:\u001b[0m \(.name)"
      else
        .
      end
    ) | join("\n")),
    ""
  else
    .
  end
elif .type == "result" then
  "\u001b[90m━━━ Session Summary ━━━\u001b[0m",
  if .is_error then
    "\u001b[31m❌ Error:\u001b[0m \(.result)"
  else
    "\u001b[32m✅ Success\u001b[0m"
  end,
  "\u001b[36m⏱️  Duration:\u001b[0m \(.duration_ms)ms (API: \(.duration_api_ms)ms)",
  "\u001b[36m💬 Turns:\u001b[0m \(.num_turns)",
  "\u001b[36m💰 Cost:\u001b[0m $\(.total_cost_usd | tostring | .[0:8])",
  "\u001b[36m📊 Tokens:\u001b[0m In: \(.usage.input_tokens + .usage.cache_creation_input_tokens + .usage.cache_read_input_tokens), Out: \(.usage.output_tokens)",
  "\u001b[90m━━━━━━━━━━━━━━━━━━━━━\u001b[0m"
elif .type == "tool_use" then
  "\u001b[33m🔧 Tool:\u001b[0m \(.name)",
  if .input then
    "\u001b[90m   Input:\u001b[0m \(.input | tostring | .[0:100])..."
  else
    ""
  end
elif .type == "tool_result" then
  "\u001b[35m📤 Tool Result:\u001b[0m",
  if .content then
    (.content | tostring | split("\n") | map("   " + .) | join("\n"))
  else
    "   (empty)"
  end
elif .type == "error" then
  "\u001b[31m❌ Error:\u001b[0m \(.message // .error // .)"
else
  # Fallback for unknown types - show raw JSON in dim color
  "\u001b[90m[Unknown type: \(.type)]\u001b[0m",
  (. | tostring)
end