# Example Hooks Configuration

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -I {} sh -c 'if [ -f {} ] && [[ {} =~ \\.py$ ]]; then black {} && ruff check --fix {}; fi'",
            "description": "Auto-format Python files after editing"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -I {} sh -c 'if [[ {} =~ \\.(js|ts|jsx|tsx)$ ]]; then prettier --write {}; fi'",
            "description": "Format JavaScript/TypeScript files with Prettier"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r 'if (.tool_input.file_path // .tool_input.path) | test(\"(\\.env|\\.pem|credentials|secrets|private|password)\") then {\"permissionDecision\": \"deny\", \"permissionDecisionReason\": \"Access to sensitive files blocked\"} else {\"permissionDecision\": \"allow\"} end'",
            "description": "Block access to sensitive files"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r 'if .tool_input.command | test(\"(rm -rf|:(){:|dd if=)\") then {\"permissionDecision\": \"deny\", \"permissionDecisionReason\": \"Dangerous command blocked\"} else {\"permissionDecision\": \"allow\"} end'",
            "description": "Block dangerous bash commands"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Processing user request...'",
            "description": "Notification when user submits prompt"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "if [ -f package.json ]; then npm run test:ci --if-present; fi",
            "description": "Run tests after Claude finishes",
            "timeout": 120000
          }
        ]
      }
    ]
  }
}
```