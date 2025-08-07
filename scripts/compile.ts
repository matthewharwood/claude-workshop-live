#!/usr/bin/env bun
import { $ } from "bun";
import { basename } from "path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: bun c <typescript-file>");
  process.exit(1);
}

const outputName = basename(input, ".ts");
const outputPath = `./bin/${outputName}`;

await $`bun build --compile ${input} --outfile ${outputPath}`;