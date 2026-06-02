import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  GlobalConfig,
  WorkspaceConfig,
  ResolvedConfig,
  DEFAULT_GLOBAL_CONFIG,
} from './types.js';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.auto-gdd');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const WORKSPACE_CONFIG_FILE = '.auto-gdd.json';

export class ConfigStore {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  readGlobal(): GlobalConfig {
    try {
      if (!fs.existsSync(GLOBAL_CONFIG_FILE)) return { ...DEFAULT_GLOBAL_CONFIG };
      const raw = fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_GLOBAL_CONFIG };
    }
  }

  writeGlobal(config: Partial<GlobalConfig>): void {
    const current = this.readGlobal();
    const merged = { ...current, ...config };
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  }

  readWorkspace(): WorkspaceConfig {
    const file = path.join(this.workspaceRoot, WORKSPACE_CONFIG_FILE);
    try {
      if (!fs.existsSync(file)) return {};
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as WorkspaceConfig;
    } catch {
      return {};
    }
  }

  writeWorkspace(config: Partial<WorkspaceConfig>): void {
    const file = path.join(this.workspaceRoot, WORKSPACE_CONFIG_FILE);
    const current = this.readWorkspace();
    const merged = { ...current, ...config };
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf-8');
  }

  resolve(): ResolvedConfig {
    const global = this.readGlobal();
    const workspace = this.readWorkspace();

    const vectorStorePath =
      global.vectorStorePath ||
      path.join(this.workspaceRoot, '.auto-gdd-vectors');

    return {
      ...global,
      ...workspace,
      vectorStorePath,
      model: workspace.model ?? global.model,
      workspaceRoot: this.workspaceRoot,
    };
  }

  workspaceConfigPath(): string {
    return path.join(this.workspaceRoot, WORKSPACE_CONFIG_FILE);
  }

  globalConfigDir(): string {
    return GLOBAL_CONFIG_DIR;
  }
}
