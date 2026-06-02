#!/usr/bin/env node
/**
 * workspaceOpen hook — fires when Cursor opens this workspace.
 * Runs WorkspaceDetector and writes .auto-gdd.json if not already present.
 * Returns pluginPaths (empty here — reserved for future plugin support).
 */
import fs from 'node:fs';
import path from 'node:path';

const input = JSON.parse(await readStdin());
const workspaceRoot = input.workspace_roots?.[0] ?? process.cwd();

const configFile = path.join(workspaceRoot, '.auto-gdd.json');

// Only auto-detect if config doesn't already have an engine
let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
} catch { /* no config yet */ }

if (!existing.engine || existing.engine === 'unknown') {
  const detected = detectEngine(workspaceRoot);
  if (detected) {
    fs.writeFileSync(configFile, JSON.stringify({ ...existing, engine: detected }, null, 2));
  }
}

process.stdout.write(JSON.stringify({ pluginPaths: [] }) + '\n');

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectEngine(root) {
  if (fs.existsSync(path.join(root, 'project.godot'))) return 'godot';
  if (fs.existsSync(path.join(root, 'Assets')) && fs.existsSync(path.join(root, 'ProjectSettings'))) return 'unity';
  if (findExt(root, '.uproject')) return 'unreal';
  if (findExt(root, '.yyp') || findExt(root, '.gmx')) return 'gamemaker';
  const pkg = readPkg(root);
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.phaser) return 'phaser';
    if (deps.three) return 'threejs';
    if (deps.kaboom || deps.kaplay) return 'kaboom';
    if (deps['pixi.js']) return 'pixi';
  }
  if (hasCargoBevy(root)) return 'bevy';
  return null;
}

function readPkg(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')); } catch { return null; }
}

function findExt(root, ext) {
  try { return fs.readdirSync(root).some(f => f.endsWith(ext)); } catch { return false; }
}

function hasCargoBevy(root) {
  try {
    const cargo = fs.readFileSync(path.join(root, 'Cargo.toml'), 'utf-8');
    return cargo.includes('bevy');
  } catch { return false; }
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}
