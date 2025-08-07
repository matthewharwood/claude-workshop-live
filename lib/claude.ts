/**
 * Wrapper for spawning Claude CLI commands
 * 
 */

/*
with_gemini(){
  local __gemini_api_key
  __gemini_api_key=$(op item get "GEMINI_API_KEY_FREE" --fields credential --reveal | tr -d '\n')

  if [[ -z $__gemini_api_key ]]; then
    echo "with_gemini: 1Password returned nothing 🤷‍♂️" >&2
    return 1
  fi

  GEMINI_API_KEY="$__gemini_api_key" "$@"
}*/

/*
zsh alias:
vid(){
  with_gemini /Users/johnlindquist/dev/claude-agents/bin/claude-video "$@"
}
*/
import { homedir } from "node:os";
import { join, normalize } from "node:path";
import { $ } from "bun";
import { getPositionals, buildClaudeFlags } from "./flags"
import type { ClaudeFlags } from "./claude-flags.types"

/**
 * Get the Claude projects path for the current working directory
 * @returns The path to the Claude project directory for the current pwd
 */
export async function getClaudeProjectsPath(): Promise<string> {
  const pwd = process.platform === 'win32'
    ? await $`cd`.quiet().text()
    : await $`pwd`.quiet().text();

  // Normalize the path first, then replace separators and dots
  const normalizedPwd = normalize(pwd.trim());
  const dasherizedPwd = normalizedPwd.replace(/[/\\.]/g, "-");

  const projectPath = join(
    homedir(),
    ".claude",
    "projects",
    dasherizedPwd,
  );

  return projectPath;
}

/**
 * Spawn Claude with given default flags and wait for completion
 * Automatically includes positionals from command line and merges with user flags
 * @param defaultFlags - Default flags object (see ClaudeFlags for available options)
 * @returns Exit code from the Claude process
 */
export async function claude(prompt: string = "", defaultFlags: ClaudeFlags = {}) {
  // Build flags, merging defaults with user-provided flags
  const flags = buildClaudeFlags(defaultFlags)

  const proc = Bun.spawn(['claude', ...flags, prompt], {
    stdio: ['inherit', 'inherit', 'inherit']
  })

  return await proc.exited
}