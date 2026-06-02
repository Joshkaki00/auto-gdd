import fs from 'node:fs';
import path from 'node:path';
import { EngineId } from '../config/types.js';

export interface DetectionResult {
  engine: EngineId;
  engineVersion?: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

interface SignatureRule {
  engine: EngineId;
  test: (root: string, pkg: Record<string, unknown> | null, cargo: Record<string, unknown> | null) => string | null;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function hasFile(root: string, ...parts: string[]): boolean {
  return fs.existsSync(path.join(root, ...parts));
}

function globFirst(root: string, ext: string): string | null {
  try {
    const entries = fs.readdirSync(root);
    const found = entries.find(e => e.endsWith(ext));
    return found ? path.join(root, found) : null;
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown> | null, name: string): boolean {
  if (!pkg) return false;
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  return name in deps;
}

function hasCargoDep(cargo: Record<string, unknown> | null, name: string): boolean {
  if (!cargo) return false;
  const deps = cargo.dependencies as Record<string, unknown> | undefined;
  if (!deps) return false;
  return name in deps || Object.keys(deps).some(k => k === name);
}

const RULES: SignatureRule[] = [
  {
    engine: 'godot',
    test: (root) => {
      if (hasFile(root, 'project.godot')) return 'Found project.godot';
      return null;
    },
  },
  {
    engine: 'unreal',
    test: (root) => {
      const match = globFirst(root, '.uproject');
      if (match) return `Found ${path.basename(match)}`;
      return null;
    },
  },
  {
    engine: 'unity',
    test: (root) => {
      if (hasFile(root, 'Assets') && hasFile(root, 'ProjectSettings')) {
        return 'Found Assets/ and ProjectSettings/ directories';
      }
      return null;
    },
  },
  {
    engine: 'phaser',
    test: (root, pkg) => {
      if (hasDep(pkg, 'phaser')) return 'Found phaser in package.json dependencies';
      return null;
    },
  },
  {
    engine: 'threejs',
    test: (root, pkg) => {
      if (hasDep(pkg, 'three')) return 'Found three in package.json dependencies';
      return null;
    },
  },
  {
    engine: 'kaboom',
    test: (root, pkg) => {
      if (hasDep(pkg, 'kaboom') || hasDep(pkg, 'kaplay')) {
        return 'Found kaboom/kaplay in package.json dependencies';
      }
      return null;
    },
  },
  {
    engine: 'pixi',
    test: (root, pkg) => {
      if (hasDep(pkg, 'pixi.js')) return 'Found pixi.js in package.json dependencies';
      return null;
    },
  },
  {
    engine: 'cocos',
    test: (root) => {
      if (hasFile(root, 'assets') && hasFile(root, 'project.json')) {
        return 'Found assets/ and project.json (Cocos Creator)';
      }
      return null;
    },
  },
  {
    engine: 'construct',
    test: (root) => {
      if (globFirst(root, '.c3p')) return 'Found .c3p project file';
      return null;
    },
  },
  {
    engine: 'gamemaker',
    test: (root) => {
      if (globFirst(root, '.yyp')) return 'Found .yyp project file (GameMaker)';
      if (globFirst(root, '.gmx')) return 'Found .gmx project file (GameMaker)';
      return null;
    },
  },
  {
    engine: 'bevy',
    test: (root, _pkg, cargo) => {
      if (hasCargoDep(cargo, 'bevy')) return 'Found bevy in Cargo.toml dependencies';
      return null;
    },
  },
];

export class WorkspaceDetector {
  private root: string;

  constructor(root: string = process.cwd()) {
    this.root = root;
  }

  detect(): DetectionResult {
    const pkgFile = path.join(this.root, 'package.json');
    const cargoFile = path.join(this.root, 'Cargo.toml');

    const pkg = readJson(pkgFile);
    const cargo = this.readToml(cargoFile);

    const evidence: string[] = [];
    let detected: EngineId = 'unknown';

    for (const rule of RULES) {
      const result = rule.test(this.root, pkg, cargo);
      if (result) {
        detected = rule.engine;
        evidence.push(result);
        break;
      }
    }

    return {
      engine: detected,
      confidence: evidence.length > 0 ? 'high' : 'low',
      evidence,
    };
  }

  private readToml(file: string): Record<string, unknown> | null {
    try {
      if (!fs.existsSync(file)) return null;
      const content = fs.readFileSync(file, 'utf-8');
      // Minimal TOML parser: extract [dependencies] section keys
      const deps: Record<string, string> = {};
      let inDeps = false;
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
          inDeps = trimmed === '[dependencies]';
          continue;
        }
        if (inDeps && trimmed.includes('=')) {
          const key = trimmed.split('=')[0].trim();
          deps[key] = '';
        }
      }
      return { dependencies: deps };
    } catch {
      return null;
    }
  }
}
