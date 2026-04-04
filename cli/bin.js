#!/usr/bin/env node
/**
 * CLI entry point for npx/global installation
 * Uses tsx for direct TypeScript execution
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "index.ts");

// Run with tsx
const child = spawn("npx", ["tsx", cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
