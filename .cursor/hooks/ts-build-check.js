#!/usr/bin/env node
/**
 * postToolUse hook — fires after every Write tool call.
 * If the written file is a .ts file, runs the relevant package build
 * and returns any errors as additional_context so the agent sees them immediately.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const input = JSON.parse(await readStdin());

const filePath = findTsPath(input);
if (!filePath) {
  process.stdout.write('{}\n');
  process.exit(0);
}

const workspaceRoot = input.workspace_roots?.[0] ?? process.cwd();
const pkg = getPackage(filePath);
const buildCmd = pkg
  ? `npm run build --workspace=packages/${pkg}`
  : 'npm run build';

try {
  execSync(buildCmd, { cwd: workspaceRoot, timeout: 90_000, stdio: 'pipe' });
  process.stdout.write(
    JSON.stringify({ additional_context: `✓ Build clean after editing ${path.basename(filePath)}` }) + '\n',
  );
} catch (err) {
  const out = [err.stdout?.toString() ?? '', err.stderr?.toString() ?? ''].join('\n');
  const lines = out.split('\n').filter(l => l.includes('error')).slice(0, 12).join('\n');
  process.stdout.write(
    JSON.stringify({
      additional_context: `⚠️ Build errors after editing ${path.basename(filePath)} — fix before proceeding:\n\`\`\`\n${lines || out.slice(-600)}\n\`\`\``,
    }) + '\n',
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function findTsPath(obj) {
  // Cursor sends the Write input; common field names for the written path:
  const candidates = [
    obj?.tool_input?.path,
    obj?.path,
    obj?.file_path,
    obj?.filename,
  ];
  return candidates.find(p => typeof p === 'string' && p.endsWith('.ts')) ?? null;
}

function getPackage(filePath) {
  const m = filePath.replace(/\\/g, '/').match(/packages\/([^/]+)\//);
  return m?.[1] ?? null;
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data || '{}'));
    process.stdin.on('error', reject);
  });
}
