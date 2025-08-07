#!/usr/bin/env -S npx tsx
import { readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { homedir } from 'os';

interface Message {
  role: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
}

interface JsonLine {
  type: string;
  message?: Message;
  [key: string]: any;
}

async function extractTextFromJsonl(inputPattern: string, outputFile: string): Promise<void> {
  try {
    // Get all .jsonl files matching the pattern
    const jsonlFiles = await glob(inputPattern);
    
    console.log(`Found ${jsonlFiles.length} JSONL files to process`);
    
    const allTexts: string[] = [];
    
    for (const filePath of jsonlFiles) {
      console.log(`Processing ${filePath}...`);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      const fileTexts: string[] = [];
      
      for (const line of lines) {
        try {
          const data: JsonLine = JSON.parse(line);
          
          // Extract text from message content
          if (data.message?.content) {
            for (const item of data.message.content) {
              if (item.type === 'text' && item.text) {
                fileTexts.push(item.text);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to parse line in ${filePath}: ${err}`);
        }
      }
      
      if (fileTexts.length > 0) {
        allTexts.push(`\n\n===== File: ${filePath} =====\n`);
        allTexts.push(...fileTexts.map((text, idx) => `\n--- Message ${idx + 1} ---\n${text}`));
      }
    }
    
    // Write all extracted text to output file
    const outputContent = allTexts.join('\n');
    await writeFile(outputFile, outputContent, 'utf-8');
    
    console.log(`\nExtraction complete!`);
    console.log(`Total files processed: ${jsonlFiles.length}`);
    console.log(`Output written to: ${outputFile}`);
    console.log(`Output size: ${(outputContent.length / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('Error extracting text:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

// Default values
const defaultPattern = join(homedir(), '.claude/projects/**/*.jsonl');
const defaultOutput = 'extracted-claude-texts.txt';

let inputPattern: string;
let outputFile: string;

if (args.length === 0) {
  // Use defaults
  inputPattern = defaultPattern;
  outputFile = defaultOutput;
  console.log(`Using default pattern: ${inputPattern}`);
  console.log(`Using default output: ${outputFile}`);
} else if (args.length === 1) {
  // Only output file provided
  inputPattern = defaultPattern;
  outputFile = args[0]!;
  console.log(`Using default pattern: ${inputPattern}`);
} else {
  // Both provided
  inputPattern = args[0]!;
  outputFile = args[1]!;
}

console.log('\nUsage: ./extract-text-from-jsonl.ts [input-pattern] [output-file]');
console.log(`Default pattern: ${defaultPattern}`);
console.log('Example: ./extract-text-from-jsonl.ts "~/my-jsonl/**/*.jsonl" output.txt\n');

// Run the extraction
extractTextFromJsonl(inputPattern, outputFile)
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });