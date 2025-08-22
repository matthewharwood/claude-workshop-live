#!/bin/bash
# Extract text messages from user, assistant, and system
# Usage: claude "prompt" --output-format stream-json | ./messages.jq

# Process line by line for real-time streaming
while IFS= read -r line; do
  # Remove "data: " prefix and extract text from deltas
  echo "$line" | sed 's/^data: //' | jq -r '
    if .type == "content_block_delta" and .delta.text then
      .delta.text
    else
      empty
    end
  ' 2>/dev/null | tr -d '\n'
done
echo  # Final newline