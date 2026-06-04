import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceDetector } from './WorkspaceDetector.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-gdd-detector-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function write(rel: string, content = ''): void {
  const full = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

function mkdir(rel: string): void {
  fs.mkdirSync(path.join(tmpDir, rel), { recursive: true });
}

describe('WorkspaceDetector', () => {
  it('detects Godot via project.godot', () => {
    write('project.godot', '[application]\nconfig/name="MyGame"');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('godot');
    expect(result.confidence).toBe('high');
    expect(result.evidence[0]).toContain('project.godot');
  });

  it('detects Unity via Assets + ProjectSettings directories', () => {
    mkdir('Assets');
    mkdir('ProjectSettings');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('unity');
    expect(result.confidence).toBe('high');
  });

  it('detects Phaser via package.json dependency', () => {
    write('package.json', JSON.stringify({
      name: 'my-game',
      dependencies: { phaser: '^3.60.0' },
    }));

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('phaser');
    expect(result.confidence).toBe('high');
  });

  it('detects Three.js via package.json dependency', () => {
    write('package.json', JSON.stringify({
      dependencies: { three: '^0.160.0' },
    }));

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('threejs');
  });

  it('detects Bevy via Cargo.toml dependency', () => {
    write('Cargo.toml', '[package]\nname = "my_game"\n\n[dependencies]\nbevy = "0.13"');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('bevy');
    expect(result.confidence).toBe('high');
  });

  it('detects GameMaker via .yyp file', () => {
    write('MyGame.yyp', '{"resourceType": "GMProject"}');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('gamemaker');
  });

  it('detects Construct via .c3p file', () => {
    write('MyGame.c3p', '');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('construct');
  });

  it('returns unknown with low confidence when no signatures match', () => {
    write('README.md', '# My Project');

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('unknown');
    expect(result.confidence).toBe('low');
    expect(result.evidence).toHaveLength(0);
  });

  it('Godot takes precedence when multiple signatures are present', () => {
    write('project.godot', '');
    write('package.json', JSON.stringify({ dependencies: { phaser: '*' } }));

    const result = new WorkspaceDetector(tmpDir).detect();
    expect(result.engine).toBe('godot');
  });
});
