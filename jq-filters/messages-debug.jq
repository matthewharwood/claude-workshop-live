#!/bin/bash
# Debug version to see what's coming through
# Usage: claude "prompt" --output-format stream-json | ./messages-debug.jq

echo "=== Starting to process stream ===" >&2
count=0
while IFS= read -r line; do
  count=$((count + 1))
  echo "Line $count: $line" >&2
  
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
echo "=== Processed $count lines ===" >&2