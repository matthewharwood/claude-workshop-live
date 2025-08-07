import { tmpdir } from "node:os"
import { join } from "node:path"

type Input = {
  session_id: string
  transcript_path: string
  hook_event_name: string
  stop_hook_active: boolean
}
const input = await Bun.stdin.json() as Input

if (!input) {
  console.error("No input provided")
  process.exit(1)
}


// Write a file to /Users/johnlindquist/dev/claude-agents/payload-<date>.json with the inputJSON

const payloadPath = join(tmpdir(), `payload-${new Date().toISOString()}.json`)
await Bun.write(payloadPath, JSON.stringify(input, null, 2))

// Read the transcript_path file
const transcript = await Bun.file(input.transcript_path).text()
if (!transcript.includes("container-use merge")) {
  process.stdout.write(JSON.stringify({ decision: "block", reason: "Container-use merge not found in transcript. You must run container-use merge with the branch name to fully complete the task." }, null, 2))
  process.exit(0)
}

process.stdout.write(JSON.stringify({ decision: undefined, reason: "Container-use merge found in transcript" }, null, 2))
process.exit(0)
