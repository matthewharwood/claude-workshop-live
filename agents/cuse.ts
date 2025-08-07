import { $ } from "bun";
import { asyncExitHook, gracefulExit } from "exit-hook";
import { claude } from "../lib/claude";
import { setupHooks } from "../lib/hooks";
import systemPrompt from "../prompts/cc.md" with { type: "text" };

// Define hooks for this agent
const hooks = {
	UserPromptSubmit: [
		{
			matcher: "",
			hooks: [
				{
					type: "command",
					command:
						'echo "Remember to always use the mcp__container-use__environment tools!"',
				},
			],
		},
	],
	Stop: [
		{
			matcher: "",
			hooks: [
				{
					type: "command",
					command:
						"bun run /Users/johnlindquist/dev/claude-agents/hooks/cc-stop.ts",
				},
			],
		},
	],
};

// Setup hooks and install container-use MCP
await setupHooks(hooks);
await $`claude mcp add container-use -- container-use stdio || echo "container-use already installed"`.quiet();

// Configure allowed tools and default flags
const allowedTools = [
	"mcp__container-use__environment_checkpoint",
	"mcp__container-use__environment_create",
	"mcp__container-use__environment_add_service",
	"mcp__container-use__environment_file_delete",
	"mcp__container-use__environment_file_list",
	"mcp__container-use__environment_file_read",
	"mcp__container-use__environment_file_write",
	"mcp__container-use__environment_open",
	"mcp__container-use__environment_run_cmd",
	"mcp__container-use__environment_update",
	"mcp__deepwiki__ask_question",
];

const defaultFlags = {
	"append-system-prompt": systemPrompt,
	allowedTools: allowedTools.join(","),
	"dangerously-skip-permissions": true,
};

// Run Claude with default flags

let isCleaningUp = false;

const removeContainerUse = async () => {
	if (isCleaningUp) {
		console.log("Cleanup already in progress or completed");
		return;
	}
	isCleaningUp = true;

	console.log("Starting cleanup...");

	// Remove the container-use MCP
	await $`claude mcp remove container-use`.quiet();

	// Remove hooks if they were added
	const settingsPath = ".claude/settings.local.json";
	const exists = await Bun.file(settingsPath).exists();

	if (exists) {
		const settingsJSON = await Bun.file(settingsPath).json();
		if (settingsJSON?.hooks) {
			// Remove the specific hooks added by this agent
			delete settingsJSON.hooks.UserPromptSubmit;
			delete settingsJSON.hooks.Stop;

			// If no hooks remain, remove the hooks object entirely
			if (Object.keys(settingsJSON.hooks).length === 0) {
				delete settingsJSON.hooks;
			}

			await Bun.write(settingsPath, JSON.stringify(settingsJSON, null, 2));
		}
	}

	console.log("Cleanup completed");
};

// Setup exit hook for cleanup on process termination
asyncExitHook(
	async (signal) => {
		console.log(`\nProcess exiting with signal ${signal}, cleaning up...`);
		await removeContainerUse();
	},
	{
		wait: 1000, // Give up to 1 second for cleanup
	},
);

await claude("", defaultFlags).catch(async (error) => {
	console.error("Claude encountered an error:", error.message);
	gracefulExit(1); // Exit with error code 1
});

gracefulExit(0); // Normal exit with code 0
