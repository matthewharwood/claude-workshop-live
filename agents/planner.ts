/**
 * PLANNER: Launch Claude Code in planning mode
 *
 * Loads planning-focused settings and MCP servers that are read-only and research-oriented.
 *
 * Run:
 *   bun run agents/planner.ts            # interactive
 *   bun run agents/planner.ts -p "..."   # print mode
 */

import { spawn } from "bun";

function resolvePath(relativeFromThisFile: string): string {
    const url = new URL(relativeFromThisFile, import.meta.url);
    return url.pathname;
}

const projectRoot = resolvePath("../");
const settingsPath = resolvePath("../settings/planner.settings.json");
const mcpPath = resolvePath("../settings/planner.mcp.json");

const args = [
    "--settings",
    settingsPath,
    "--mcp-config",
    mcpPath,
    ...process.argv.slice(2),
];

const child = spawn(["claude", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: projectRoot,
    },
});

const onExit = () => {
    try {
        child.kill("SIGTERM");
    } catch { }
};

process.on("SIGINT", onExit);
process.on("SIGTERM", onExit);

await child.exited;
process.exit(child.exitCode ?? 0);



