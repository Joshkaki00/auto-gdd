import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceScanner } from './WorkspaceScanner.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-gdd-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function write(rel: string, content = ''): void {
  const full = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

describe('WorkspaceScanner – deny lists', () => {
  it('ignores binary file extensions', () => {
    write('icon.png');
    write('sound.mp3');
    write('model.fbx');
    write('src/main.ts', 'const x = 1;');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const paths = result.keyFiles.map(f => f.relativePath);

    expect(paths.some(p => p.endsWith('.png'))).toBe(false);
    expect(paths.some(p => p.endsWith('.mp3'))).toBe(false);
    expect(paths.some(p => p.endsWith('.fbx'))).toBe(false);
    expect(paths.some(p => p.endsWith('main.ts'))).toBe(true);
  });

  it('ignores .env and credential files', () => {
    write('.env', 'SECRET=abc');
    write('.env.production', 'DB_PASS=xyz');
    write('secrets.key', '-----BEGIN PRIVATE KEY-----');
    write('src/index.ts', 'export {}');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const paths = result.keyFiles.map(f => f.relativePath);

    expect(paths.some(p => p === '.env')).toBe(false);
    expect(paths.some(p => p.includes('secrets.key'))).toBe(false);
  });

  it('ignores denied directories', () => {
    write('node_modules/lodash/index.js', 'module.exports = {}');
    write('dist/bundle.js', 'console.log(1)');
    write('.git/config', '[core]');
    write('src/game.ts', 'export class Game {}');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const paths = result.keyFiles.map(f => f.relativePath);

    expect(paths.every(p => !p.includes('node_modules'))).toBe(true);
    expect(paths.every(p => !p.includes('dist/'))).toBe(true);
    expect(paths.every(p => !p.startsWith('.git'))).toBe(true);
    expect(paths.some(p => p.endsWith('game.ts'))).toBe(true);
  });
});

describe('WorkspaceScanner – language detection', () => {
  it('counts TypeScript files correctly', () => {
    write('src/player.ts', 'export class Player {}');
    write('src/enemy.ts', 'export class Enemy {}');
    write('src/utils.ts', 'export function clamp(n: number) { return n; }');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();

    expect(result.languageBreakdown.TypeScript).toBe(3);
    expect(result.totalSourceFilesFound).toBeGreaterThanOrEqual(3);
  });

  it('detects multiple languages in a mixed project', () => {
    write('server.py', 'print("hello")');
    write('main.rs', 'fn main() {}');
    write('game.gd', 'extends Node');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();

    expect(result.languageBreakdown.Python).toBe(1);
    expect(result.languageBreakdown.Rust).toBe(1);
    expect(result.languageBreakdown.GDScript).toBe(1);
  });
});

describe('WorkspaceScanner – scan result', () => {
  it('returns ignoredCount > 0 when binary files are present', () => {
    write('texture.png');
    write('src/main.ts', 'const x = 1;');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    expect(result.ignoredCount).toBeGreaterThan(0);
  });

  it('returns empty result for a directory with no source files', () => {
    write('README.md', '# Hello');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    expect(result.totalSourceFilesFound).toBe(0);
    expect(result.keyFiles).toHaveLength(0);
  });

  it('respects .auto-gdd-ignore entries', () => {
    write('src/secret-logic.ts', 'export const secret = true;');
    write('src/public.ts', 'export const pub = true;');
    write('.auto-gdd-ignore', 'src/secret-logic.ts');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const paths = result.keyFiles.map(f => f.relativePath);

    expect(paths.some(p => p.includes('secret-logic'))).toBe(false);
    expect(paths.some(p => p.includes('public.ts'))).toBe(true);
  });
});

describe('WorkspaceScanner – buildTree', () => {
  it('produces non-empty tree output', () => {
    write('src/main.ts', 'export {}');
    write('src/utils/helpers.ts', 'export {}');

    const scanner = new WorkspaceScanner(tmpDir, 'unknown');
    const tree = scanner.buildTree(3);

    expect(tree).toContain('src');
    expect(tree.length).toBeGreaterThan(0);
  });
});

describe('WorkspaceScanner – toContextString', () => {
  it('contains the language summary section', () => {
    write('src/game.ts', 'export class Game {}\n'.repeat(5));

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const ctx = WorkspaceScanner.toContextString(result);

    expect(ctx).toContain('## Codebase snapshot');
    expect(ctx).toContain('TypeScript');
  });

  it('includes file preview for key files', () => {
    const content = 'export class Player {\n  health = 100;\n  move() {}\n}';
    write('src/Player.ts', content);

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const ctx = WorkspaceScanner.toContextString(result);

    expect(ctx).toContain('Player.ts');
    expect(ctx).toContain('export class Player');
  });

  it('includes a read-only safety disclaimer', () => {
    write('src/index.ts', 'export {}');

    const result = new WorkspaceScanner(tmpDir, 'unknown').scan();
    const ctx = WorkspaceScanner.toContextString(result);

    expect(ctx).toContain('secrets');
    expect(ctx).toContain('binaries');
  });
});
