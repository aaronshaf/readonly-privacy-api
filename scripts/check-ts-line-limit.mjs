#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const MAX_LINES = 600;

function listTrackedTsFiles() {
  const output = execSync("git ls-files '*.ts' '*.tsx'", { encoding: "utf8" }).trim();
  if (!output) {
    return [];
  }
  return output.split("\n").filter(Boolean);
}

function countLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  if (content.length === 0) {
    return 0;
  }
  const splitCount = content.split(/\r?\n/).length;
  return content.endsWith("\n") ? splitCount - 1 : splitCount;
}

function isTsPath(filePath) {
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

const cliFiles = process.argv.slice(2).filter(isTsPath);
const files = cliFiles.length > 0 ? cliFiles : listTrackedTsFiles();

const violations = [];
for (const file of files) {
  const normalized = path.resolve(process.cwd(), file);
  if (!existsSync(normalized)) {
    continue;
  }
  const lineCount = countLines(normalized);
  if (lineCount > MAX_LINES) {
    violations.push({ file, lineCount });
  }
}

if (violations.length > 0) {
  console.error(`Found TypeScript files over ${MAX_LINES} lines:`);
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.lineCount} lines`);
  }
  process.exit(1);
}

console.log(`TypeScript line limit check passed (${MAX_LINES} max).`);
