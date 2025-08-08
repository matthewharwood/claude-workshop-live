/**
 * DESIGNER: Launch Claude with a design partner system prompt appended
 *
 * - Imports the markdown prompt so it is bundled at compile time
 * - Passes it via --append-system-prompt
 *
 * Usage:
 *   bun run agents/designer.ts "<your design task>"
 */

import { spawn } from "bun";
import type { ClaudeFlags } from "../lib/claude-flags.types";
import { buildClaudeFlags, getPositionals, parsedArgs } from "../lib/flags";
import designerSystemPrompt from "../system-prompts/desiger-prompt.md" with {
    type: "text",
};

function resolvePath(relativeFromThisFile: string): string {
    const url = new URL(relativeFromThisFile, import.meta.url);
    return url.pathname;
}

const projectRoot = resolvePath("../");

async function main() {
    const positionals = getPositionals();
    const userPrompt = positionals.join(" ").trim();

    // Merge user-provided flags with our default append-system-prompt
    const flags = buildClaudeFlags(
        { "append-system-prompt": designerSystemPrompt },
        parsedArgs.values as ClaudeFlags,
    );
    const args = userPrompt ? [...flags, userPrompt] : [...flags];

    const child = spawn(["claude", ...args], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        env: {
            ...process.env,
            CLAUDE_PROJECT_DIR: projectRoot,
        },
    });

    await child.exited;
    process.exit(child.exitCode ?? 0);
}

await main();
