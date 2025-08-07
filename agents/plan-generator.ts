import { claude } from "../lib/claude";
import { getPositionals } from "../lib/flags";
import systemPrompt from "../prompts/plan-generator.md" with { type: "text" };

// Get positionals and check for user prompt
const positionals = getPositionals();
const userPrompt = positionals[0];

if (!userPrompt) {
	console.error("Please provide a user prompt");
	process.exit(1);
}

// Configure allowed tools and default flags
const allowedTools = [
	"Task",
	"Bash",
	"Glob",
	"Grep",
	"LS",
	"ExitPlanMode",
	"Read",
	"Edit",
	"MultiEdit",
	"Write",
	"NotebookRead",
	"NotebookEdit",
	"WebFetch",
	"TodoWrite",
	"WebSearch",
];



const defaultFlags = {
	allowedTools: allowedTools.join(","),
	customSystemPrompt: systemPrompt,
	"dangerously-skip-permissions": true,
};

const prompt = `
<user_prompt>
${userPrompt}
</user_prompt>
`

// Run Claude with default flags
await claude(prompt, defaultFlags);
