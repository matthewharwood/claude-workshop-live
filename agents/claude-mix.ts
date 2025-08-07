import { parseArgs } from "node:util";
import { query } from "@anthropic-ai/claude-code";
import systemPrompt from "../prompts/claude-mix.md" with { type: "text" };

const args = parseArgs({
	allowPositionals: true,
});

const userPrompt = args.positionals[0];

if (!userPrompt) {
	console.error("Usage: bun run agents/prompt-improver.ts <prompt>");
	process.exit(1);
}

const response = query({
	prompt: userPrompt,
	options: {
		customSystemPrompt: systemPrompt,
		mcpServers: {},

		allowedTools: ["Bash(repomix:*)"],
		pathToClaudeCodeExecutable: "/Users/johnlindquist/.npm-global/bin/claude",
	},
});

for await (const chunk of response) {
	if (chunk.type === "assistant" && chunk.message.content[0]?.type === "text") {
		process.stdout.write(chunk.message.content[0].text);
		// improvedPrompt += chunk.message.content[0].text
	} else {
		process.stderr.write(JSON.stringify(chunk, null, 2));
	}
}
