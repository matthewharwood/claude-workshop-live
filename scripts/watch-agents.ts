#!/usr/bin/env bun

import { $ } from "bun";
import { watch } from "fs";
import { join, basename } from "path";
import { readdir, unlink } from "fs/promises";

const agentsDir = join(process.cwd(), "agents");
const promptsDir = join(process.cwd(), "prompts");
const binDir = join(process.cwd(), "bin");

console.log(`Watching ${agentsDir} and ${promptsDir} for changes...`);
console.log("Will rebuild ALL agents on any change in these directories");

// Track existing agent files
let knownAgents = new Set<string>();

// Function to get current agent files
async function getCurrentAgents(): Promise<Set<string>> {
  try {
    const agents = await readdir(agentsDir);
    return new Set(agents.filter(file => file.endsWith(".ts")));
  } catch (error) {
    console.error("Failed to read agents directory:", error);
    return new Set();
  }
}

// Function to compile all agents and handle deletions
async function compileAllAgents() {
  console.log("Rebuilding all agents...");

  try {
    const currentAgents = await getCurrentAgents();
    
    // Check for deleted agents
    for (const knownAgent of knownAgents) {
      if (!currentAgents.has(knownAgent)) {
        // Agent was deleted, remove corresponding bin file
        const agentName = basename(knownAgent, ".ts");
        const binPath = join(binDir, agentName);
        
        try {
          await unlink(binPath);
          console.log(`  ✓ Removed ${agentName} from bin directory`);
        } catch (error) {
          // File might already be gone or never existed
          console.log(`  ℹ Could not remove ${agentName} from bin directory:`, error.message);
        }
      }
    }
    
    // Update known agents
    knownAgents = currentAgents;

    if (currentAgents.size === 0) {
      console.log("No TypeScript files found in agents directory");
      return;
    }

    console.log(`Found ${currentAgents.size} agent(s) to compile`);

    // Compile all agents
    for (const file of currentAgents) {
      const agentName = basename(file, ".ts");
      const filePath = join(agentsDir, file);
      const outputPath = `./bin/${agentName}`;

      console.log(`  Compiling ${agentName}...`);

      try {
        await $`bun build --compile ${filePath} --outfile ${outputPath}`;
        console.log(`  ✓ Compiled ${agentName}`);
      } catch (error) {
        console.error(`  ✗ Failed to compile ${agentName}:`, error);
      }
    }

    console.log("All agents rebuilt!");
  } catch (error) {
    console.error("Failed to rebuild agents:", error);
  }
}

// Debounce function to prevent multiple rapid rebuilds
let rebuildTimeout: NodeJS.Timeout | null = null;
function debouncedRebuild(dir: string, filename?: string) {
  console.log(`Change detected in ${dir}: ${filename || 'unknown'}`);
  
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }

  rebuildTimeout = setTimeout(() => {
    compileAllAgents();
  }, 100); // Wait 100ms after last change
}

// Create watchers
const agentsWatcher = watch(agentsDir, { recursive: true }, (event, filename) => {
  if (filename && filename.endsWith('.ts')) {
    debouncedRebuild('agents', filename);
  }
});

const promptsWatcher = watch(promptsDir, { recursive: true }, (event, filename) => {
  if (filename && filename.endsWith('.md')) {
    debouncedRebuild('prompts', filename);
  }
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nStopping watchers...");
  agentsWatcher.close();
  promptsWatcher.close();
  process.exit(0);
});

// Initialize known agents before first build
knownAgents = await getCurrentAgents();

// Do an initial build
console.log("Performing initial build...");
await compileAllAgents();

// Keep the process running
console.log("\nWatching for changes... Press Ctrl+C to stop.");