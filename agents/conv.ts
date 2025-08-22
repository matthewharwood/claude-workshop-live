#!/usr/bin/env -S bun run
/**
 * conv.ts — Conversation utilities for mapped JSONL projects
 *
 * Subcommands:
 *   conv latest [options]     # Find newest .jsonl for the mapped project
 *   conv search <query> ...   # Search messages across .jsonl files
 *
 * Examples:
 *   bun run agents/conv.ts latest --json
 *   bun run agents/conv.ts search "hello world" --role user --limit 5
 */

import { readdirSync, statSync, readFileSync, existsSync, realpathSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname, basename } from "node:path";
import React from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { execSync } from "node:child_process";
import os from "node:os";

// Shared helpers
function projectsRoot(): string { return join(os.homedir(), ".claude", "projects"); }
function norm(p: string): string { let out = p.replace(/\\/g, "/"); if (out.endsWith("/")) out = out.slice(0, -1); return out; }
function normalizeAbs(p: string): string { try { return norm(realpathSync(p)); } catch { return norm(p); } }
function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
function candidateStartPaths(cwd?: string): string[] {
  const arr: string[] = [];
  if (cwd) arr.push(cwd);
  if (process.env.PWD) arr.push(process.env.PWD);
  arr.push(process.cwd());
  const more = arr.map(p => { try { return realpathSync(p); } catch { return p; } });
  return unique([...arr, ...more]).map(norm);
}
function dashedFromAbs(abs: string): string { const cleaned = abs.replace(/^\/+/, "").replace(/\/$/, ""); return cleaned.split("/").join("-"); }
function mappedNames(abs: string): string[] { const d = dashedFromAbs(abs); return ["~" + d, d]; }
function findMappedDirFrom(startAbs: string, debug = false): string | null {
  const root = projectsRoot();
  if (debug) console.error(`→ Searching from: ${startAbs}`);
  let cur = startAbs;
  for (;;) {
    for (const name of mappedNames(cur)) {
      const candidate = join(root, name);
      if (existsSync(candidate)) {
        try {
          const st = statSync(candidate);
          if (st.isDirectory() && candidate !== root) {
            if (debug) console.error(`  ✓ Found mapped dir: ${candidate}`);
            return candidate;
          }
        } catch {}
      } else if (debug) {
        console.error(`  ✗ Missing: ${candidate}`);
      }
    }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // Fallback: best suffix match
  try {
    const dirs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory());
    const target = dashedFromAbs(startAbs);
    let best: { path: string; score: number } | null = null;
    for (const d of dirs) {
      const name = d.name.startsWith("~") ? d.name.slice(1) : d.name;
      const a = name, b = target; let i = 0;
      while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
      const score = i;
      if (score > 0 && (!best || score > best.score)) best = { path: join(root, d.name), score };
    }
    if (best) {
      if (debug) console.error(`  ~ Fallback chose: ${best.path} (suffix score ${best.score})`);
      return best.path;
    }
  } catch {}
  return null;
}

// latest implementation
type LatestOptions = { print: boolean; json: boolean; cwd?: string; debug: boolean; help: boolean };
function parseLatestArgs(argv: string[]): LatestOptions {
  const opts: LatestOptions = { print: false, json: false, cwd: undefined, debug: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-p" || a === "--print") opts.print = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--cwd") { if (i + 1 >= argv.length) { console.error("Error: --cwd requires a path"); process.exit(64); } opts.cwd = argv[++i]; }
    else if (a === "--stdin") opts.stdin = true;
    else if (a === "--stdout") opts.stdout = true;
    else if (a === "--concat") opts.concat = true;
    else if (a === "--roles") { const v = argv[++i]; if (!v) { console.error("Error: --roles requires a value"); process.exit(64);} const parts=v.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean); opts.roles = new Set(parts);}
    else if (a === "--debug") opts.debug = true;
    else if (a === "-h" || a === "--help") opts.help = true;
  }
  return opts;
}
function findLatestJsonl(dir: string): { path: string; mtimeMs: number } | null {
  let latestPath: string | null = null; let latestTime = -Infinity;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
    const p = join(dir, e.name);
    try { const st = statSync(p); if (st.isFile() && st.mtimeMs > latestTime) { latestTime = st.mtimeMs; latestPath = p; } } catch {}
  }
  return latestPath ? { path: latestPath, mtimeMs: latestTime } : null;
}
function latestHelp() {
  console.log(`conv latest — find newest .jsonl for mapped project\n\n` +
    `Usage:\n  conv latest [options]\n\nOptions:\n  -p, --print     Print file contents\n      --json      Print { path, size, mtime }\n      --cwd <d>   Start from this directory\n      --debug     Show mapping details\n  -h, --help      Show help\n`);
}

// search implementation
type SearchOptions = { roles: Set<string>; json: boolean; cwd?: string; debug: boolean; help: boolean; limit: number; pathsOnly: boolean; select: boolean; live: boolean };
function parseSearchArgs(argv: string[]): { opts: SearchOptions; query: string | null } {
  const opts: SearchOptions = { roles: new Set(["user", "assistant"]), json: false, cwd: undefined, debug: false, help: false, limit: 1000, pathsOnly: false, select: false, live: false };
  let query: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) { query = query === null ? a : query + " " + a; continue; }
    if (a === "-r" || a === "--role") {
      const v = argv[++i]; if (!v) { console.error("Error: --role requires a value"); process.exit(64); }
      const parts = v.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      opts.roles = parts.includes("any") ? new Set(["user", "assistant", "system"]) : new Set(parts);
    } else if (a === "--json") opts.json = true;
    else if (a === "--cwd") { const v = argv[++i]; if (!v) { console.error("Error: --cwd requires a path"); process.exit(64); } opts.cwd = v; }
    else if (a === "--limit") { const v = argv[++i]; if (!v) { console.error("Error: --limit requires a number"); process.exit(64); } const n = Number(v); if (!Number.isFinite(n) || n <= 0) { console.error("Error: --limit must be positive"); process.exit(64); } opts.limit = Math.floor(n); }
    else if (a === "--paths-only" || a === "--files-only") opts.pathsOnly = true;
    else if (a === "--select") opts.select = true;
    else if (a === "--live") opts.live = true;
    else if (a === "--debug") opts.debug = true;
    else if (a === "-h" || a === "--help") opts.help = true;
  }
  return { opts, query };
}
function listJsonlFiles(dir: string): string[] { return readdirSync(dir).filter(f => f.endsWith(".jsonl")).map(f => join(dir, f)); }
function extractRoleAndText(obj: any): { role: string | null; text: string; timestamp?: string } {
  const topType: string | undefined = obj?.type;
  const role: string | null = (obj?.message?.role as string) ?? (typeof topType === "string" ? topType : null);
  const parts: string[] = [];
  function push(v: any) {
    if (v == null) return;
    if (typeof v === "string") { parts.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) push(x); return; }
    if (typeof v === "object") {
      if (typeof v.text === "string") parts.push(v.text);
      if (typeof v.content === "string") parts.push(v.content);
      if (Array.isArray(v.content)) push(v.content);
      for (const k of ["summary", "title", "message", "body"]) { if (typeof (v as any)[k] === "string") parts.push((v as any)[k]); }
      return;
    }
  }
  if (obj?.message?.content !== undefined) push(obj.message.content);
  if (typeof obj?.summary === "string") parts.push(obj.summary);
  const text = parts.join("\n");
  const timestamp = obj?.timestamp;
  return { role, text, timestamp };
}
function searchHelp() {
  console.log(`conv search — search messages across .jsonl files\n\n` +
    `Usage:\n  conv search <query> [options]\n  conv search --live [options]   # query optional in live mode\n\nOptions:\n  -r, --role <roles>  Roles: user,assistant,system,any (default: user,assistant)\n      --json          Emit JSON results\n      --paths-only    Print only file paths with matches (unique), for piping into export\n      --select        Interactive selection of files to export (implies unique paths)\n      --live          Live interactive search UI (Ink): type to filter, up/down to select, Enter to export\n      --cwd <dir>     Start from this directory\n      --limit <n>     Max results to print (default 1000)\n      --debug         Show mapping and scan details\n  -h, --help          Show help\n`);
}

function showTopHelp() {
  console.log(`conv — conversation utilities for mapped Claude projects\n\nUsage:\n  conv <subcommand> [args]\n\nSubcommands:\n  latest   Find newest .jsonl (print path, contents, or JSON)\n  search   Search messages across .jsonl files\n  export   Export newest .jsonl to a human-readable transcript (txt/md)\n\nExamples:\n  conv latest --json\n  conv search "hello world" --role user --limit 5\n  conv export --md --output transcript.md\n`);
}

function runLatest(argv: string[]) {
  const opts = parseLatestArgs(argv);
  if (opts.help) { latestHelp(); return; }
  const starts = candidateStartPaths(opts.cwd);
  if (opts.debug) {
    console.error(`PWD: ${process.env.PWD ?? "(unset)"}`);
    console.error(`process.cwd(): ${process.cwd()}`);
    console.error("Start candidates:");
    for (const s of starts) console.error(`  - ${s}`);
  }
  let mappedDir: string | null = null;
  for (const s of starts) { mappedDir = findMappedDirFrom(s, opts.debug); if (mappedDir) break; }
  if (!mappedDir) {
    console.error(`No mapped directory found for:\n  ${starts[0]}\nunder:\n  ${projectsRoot()}\n(try: --debug to see attempted candidates)`);
    process.exit(1);
  }
  const latest = findLatestJsonl(mappedDir);
  if (!latest) { console.error(`No .jsonl files found in:\n  ${mappedDir}`); process.exit(2); }
  if (opts.json) { const st = statSync(latest.path); console.log(JSON.stringify({ path: latest.path, size: st.size, mtime: new Date(latest.mtimeMs).toISOString() })); return; }
  if (opts.print) { process.stdout.write(readFileSync(latest.path, "utf8")); return; }
  console.log(latest.path);
}

function runSearch(argv: string[]) {
  const { opts, query } = parseSearchArgs(argv);
  if (opts.help) { searchHelp(); return; }
  // In live mode, allow empty query and start interactive UI
  if (opts.live) { runSearchLive(opts, query ?? ""); return; }
  if (!query) { searchHelp(); return; }
  const starts = candidateStartPaths(opts.cwd);
  if (opts.debug) {
    console.error(`PWD: ${process.env.PWD ?? "(unset)"}`);
    console.error(`process.cwd(): ${process.cwd()}`);
    console.error("Start candidates:");
    for (const s of starts) console.error(`  - ${s}`);
  }
  let mappedDir: string | null = null;
  for (const s of starts) { mappedDir = findMappedDirFrom(s, opts.debug); if (mappedDir) break; }
  if (!mappedDir) { console.error(`No mapped directory found under ${projectsRoot()} for ${starts[0]}`); process.exit(1); }
  const files = readdirSync(mappedDir).filter(f => f.endsWith(".jsonl")).map(f => join(mappedDir, f));
  if (!files.length) { console.error(`No .jsonl files in ${mappedDir}`); process.exit(2); }

  const q = query.toLowerCase();
  let printed = 0; const resultsJson: any[] = [];
  const matchCounts = new Map<string, number>();
  const matchedFilesSet = new Set<string>();
  for (const file of files) {
    const data = readFileSync(file, "utf8");
    const lines = data.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]; if (!line.trim()) continue;
      let obj: any; try { obj = JSON.parse(line); } catch { continue; }
      const { role, text, timestamp } = extractRoleAndText(obj);
      const roleNorm = (role ?? "").toLowerCase();
      if (opts.roles.size && roleNorm && !opts.roles.has(roleNorm)) continue;
      if (!text || !text.toLowerCase().includes(q)) continue;
      matchedFilesSet.add(file);
      matchCounts.set(file, (matchCounts.get(file) ?? 0) + 1);
      if (opts.json) resultsJson.push({ file, line: i + 1, role: roleNorm || null, timestamp, text });
      else if (!opts.pathsOnly && !opts.select) {
        const ts = timestamp ? ` [${timestamp}]` : "";
        const who = roleNorm || "unknown";
        const snippet = text.length > 300 ? text.slice(0, 297) + "..." : text;
        console.log(`${basename(file)}:${i + 1}:${who}${ts}: ${snippet}`);
      }
      printed++; if (printed >= opts.limit) break;
    }
    if (printed >= opts.limit) break;
  }
  if (opts.json) { console.log(JSON.stringify(resultsJson, null, 2)); return; }
  if (opts.pathsOnly) { for (const p of Array.from(matchedFilesSet)) console.log(p); return; }
  if (opts.select) {
    const uniqueFiles = Array.from(matchedFilesSet);
    if (uniqueFiles.length === 0) { console.error("No matches to select"); return; }
    console.log("Select file(s) to export (comma-separated indices):\n");
    uniqueFiles.forEach((p, idx) => {
      const count = matchCounts.get(p) ?? 0;
      console.log(`${idx + 1}. ${basename(p)}  (${count} matches)\n   ${p}`);
    });
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Enter selection: ", (answer) => {
      rl.close();
      const indices = answer.split(/[ ,]+/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n >= 1 && n <= uniqueFiles.length);
      if (indices.length === 0) { console.error("No valid selection"); return; }
      for (const idx of indices) {
        const file = uniqueFiles[idx - 1];
        runExport(["--file", file]);
      }
    });
    return;
  }
}

// Live interactive search using Ink
type CachedFile = { path: string; title: string | null; lines: string[] };
function getAllJsonlFiles(mappedDir: string): string[] { return readdirSync(mappedDir).filter(f => f.endsWith(".jsonl")).map(f => join(mappedDir, f)); }

function buildCache(files: string[]): CachedFile[] {
  return files.map(p => {
    const data = readFileSync(p, "utf8");
    const msgs: TranscriptMessage[] = [];
    for (const line of data.split(/\r?\n/)) {
      const t = line.trim(); if (!t) continue; try {
        const obj = JSON.parse(t);
        const { role, text } = extractRoleAndText(obj);
        msgs.push({ role: (role||"unknown").toLowerCase(), text: text||"" });
      } catch {}
    }
    const title = deriveTitleFromMessages(msgs);
    const lines = data.split(/\r?\n/);
    return { path: p, title, lines };
  });
}

function firstMatchSnippet(lines: string[], q: string): string | null {
  const lq = q.toLowerCase();
  for (let i=0;i<lines.length;i++){
    const s = lines[i];
    if (!s) continue;
    try { const obj = JSON.parse(s); const { text } = extractRoleAndText(obj); if (text && text.toLowerCase().includes(lq)) {
      const one = text.replace(/\s+/g,' ').trim();
      return one.length>140?one.slice(0,137)+'...':one;
    } } catch {}
  }
  return null;
}

function countMatches(lines: string[], q: string, roles?: Set<string>): number {
  const lq = q.toLowerCase(); let c=0;
  for (const s of lines){ if (!s) continue; try { const obj=JSON.parse(s); const { role, text }=extractRoleAndText(obj); const rn=(role||'').toLowerCase(); if (roles && roles.size && rn && !roles.has(rn)) continue; if (text && text.toLowerCase().includes(lq)) c++; } catch {} }
  return c;
}

function runSearchLive(opts: SearchOptions, initialQuery: string) {
  const starts = candidateStartPaths(opts.cwd);
  let mappedDir: string | null = null;
  for (const s of starts){ mappedDir = findMappedDirFrom(s, opts.debug); if (mappedDir) break; }
  if (!mappedDir){ console.error(`No mapped directory found under ${projectsRoot()} for ${starts[0]}`); process.exit(1); }
  const filePaths = getAllJsonlFiles(mappedDir);
  const cache = buildCache(filePaths);

  function combinedTranscriptText(files: string[], roles: Set<string> | undefined, markdown: boolean): string {
    const transcripts: { path: string; messages: TranscriptMessage[] }[] = [];
    for (const p of files) {
      let msgs = parseJsonlMessages(p);
      if (roles && roles.size) msgs = msgs.filter(m => !m.role || roles.has(m.role));
      transcripts.push({ path: p, messages: msgs });
    }
    const parts: string[] = [];
    for (const { path, messages } of transcripts) {
      if (transcripts.length > 1) parts.push(markdown ? `\n---\n### File: ${path}\n` : `\n==== File: ${path} ====\n`);
      parts.push(buildTranscriptText(messages, path, markdown));
    }
    return parts.join('\n');
  }

  function copyToClipboard(text: string): boolean {
    try {
      const plat = process.platform;
      if (plat === 'darwin') { execSync('pbcopy', { input: text }); return true; }
      if (plat === 'win32') { execSync('clip', { input: text }); return true; }
      try { execSync('xclip -selection clipboard', { input: text, stdio: ['pipe','ignore','ignore'], shell: true }); return true; } catch {}
      try { execSync('wl-copy', { input: text, stdio: ['pipe','ignore','ignore'], shell: true }); return true; } catch {}
    } catch {}
    return false;
  }

  function App(){
    const { exit } = useApp();
    const [q, setQ] = React.useState(initialQuery);
    const [idx, setIdx] = React.useState(0);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [phase, setPhase] = React.useState<'browse'|'exportOptions'>('browse');
    const exportOptions = [
      { id: 'stdout-md', label: 'Print to stdout (Markdown)' },
      { id: 'stdout-txt', label: 'Print to stdout (Plain Text)' },
      { id: 'file-md', label: 'Write to file (Markdown)' },
      { id: 'file-txt', label: 'Write to file (Plain Text)' },
      { id: 'clipboard-md', label: 'Copy to Clipboard (Markdown)' },
      { id: 'clipboard-txt', label: 'Copy to Clipboard (Plain Text)' },
      { id: 'cancel', label: 'Cancel' },
    ] as const;
    const [optIdx, setOptIdx] = React.useState(0);

    const results = React.useMemo(()=>{
      const r = cache.map(cf=>{
        const count = countMatches(cf.lines, q, opts.roles);
        if (count===0) return null;
        const snippet = firstMatchSnippet(cf.lines, q) || '';
        return { path: cf.path, title: cf.title, count, snippet };
      }).filter(Boolean) as {path:string;title:string|null;count:number;snippet:string}[];
      r.sort((a,b)=> b.count - a.count);
      return r;
    },[q]);

    useInput((input,key)=>{
      if (phase === 'exportOptions') {
        if (key.escape){ setPhase('browse'); return; }
        if (key.upArrow){ setOptIdx(i=> Math.max(0, i-1)); return; }
        if (key.downArrow){ setOptIdx(i=> Math.min(exportOptions.length-1, i+1)); return; }
        if (key.return){
          const files = selected.size? Array.from(selected): (results[idx]? [results[idx].path]:[]);
          if (files.length===0){ setPhase('browse'); return; }
          const sel = exportOptions[optIdx]?.id;
          switch (sel) {
            case 'stdout-md': runExport(["--md","--stdout","--concat", ...files.flatMap(f=>["--file",f])]); exit(); return;
            case 'stdout-txt': runExport(["--stdout","--concat", ...files.flatMap(f=>["--file",f])]); exit(); return;
            case 'file-md': runExport(["--md","--concat", ...files.flatMap(f=>["--file",f])]); exit(); return;
            case 'file-txt': runExport(["--concat", ...files.flatMap(f=>["--file",f])]); exit(); return;
            case 'clipboard-md': { const text = combinedTranscriptText(files, opts.roles, true); copyToClipboard(text); exit(); return; }
            case 'clipboard-txt': { const text = combinedTranscriptText(files, opts.roles, false); copyToClipboard(text); exit(); return; }
            default: setPhase('browse'); return;
          }
        }
        if (key.backspace || key.delete){ setPhase('browse'); setQ(s=> s.slice(0,-1)); return; }
        if (input && input.length===1) { setPhase('browse'); setQ(s=> s+input); return; }
        return;
      }
      if (key.escape){ exit(); return; }
      if (key.return){
        const files = selected.size? Array.from(selected): (results[idx]? [results[idx].path]:[]);
        if (files.length===0){ return; }
        setPhase('exportOptions'); setOptIdx(0); return;
      }
      if (key.upArrow){ setIdx(i=> Math.max(0, i-1)); return; }
      if (key.downArrow){ setIdx(i=> Math.min(results.length-1, i+1)); return; }
      if (input===' '){
        const file = results[idx]?.path; if (!file) return;
        setSelected(prev=>{ const n=new Set(prev); if (n.has(file)) n.delete(file); else n.add(file); return n; });
        return;
      }
      if (key.backspace || key.delete){ setQ(s=> s.slice(0,-1)); return; }
      if (input && input.length===1) setQ(s=> s+input);
    });

    const header = React.createElement(Text, { color: "cyan" }, phase === 'exportOptions'
      ? 'Export options: ↑/↓ select, Enter confirm, Esc back'
      : 'Live search (type to filter, ↑/↓ to navigate, Space to select, Enter to export, Esc to exit)'
    );
    const queryRow = React.createElement(Box, null,
      React.createElement(Text, null, "Query: "),
      React.createElement(Text, { color: "green" }, q)
    );
    let list: any;
    if (phase === 'exportOptions'){
      const items = exportOptions.map((o,i)=> React.createElement(Text, { key: o.id, color: i===optIdx? 'yellow': undefined }, `${i===optIdx?'>':' '} ${o.label}`));
      list = React.createElement(Box, { flexDirection: "column", marginTop: 1 }, ...items);
    } else if (results.length === 0) {
      list = React.createElement(Text, { dimColor: true }, "No matches");
    } else {
      const items = results.slice(0, 20).map((r, i) => {
        const isSel = i === idx; const marked = selected.has(r.path) ? '●' : '○';
        const title = r.title ? ` — ${r.title}` : '';
        return React.createElement(Box, { key: r.path, flexDirection: "column" },
          React.createElement(Text, { color: isSel ? "yellow" : undefined },
            `${isSel ? '>' : ' '} ${marked} ${basename(r.path)} (${r.count} hits)${title}`
          ),
          React.createElement(Text, { dimColor: true }, r.snippet),
          React.createElement(Text, { dimColor: true }, ` ${r.path}`)
        );
      });
      list = React.createElement(Box, { flexDirection: "column", marginTop: 1 }, ...items);
    }
    return React.createElement(Box, { flexDirection: "column" }, header, queryRow, list);
  }

  render(React.createElement(App));
}

// Export newest .jsonl to a readable transcript
type ExportOptions = { cwd?: string; outputPath?: string; markdown: boolean; debug: boolean; help: boolean; filePaths: string[]; stdin: boolean; stdout: boolean; concat: boolean; roles?: Set<string> };

function parseExportArgs(argv: string[]): ExportOptions {
  const opts: ExportOptions = { cwd: undefined, outputPath: undefined, markdown: false, debug: false, help: false, filePaths: [], stdin: false, stdout: false, concat: false, roles: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd") { const v = argv[++i]; if (!v) { console.error("Error: --cwd requires a path"); process.exit(64); } opts.cwd = v; }
    else if (a === "-o" || a === "--output" || a === "--out") { const v = argv[++i]; if (!v) { console.error("Error: --output requires a file path"); process.exit(64); } opts.outputPath = v; }
    else if (a === "--md" || a === "--markdown") opts.markdown = true;
    else if (a === "-f" || a === "--file") { const v = argv[++i]; if (!v) { console.error("Error: --file requires a .jsonl path"); process.exit(64); } opts.filePaths.push(v); }
    else if (a === "--stdin") opts.stdin = true;
    else if (a === "--stdout") opts.stdout = true;
    else if (a === "--concat") opts.concat = true;
    else if (a === "--roles") { const v = argv[++i]; if (!v) { console.error("Error: --roles requires a value"); process.exit(64);} const parts=v.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean); opts.roles = new Set(parts);}
    else if (a === "--debug") opts.debug = true;
    else if (a === "-h" || a === "--help") opts.help = true;
  }
  return opts;
}

function exportHelp() {
  console.log(`conv export — export newest .jsonl to a readable transcript\n\n` +
    `Usage:\n  conv export [options]\n\nOptions:\n      --cwd <dir>     Start from this directory (detect mapped project)\n  -f,  --file <f>     Export this .jsonl file; repeat to export multiple files\n      --stdin         Read newline-separated .jsonl paths from stdin (for piping)\n  -o,  --output <f>   Write transcript to this file (default: per-file auto names; with multiple + --output, writes a single combined transcript)\n      --stdout        Print transcript to stdout instead of writing a file\n      --concat        When multiple inputs, force a single combined transcript (default when --stdout)\n      --roles <list>  Filter roles (e.g. user,assistant,system)\n      --md            Write Markdown instead of plain text\n      --debug         Show mapping details\n  -h,  --help         Show help\n`);
}

function slugifyTitle(title: string): string {
  const lower = title.toLowerCase();
  return lower
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isoDateOnly(d: Date): string { return d.toISOString().slice(0, 10); }

type TranscriptMessage = { role: string; text: string; timestamp?: string };

function seemsCodeBlock(text: string): boolean {
  if (text.includes("```")) return true;
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 3) return false;
  const codey = lines.filter(l => /^(\s*([#>]|\/\/|\/\*|\*|\{|\}|const\b|let\b|var\b|function\b|class\b|if\b|for\b|while\b|return\b|import\b|export\b|def\b|print\b))/.test(l) || /(;|\{|\}|=>|\(\)|\)\s*\{|\bconsole\.log\b)/.test(l));
  return codey.length / lines.length >= 0.4;
}

function buildTranscriptText(messages: TranscriptMessage[], sourceFile: string, asMarkdown: boolean): string {
  const lines: string[] = [];
  const exportedAt = new Date().toISOString();
  if (asMarkdown) {
    lines.push(`# Conversation Export`);
    lines.push("");
    lines.push(`- Source: ${sourceFile}`);
    lines.push(`- Exported: ${exportedAt}`);
    lines.push("");
    for (const m of messages) {
      const headerTime = m.timestamp ? ` (${m.timestamp})` : "";
      lines.push(`## ${m.role}${headerTime}`);
      lines.push("");
      const text = m.text || "";
      if (text.includes("```")) {
        lines.push(text);
      } else if (seemsCodeBlock(text)) {
        lines.push("```");
        lines.push(text);
        lines.push("```");
      } else {
        lines.push(text);
      }
      lines.push("");
    }
  } else {
    lines.push(`Conversation Export\nSource: ${sourceFile}\nExported: ${exportedAt}`);
    lines.push("");
    for (const m of messages) {
      const ts = m.timestamp ? ` [${m.timestamp}]` : "";
      lines.push(`${m.role}${ts}:`);
      lines.push(m.text || "");
      lines.push("");
    }
  }
  return lines.join("\n");
}

function deriveTitleFromMessages(messages: TranscriptMessage[]): string | null {
  const firstUser = messages.find(m => m.role === "user" && m.text.trim().length > 0);
  const candidate = firstUser?.text || messages.find(m => m.text.trim().length > 0)?.text || null;
  if (!candidate) return null;
  let singleLine = candidate.split(/\r?\n/)[0].trim();
  if (singleLine.length > 50) singleLine = singleLine.slice(0, 50) + "...";
  return singleLine;
}

function parseJsonlMessages(jsonlPath: string): TranscriptMessage[] {
  const data = readFileSync(jsonlPath, "utf8");
  const out: TranscriptMessage[] = [];
  for (const line of data.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: any; try { obj = JSON.parse(trimmed); } catch { continue; }
    const { role, text, timestamp } = extractRoleAndText(obj);
    const roleLabel = (role || "unknown").toLowerCase();
    out.push({ role: roleLabel, text: text || "", timestamp });
  }
  return out;
}

function ensureParentDir(filePath: string) {
  const dir = dirname(filePath);
  try { mkdirSync(dir, { recursive: true }); } catch {}
}

function runExport(argv: string[]) {
  const opts = parseExportArgs(argv);
  if (opts.help) { exportHelp(); return; }
  // Collect input files (stdin + repeated --file)
  let inputFiles: string[] = [];
  if (opts.stdin) {
    try {
      const buf = readFileSync(0, 'utf8');
      inputFiles.push(...buf.split(/\r?\n/).map(s=>s.trim()).filter(Boolean));
    } catch {}
  }
  if (opts.filePaths.length) inputFiles.push(...opts.filePaths);
  inputFiles = Array.from(new Set(inputFiles.map(normalizeAbs)));
  if (inputFiles.length === 0) {
    const starts = candidateStartPaths(opts.cwd);
    if (opts.debug) {
      console.error(`PWD: ${process.env.PWD ?? "(unset)"}`);
      console.error(`process.cwd(): ${process.cwd()}`);
      console.error("Start candidates:");
      for (const s of starts) console.error(`  - ${s}`);
    }
    let mappedDir: string | null = null;
    for (const s of starts) { mappedDir = findMappedDirFrom(s, opts.debug); if (mappedDir) break; }
    if (!mappedDir) { console.error(`No mapped directory found under ${projectsRoot()} for ${starts[0]}`); process.exit(1); }
    const latest = findLatestJsonl(mappedDir);
    if (!latest) { console.error(`No .jsonl files found in:\n  ${mappedDir}`); process.exit(2); }
    inputFiles = [latest.path];
  }
  // Validate
  inputFiles = inputFiles.filter(p => {
    const ok = p.endsWith('.jsonl') && existsSync(p);
    if (!ok) console.error(`Skipping invalid/nonexistent file: ${p}`);
    return ok;
  });
  if (inputFiles.length === 0) { console.error('No valid input files'); process.exit(2); }

  // Parse and filter by roles if requested
  const transcripts: { path: string; messages: TranscriptMessage[] }[] = [];
  for (const p of inputFiles) {
    let msgs = parseJsonlMessages(p);
    if (opts.roles && opts.roles.size) msgs = msgs.filter(m => !m.role || opts.roles!.has(m.role));
    transcripts.push({ path: p, messages: msgs });
  }

  const combine = opts.concat || opts.stdout || (!!opts.outputPath && transcripts.length > 1);
  if (combine) {
    const parts: string[] = [];
    for (const { path, messages } of transcripts) {
      if (transcripts.length > 1) {
        parts.push(opts.markdown ? `\n---\n### File: ${path}\n` : `\n==== File: ${path} ====\n`);
      }
      parts.push(buildTranscriptText(messages, path, opts.markdown));
    }
    const outText = parts.join('\n');
    if (opts.stdout) { process.stdout.write(outText); return; }
    let outPath = opts.outputPath;
    if (!outPath) {
      const date = isoDateOnly(new Date());
      outPath = join(process.cwd(), `conversation-${date}.${opts.markdown ? 'md' : 'txt'}`);
    }
    ensureParentDir(outPath);
    writeFileSync(outPath, outText, 'utf8');
    console.log(outPath);
    return;
  }

  // Per-file outputs
  if (opts.stdout) {
    for (const { path, messages } of transcripts) {
      if (transcripts.length > 1) process.stdout.write(opts.markdown ? `\n---\n### File: ${path}\n\n` : `\n==== File: ${path} ====\n\n`);
      process.stdout.write(buildTranscriptText(messages, path, opts.markdown));
      process.stdout.write('\n');
    }
    return;
  }
  for (const { path, messages } of transcripts) {
    let outputPath = opts.outputPath;
    const transcript = buildTranscriptText(messages, path, opts.markdown);
    if (!outputPath) {
      const title = deriveTitleFromMessages(messages);
      const date = isoDateOnly(new Date());
      const slug = title ? slugifyTitle(title) : "";
      const base = slug ? `${date}-${slug}` : `conversation-${date}`;
      // Use ai/conv/ directory for exports
      const outputDir = join(process.cwd(), "ai", "conv");
      ensureParentDir(join(outputDir, "dummy")); // Ensure ai/conv/ exists
      outputPath = join(outputDir, `${base}.${opts.markdown ? "md" : "txt"}`);
    }
    ensureParentDir(outputPath);
    writeFileSync(outputPath, transcript, "utf8");
    console.log(outputPath);
  }
}

function main() {
  const argv = Bun.argv.slice(2);
  const sub = argv[0];
  if (!sub || sub === "-h" || sub === "--help") { showTopHelp(); return; }
  if (sub === "latest") { runLatest(argv.slice(1)); return; }
  if (sub === "search") { runSearch(argv.slice(1)); return; }
  if (sub === "export") { runExport(argv.slice(1)); return; }
  console.error(`Unknown subcommand: ${sub}`);
  showTopHelp();
  process.exit(64);
}

main();
