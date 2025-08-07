### Project settings for Claude Code (hooks + MCP) via --settings

This repo includes a CLI entrypoint that launches Claude Code with a project-scoped settings file and MCP config, replicating what `agents/cuse.ts` enforced programmatically.

#### Files

- `settings/cuse-settings.json`: Hooks and permission defaults
- `settings/cuse-mcp.json`: MCP server configuration
- `bin/claude-cuse`: Convenience script that runs Claude Code with `--settings` and `--mcp-config`

#### Usage

Make the script executable once:

```bash
chmod +x ./bin/claude-cuse
```

Run Claude Code with the settings and MCP config applied:

```bash
./bin/claude-cuse
```

You can pass normal CLI args through to Claude, for example print mode:

```bash
./bin/claude-cuse -p "Explain this project"
```

#### What this config does

- Hooks replicate `agents/cuse.ts` behavior using official settings:
  - `UserPromptSubmit`: echoes a reminder to prefer container-use tools
  - `Stop`: runs `hooks/cc-stop.ts` from this project using `$CLAUDE_PROJECT_DIR`
- MCP servers: adds the `container-use` stdio server locally via `settings/cuse-mcp.json`
- Allowed tools and bypass permissions are applied via the launcher script flags

#### Editing hooks

Use the docs’ hook structure to add more events or matchers inside `settings/cuse-settings.json`. See Anthropic docs for details:

- Settings: [Claude Code settings](https://docs.anthropic.com/en/docs/claude-code/settings)
- Hooks reference: [Hooks - Anthropic](https://docs.anthropic.com/en/docs/claude-code/hooks)

#### Notes and references

- The `--settings` flag accepts a path or JSON string and merges with other settings per precedence. We pass a file here as recommended by the docs help output.
- MCP configuration can also be given via `--mcp-config` JSON or file.

Additional reading and examples related to MCP and hooks:

- GitHub issue context: [Expose hooks configuration through the CLI and SDK #4459](https://github.com/anthropics/claude-code/issues/4459)
- Claude Code MCP server/connect docs and examples: [Claude Code MCP Server](https://playbooks.com/mcp/claude-code), [Kunihiro’s Claude Code MCP](https://playbooks.com/mcp/kunihiros-claude-code)
- Blog and guides on MCP config via JSON: [Adding MCP Servers in Claude Code](https://mehmetbaykar.com/posts/adding-mcp-servers-in-claude-code/)


