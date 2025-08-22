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

## Tools
- Repomix
- npm PackX
- (npx count-tokens package.json) https://github.com/johnlindquist/count-tokens
- claude-code-action-ideas
- /install-github-app (code rabbits) -> cron generate poem
- videoprompting.ai
## Hooks
https://github.com/johnlindquist/claude-hooks


## MCP 
Deep wiki www.DeepWiki.com
www.browser-use.com
https://container-use.com/introduction - dockers and pull commits out - like a local version of Codex cloud

## ULTRATHINK



https://www.anthropic.com/engineering/claude-code-best-practices

## Bash Functions
- Jon's Zsh "https://gist.github.com/johnlindquist/15b4ad1c098fa40ca2e925a499b8f99f"

## Custom Agents
```bash
{cat file.md;  echo "prompt"} | claude
````


## JQ
```bash
claude "Create a readme in the root of this project" --model haiku --print --output-format stream-json --verbose | jq
```
### Compiled Bin in ZSH
./designer bin

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
[ ] Could we talk more about the Claude Explore again. 
[ ] Gemini LM Studio MCP?
[ ] can we u

## Comments
- The best use case I've found for output-styles is making sure I get a really precise output format.
  For me, that’s a whitelabel HTML report. I built a sub-agent to run UX audits across two websites,
  and while the research has always been strong, it struggled to actually follow the branded UI requirements.
  By setting up an HTML Report output-style, it now sticks to my style guide exactly and gives me the branded presentation I want.
- Here is a claude command I've run that is like code rabbit /restart-on-update:
  - You have 30 rules 
  - For every rule do a complete sweep read a document 
  - For every sweep make an update based on the rule if available. 
  - Every time you make an update for a rule restart at the first rule 
  - Your goal is to get to the end of all 30 rules
- Have you played with subagents enough to keep composing them together?
  

### Todo
[ ] install ccuseage
[ ] download single file chrome extension (https://chromewebstore.google.com/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle?hl=en&pli=1)
    - Grab site using signle file chrome ext 
    - Drop html into Gemini 
    - Chrome Node Screenshot
[ ] - https://script-kit.github.io/claude-research/ (build obs docs) quartz (https://quartz.jzhao.xyz/)

Placeholder text flows,
Ancient words without meaning—
Empty vessel waits.