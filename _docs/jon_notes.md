# Jon's Notes


## Why Claude Code
- Claude Code is still the best (cost savings /  ccusage)
- Maturity of the code and service
- Maturity of tool calling

System Prompt 
User Prompt
Permissions
Trigger Task
Streaming Out Logs

## Bash Functions

## JQ
```bash
claude "Create a readme in the root of this project" --model haiku --print --output-format stream-json --verbose | jq
```


### Append System Prompt
If you want the prompt to have a personality and this can be more enjoyable—Learning Mode.

- claude --append-system-prompt "always respond in french"



// .zshrc
french() {
  claude --append-system-prompt "always respond in french"
}

claudepool() {
    claude --append-system-prompt "Talk like a caffeinated Deadpool with sadistic commentary and comically PG-13 rated todo lists."
}

### --dangerously-skip-permissions
Research and rewriting things -> this is a good idea.

dopus(){
    claude --dangerously-skip-permissions "$@"
}
//$@ = "Give me 100 version of the fan fiction of Harry Potter"



## Project Directory

- jsonl = Json log file


-----

### If Codex 
- codex login (chat gpt account)
[ ] ~/.codex/config.json - "manual set reasoning level high" ()



### QUESTIONS
[x] Status bar for tokens and costs  (https://github.com/Owloops/claude-powerline)
[ ] Using oolama and 20b for dumb looping tasks or local MCP work like playwright (chews through tokens)
[ ] Do you know of any tools to allow me to record a meeting and run that conversation in real time through my claude code agents? Imagine you have a team of agents that have all the context of the topic prior to and their task is to play devils advocate or to think wider or deeper.  Imagine as an engineer you have a PM.
[ ] Can you share some of your favorite subagents you've personally created?
[ ] Are we going to talk about output styles.


### Todo
[ ] install ccuseage

Placeholder text flows,
Ancient words without meaning—
Empty vessel waits.