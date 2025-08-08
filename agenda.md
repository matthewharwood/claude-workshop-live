### Claude Code Power User Workshop

**Focus:** This structure builds from the ground up. It ensures attendees understand the core mechanics (CLI, JSONL, Permissions) before moving into scripting, integrations (MCPs), and finally, advanced automation (Hooks, Agents).

**Target Audience:** Ideal for a mixed-level audience or those who prefer a logical, step-by-step progression.

#### Schedule & Speaker Notes (~6 Hours)

**(0:00 - 0:15) Welcome & The Power User Mindset**

*   **Logistics:** Otter/Zoom setup, break schedule.
*   **The "Why":** Claude Code as an automation engine, not just an IDE assistant.
*   *Speaker Notes:* Start strong. Show your usage stats (the $4200 example) immediately to emphasize the value of the subscription and the scale we are operating at. Introduce the philosophy: "Aggressive iteration—try it, let it fail, then learn," enabled by unlimited usage.

**(0:15 - 1:00) Session 1: The Claude Code Mechanism**

*   **Topics:** The CLI Interface (`print` vs. Interactive); Understanding the JSONL stream; Permissions Deep Dive (`settings.local.json`, `accept-edits`, `dangerously-skip`); Models & `ultra-think`.
*   *Speaker Notes:* Emphasize the mental model: "Claude Code consumes prompts and streams JSONL." Demonstrate this with `--output-format stream-json --verbose`. This understanding is crucial for Hooks later.

**(1:00 - 1:15) Break 1**

**(1:15 - 2:00) Session 2: Personalized Workflow & Scripting**

*   **Topics:** Essential Aliases; System Prompts; Introduction to Scripting with Bun/TypeScript; Building One-Shot Tools.
*   *Speaker Notes:* Focus on reducing friction. Showcase `dopus` and `popus` (clipboard integration). Live-code the "Poem Generator" tool: import a prompt, wrap it in Bun, and compile it into an executable.

**(2:00 - 2:45) Session 3: Expanding Capabilities: MCPs Part 1 (Context)**

*   **Topics:** What is MCP? The "Big Three" for Context: DeepWiki, GitHub (GHX), and RepoMix.
*   *Speaker Notes:* Stress that *better context always wins over better thinking*. Heavily emphasize DeepWiki ("If I only had one tool..."). Use GHX to find examples of two libraries interacting (e.g., ShadCN and animation).

**(2:45 - 3:30) Lunch Break**

**(3:30 - 4:15) Session 4: Interacting with the World: MCPs Part 2 (Action)**

*   **Topics:** Browser Automation (Playwright MCP); Sandboxed Execution (ContainerUse MCP).
*   *Speaker Notes:* High-impact demos. Show the "V0/Canvas" automation with Playwright. Demonstrate a refactor using `c use` (ContainerUse), emphasizing the safety and automatic micro-commits.

**(4:15 - 4:30) Break 2**

**(4:30 - 5:15) Session 5: Agents, Commands, and Hooks**

*   **Topics:** The "Rule of Threes" strategy; Sub-agents (Parallel work); Custom `/commands` vs. `@agents`; The Hook System (using the `claude-hooks` library).
*   *Speaker Notes:* Demo the "Rule of Threes": Spin up 3 sub-agents with different perspectives (Security, PM, Performance) to write a README. Show the "Simon Says" hook (Decision Block) and acknowledge the current limitations of Hooks (per-project vs. per-session).

**(5:15 - 6:00) Session 6: The Future Workflow & Capstone**

*   **Topics:** Multimodality: Video input (The "Secret Sauce"); Orchestration (N8N).
*   *Speaker Notes:* The climax. Demo the `vid` alias workflow (Record UI -> Gemini analysis -> Claude execution). Show the N8N security audit email workflow. End by emphasizing Claude Code as a 24/7 automation engine.

---

#### Notes: Verification vs. Trust

- **Principle**: Default to verification. Trust is earned after repeatable, automated checks pass.
- **Logs-first verification** (fastest feedback):
  - Ask the agent to instrument its own changes: add structured logs (JSON lines) with stable keys.
  - Prefer file-based logs under `logs/` (e.g., `logs/agent-demo.log`) or stdout with a clear prefix (e.g., `[VERIFY]`).
  - Example voice prompt: "Add info-level logs at start/end of function and on error paths, with fields: `module`, `action`, `status`, `elapsedMs`."
- **Tests** (deeper assurance):
  - Unit tests for pure logic; integration tests for boundaries (DB, HTTP, filesystem); smoke tests for "does it basically run?".
  - Ask the agent to author tests alongside code, then run them.
  - Favor a minimal smoke test first (fast pass/fail signal), then expand.
- **Runtime guards**:
  - Feature flags or env toggles to confine impact during verification.
  - Dry-run modes that log intended actions without executing.
- **Demo plan (logs-aware agent)**:
  1) Have the agent create `logs/verify-demo.log` and add instrumentation to a small script.
  2) Start a tail in a terminal: `tail -f logs/verify-demo.log`.
  3) Ask Claude Code to run the script and watch for specific log events (it knows the schema it wrote).
  4) Iterate until expected `[VERIFY]` events appear; then request a quick smoke test to assert those events occur.
  5) Optional: promote to an integration test that asserts side-effects (e.g., file written, HTTP 200).
  - *Speaker Notes:* Emphasize that the agent both defines the log schema and observes it during execution, closing the loop from intent → action → evidence.
