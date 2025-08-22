This guide provides a comprehensive framework for determining when to create a new slash command, when to create a new subagent, and when to utilize a hook within the Claude Code environment. Understanding the distinct roles of these features is crucial for optimizing and extending your development workflow.

### Understanding the Components

Before deciding which tool to use, it's essential to understand what each component is designed for:

#### Slash Commands

*   **What they are:** User-initiated shortcuts for predefined prompts or workflows, stored as Markdown files.
*   **Key characteristics:** Triggered manually by the user (e.g., `/test`); operate within the current conversation context; ideal for repetitive, specific tasks.

#### Subagents

*   **What they are:** Specialized AI assistants with their own system prompts, tool permissions, and independent context windows.
*   **Key characteristics:** Handle specialized domains or complex tasks; maintain context isolation; can be invoked manually (e.g., `@debugger`) or delegated to automatically.

#### Hooks

*   **What they are:** Event-driven shell commands that execute automatically at specific points in the Claude Code lifecycle (e.g., `PreToolUse`, `PostToolUse`).
*   **Key characteristics:** Automatic and deterministic; ensure actions always happen regardless of the AI's decisions; used for automation, integration, and enforcement of standards.

---

### The Decision Framework

When deciding how to implement new functionality in Claude Code, follow this decision path:

1.  **Does the action need to run automatically and deterministically in response to an event?**
    *(e.g., Automatically format code after a file is written, or block a command before it executes.)*
    *   **Yes:** Use a **Hook**.
    *   **No:** Proceed to 2.

2.  **Does the task require specialized expertise, a complex multi-step process, or a separate context window?**
    *(e.g., A dedicated debugging session, a detailed code review by a specialized persona, or a task requiring restricted tool access.)*
    *   **Yes:** Use a **Subagent**.
    *   **No:** Proceed to 3.

3.  **Is the action a frequently used prompt or a standardized workflow that the user initiates directly?**
    *(e.g., Running the test suite, scaffolding a new component, or generating a standardized commit message.)*
    *   **Yes:** Use a **Slash Command**.
    *   **No:** A direct prompt to the main agent may suffice.

---

### Detailed Guidelines and Examples

#### When to Create a New Slash Command

Use slash commands to streamline repetitive tasks and provide shortcuts for standardized prompts.

**Decision Checklist:**

*   [ ] Is this action initiated explicitly by the user?
*   [ ] Are you automating a prompt you type frequently?
*   [ ] Is the task relatively straightforward and self-contained?
*   [ ] Is it acceptable for this task to run within the main conversation context?

**Guidelines and Examples:**

*   **Repetitive Prompts:** If you frequently ask Claude to explain the selected code, create `/explain`.
*   **Standardized Workflows:** To ensure consistent testing procedures, create a `/test` command that executes your project's test suite instructions.
*   **Dynamic Input:** Use the `$ARGUMENTS` variable to create flexible commands, such as `/refactor <instructions>` to provide specific refactoring guidance.
*   **Scaffolding:** Create `/new-component <name>` to generate boilerplate code following project standards.

#### When to Create a New Subagent

Use subagents for tasks that require specialization, complexity management, or context isolation.

**Decision Checklist:**

*   [ ] Does the task require a specialized persona, knowledge, or system prompt?
*   [ ] Is the workflow complex, involving multiple steps and significant context?
*   [ ] Is it important to keep the details of this task separate from the main conversation?
*   [ ] Do you need to restrict tool access specifically for this task (Principle of Least Privilege)?

**Guidelines and Examples:**

*   **Specialized Expertise:** Create `@SecurityAnalyst` with a system prompt focused on identifying vulnerabilities and enforcing security best practices.
*   **Complex Workflows:** Use `@Debugger` to handle the iterative process of analyzing stack traces, running tests, proposing fixes, and verifying the solution.
*   **Context Isolation:** Delegate feature planning to `@Planner`. This keeps the high-level planning discussion separate from the main agent's implementation work.
*   **Restricted Permissions:** Create a `@DBAdmin` subagent that is the only agent permitted to execute commands that modify the database schema.

#### When to Create a New Hook

Use hooks when you need to guarantee that an action occurs automatically during a specific event in the Claude Code lifecycle.

**Decision Checklist:**

*   [ ] Should the action happen automatically without direct user invocation?
*   [ ] Are you enforcing a deterministic rule, standard, or security policy?
*   [ ] Is the action triggered by a specific event (e.g., before/after a tool is used, when a prompt is submitted)?
*   [ ] Are you integrating with an external system (logging, notifications, CI/CD)?

**Guidelines and Examples:**

*   **Enforcing Standards (PostToolUse):** Automatically run a code formatter (like `prettier` or `black`) every time Claude finishes writing to a file.
*   **Security Guardrails (PreToolUse):** Block Claude from executing dangerous commands (e.g., `rm -rf`) or modifying sensitive files (e.g., `.env` or `package-lock.json`).
*   **Context Injection (UserPromptSubmit):** Automatically append relevant project information or constraints to every user prompt before it is processed by the LLM.
*   **System Integration (Stop/Notification):** Send a desktop notification or a Slack message when a long-running task completes or requires user input.

---

### Summary Comparison

| Feature | Slash Command | Subagent | Hook |
| :--- | :--- | :--- | :--- |
| **Primary Purpose** | Shortcuts for predefined prompts | Specialized expertise and complex tasks | Deterministic, event-driven automation |
| **Trigger** | Manual (User-initiated via `/`) | Delegated (by Claude) or Manual (User-invoked via `@`) | Automatic (Triggered by lifecycle events) |
| **Context Handling** | Shares the main conversation context | Operates in an independent context window | Runs outside the LLM context (shell command) |
| **Execution** | Executes a predefined prompt | Engages in a focused session | Executes a shell command |
| **Best Use Cases** | Repetitive tasks, standardization, simple workflows | Specialization, context isolation, complex problem solving, permission control | Enforcing rules, auto-formatting, security guardrails, integrations |
| **Configuration Location** | `.claude/commands/*.md` | `.claude/agents/*.md` | `.claude/settings.json` |