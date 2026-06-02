#!/usr/bin/env node
/**
 * sessionStart hook — fires at the start of every Cursor agent session.
 * Injects .auto-gdd.json project context so the agent always knows
 * the game name, engine, genre, and platform without being told.
 */
import fs from 'node:fs';
import path from 'node:path';

const input = JSON.parse(await readStdin());
const workspaceRoot = input.workspace_roots?.[0] ?? process.cwd();

const configFile = path.join(workspaceRoot, '.auto-gdd.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
} catch { /* no config — skip injection */ }

const output = {};

if (config.gameName || config.engine) {
  const lines = ['## Active Game Project (auto-gdd)'];
  if (config.gameName) lines.push(`- **Game:** ${config.gameName}`);
  if (config.genre)    lines.push(`- **Genre:** ${config.genre}`);
  if (config.platform) lines.push(`- **Platform:** ${config.platform}`);
  if (config.engine && config.engine !== 'unknown') {
    lines.push(`- **Engine:** ${engineDisplayName(config.engine)}`);
  }
  if (config.outputPath) lines.push(`- **GDD output:** ${config.outputPath}`);
  lines.push('');
  lines.push('When helping with game design, use this project context automatically.');
  lines.push('Run `auto-gdd generate` to create or regenerate the GDD.');

  output.additional_context = lines.join('\n');
}

process.stdout.write(JSON.stringify(output) + '\n');

// ── Helpers ──────────────────────────────────────────────────────────────────

function engineDisplayName(id) {
  const names = {
    godot: 'Godot 4', unreal: 'Unreal Engine 5', unity: 'Unity 6',
    phaser: 'Phaser 4', threejs: 'Three.js', gamemaker: 'GameMaker',
    bevy: 'Bevy', kaboom: 'Kaboom.js', pixi: 'PixiJS',
    construct: 'Construct 3', cocos: 'Cocos Creator', custom: 'Custom Engine',
  };
  return names[id] ?? id;
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
