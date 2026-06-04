import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigStore } from './ConfigStore.js';
import { DEFAULT_GLOBAL_CONFIG } from './types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-gdd-config-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ConfigStore – readWorkspace', () => {
  it('returns empty object when no config file exists', () => {
    const store = new ConfigStore(tmpDir);
    expect(store.readWorkspace()).toEqual({});
  });

  it('reads workspace config from .auto-gdd.json', () => {
    const cfg = { gameName: 'My Game', engine: 'godot' as const, genre: 'RPG' };
    fs.writeFileSync(
      path.join(tmpDir, '.auto-gdd.json'),
      JSON.stringify(cfg),
      'utf-8',
    );

    const store = new ConfigStore(tmpDir);
    expect(store.readWorkspace()).toMatchObject(cfg);
  });

  it('returns empty object when config file is malformed JSON', () => {
    fs.writeFileSync(path.join(tmpDir, '.auto-gdd.json'), 'not json', 'utf-8');
    const store = new ConfigStore(tmpDir);
    expect(store.readWorkspace()).toEqual({});
  });
});

describe('ConfigStore – writeWorkspace', () => {
  it('creates .auto-gdd.json with provided values', () => {
    const store = new ConfigStore(tmpDir);
    store.writeWorkspace({ gameName: 'Test Game', genre: 'Action' });

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.auto-gdd.json'), 'utf-8'),
    );
    expect(written.gameName).toBe('Test Game');
    expect(written.genre).toBe('Action');
  });

  it('merges with existing config on subsequent writes', () => {
    const store = new ConfigStore(tmpDir);
    store.writeWorkspace({ gameName: 'My Game' });
    store.writeWorkspace({ genre: 'Strategy' });

    const ws = store.readWorkspace();
    expect(ws.gameName).toBe('My Game');
    expect(ws.genre).toBe('Strategy');
  });
});

describe('ConfigStore – resolve', () => {
  it('uses DEFAULT_GLOBAL_CONFIG values when no config files exist', () => {
    const store = new ConfigStore(tmpDir);
    const resolved = store.resolve();

    expect(resolved.ollamaUrl).toBe(DEFAULT_GLOBAL_CONFIG.ollamaUrl);
    expect(resolved.model).toBe(DEFAULT_GLOBAL_CONFIG.model);
    expect(resolved.embeddingModel).toBe(DEFAULT_GLOBAL_CONFIG.embeddingModel);
    expect(resolved.workspaceRoot).toBe(tmpDir);
  });

  it('workspace overrides global model', () => {
    const store = new ConfigStore(tmpDir);
    store.writeWorkspace({ model: 'qwen3:1.7b' });

    const resolved = store.resolve();
    expect(resolved.model).toBe('qwen3:1.7b');
  });

  it('sets vectorStorePath relative to workspace when global is empty', () => {
    const store = new ConfigStore(tmpDir);
    const resolved = store.resolve();

    expect(resolved.vectorStorePath).toBe(path.join(tmpDir, '.auto-gdd-vectors'));
  });

  it('workspaceConfigPath returns correct path', () => {
    const store = new ConfigStore(tmpDir);
    expect(store.workspaceConfigPath()).toBe(path.join(tmpDir, '.auto-gdd.json'));
  });
});
