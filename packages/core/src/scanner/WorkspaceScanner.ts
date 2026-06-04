import fs from 'node:fs';
import path from 'node:path';
import type { EngineId } from '../config/types.js';

// ── Safety deny lists ─────────────────────────────────────────────────────────
// Never read or traverse these. Secrets, binaries, and generated output stay out
// of the LLM context regardless of any user configuration.

const DENY_EXTENSIONS = new Set([
  // Compiled / binary
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a', '.lib', '.wasm', '.out',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp',
  '.tga', '.tiff', '.tif', '.psd', '.hdr', '.exr', '.dds', '.ktx', '.basis',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aiff', '.m4a', '.wma', '.aac', '.opus',
  // Video
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  // 3D assets
  '.blend', '.fbx', '.obj', '.dae', '.gltf', '.glb', '.3ds', '.max', '.ma', '.mb', '.abc',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
  // Credentials / secrets
  '.key', '.pem', '.p12', '.pfx', '.cer', '.crt', '.p8',
  // Compiled (managed languages)
  '.pyc', '.class', '.jar',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
]);

const DENY_DIRS = new Set([
  // Universal
  'node_modules', '.git', 'dist', 'build', 'out', 'target',
  '__pycache__', '.cache', '.gradle', '.idea', '.vscode',
  'vendor',
  // Unity auto-generated
  'Library', 'Temp', 'Packages',
  // Godot auto-generated
  '.godot',
  // Unreal auto-generated
  'Binaries', 'DerivedDataCache', 'Intermediate', 'Saved',
  // Rust
  'debug', 'release',
]);

const DENY_FILENAMES = new Set([
  // Env / secrets
  '.env', '.env.local', '.env.production', '.env.development', '.env.staging', '.env.test',
  // Lock files (content not useful for GDD context)
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'Cargo.lock', 'poetry.lock', 'Pipfile.lock', 'composer.lock', 'go.sum',
  // OS artifacts
  '.DS_Store', 'Thumbs.db',
  // SSH keys
  'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa',
]);

const DENY_FILENAME_PREFIXES = ['credentials', 'secrets'];
const DENY_FILENAME_SUFFIXES = ['.password', '.token', '.secret', '.private'];
const DENY_FILENAME_ENVPATTERN = /^\.env\./;

// ── Language mapping ──────────────────────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  '.gd': 'GDScript',
  '.gdshader': 'Godot Shader',
  '.tscn': 'Godot Scene',
  '.tres': 'Godot Resource',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.cxx': 'C++',
  '.cc': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.rs': 'Rust',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (JSX)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (JSX)',
  '.mts': 'TypeScript (ESM)',
  '.mjs': 'JavaScript (ESM)',
  '.py': 'Python',
  '.gml': 'GML',
  '.lua': 'Lua',
  '.glsl': 'GLSL',
  '.vert': 'GLSL Vertex Shader',
  '.frag': 'GLSL Fragment Shader',
  '.hlsl': 'HLSL',
  '.wgsl': 'WGSL',
  '.shader': 'Shader',
  '.yy': 'GameMaker Resource',
  '.yyp': 'GameMaker Project',
};

// ── Engine source priorities ──────────────────────────────────────────────────

const ENGINE_SOURCE_EXTENSIONS: Partial<Record<EngineId, string[]>> = {
  godot: ['.gd', '.gdshader', '.tscn', '.tres'],
  unity: ['.cs', '.asmdef'],
  unreal: ['.h', '.cpp', '.cs'],
  phaser: ['.ts', '.js', '.mts', '.mjs'],
  threejs: ['.ts', '.js', '.glsl', '.vert', '.frag', '.wgsl'],
  kaboom: ['.ts', '.js'],
  pixi: ['.ts', '.js'],
  bevy: ['.rs'],
  gamemaker: ['.gml', '.yy'],
  cocos: ['.ts', '.js'],
  construct: ['.js', '.ts'],
  unknown: ['.ts', '.js', '.py', '.cs', '.cpp', '.rs', '.gd', '.lua', '.gml'],
};

// ── Public types ──────────────────────────────────────────────────────────────

export interface KeyFile {
  relativePath: string;
  language: string;
  lineCount: number;
  preview: string;
}

export interface ScanResult {
  root: string;
  engine: EngineId;
  fileTree: string;
  languageBreakdown: Record<string, number>;
  keyFiles: KeyFile[];
  totalSourceFilesFound: number;
  ignoredCount: number;
  scannedAt: string;
}

export interface ScanOptions {
  /** Max key source files to preview (default 8) */
  maxKeyFiles?: number;
  /** Max preview lines per file (default 25) */
  maxPreviewLines?: number;
  /** Max directory tree depth (default 4) */
  maxTreeDepth?: number;
}

// ── WorkspaceScanner ──────────────────────────────────────────────────────────

/**
 * Read-only, deterministic codebase scanner.
 *
 * Safety guarantees:
 * - Never reads binary files, images, audio, 3D assets, video, or archives.
 * - Never reads files matching credential/secret patterns (.env, *.key, *.pem…).
 * - Never traverses generated directories (node_modules, dist, .git, Library…).
 * - Respects a project-level `.auto-gdd-ignore` file for additional exclusions.
 * - All operations are local — no network calls, no LLM at scan time.
 *
 * Usage:
 * ```ts
 * const scanner = new WorkspaceScanner('/path/to/project', 'godot');
 * const result = scanner.scan();
 * const ctx = WorkspaceScanner.toContextString(result);
 * ```
 */
export class WorkspaceScanner {
  private readonly root: string;
  private readonly engine: EngineId;
  private customIgnorePatterns: string[] = [];

  constructor(root: string, engine: EngineId = 'unknown') {
    this.root = root;
    this.engine = engine;
    this.loadCustomIgnore();
  }

  // ── Custom ignore ───────────────────────────────────────────────────────────

  private loadCustomIgnore(): void {
    const ignorePath = path.join(this.root, '.auto-gdd-ignore');
    try {
      const lines = fs.readFileSync(ignorePath, 'utf-8').split('\n');
      this.customIgnorePatterns = lines
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
    } catch {
      // File absent — that is fine
    }
  }

  // ── Deny predicates ─────────────────────────────────────────────────────────

  private isDeniedFile(fullPath: string, basename: string): boolean {
    const ext = path.extname(basename).toLowerCase();
    if (DENY_EXTENSIONS.has(ext)) return true;
    if (DENY_FILENAMES.has(basename)) return true;
    if (DENY_FILENAME_ENVPATTERN.test(basename)) return true;
    if (DENY_FILENAME_PREFIXES.some(p => basename.toLowerCase().startsWith(p))) return true;
    if (DENY_FILENAME_SUFFIXES.some(s => basename.toLowerCase().endsWith(s))) return true;
    return this.matchesCustomIgnore(path.relative(this.root, fullPath));
  }

  private isDeniedDir(fullPath: string, dirname: string): boolean {
    if (DENY_DIRS.has(dirname)) return true;
    return this.matchesCustomIgnore(path.relative(this.root, fullPath));
  }

  private matchesCustomIgnore(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, '/');
    return this.customIgnorePatterns.some(pattern => {
      if (pattern.endsWith('/')) {
        return normalized.startsWith(pattern) || normalized.includes(`/${pattern}`);
      }
      return normalized === pattern
        || normalized.startsWith(pattern + '/')
        || normalized.includes('/' + pattern + '/')
        || normalized.endsWith('/' + pattern);
    });
  }

  // ── Scan ────────────────────────────────────────────────────────────────────

  scan(opts: ScanOptions = {}): ScanResult {
    const {
      maxKeyFiles = 8,
      maxPreviewLines = 25,
      maxTreeDepth = 4,
    } = opts;

    const priorityExts = new Set(
      ENGINE_SOURCE_EXTENSIONS[this.engine] ?? ENGINE_SOURCE_EXTENSIONS.unknown ?? [],
    );
    const langCounts: Record<string, number> = {};
    const priorityFiles: { fullPath: string; ext: string; size: number }[] = [];
    let ignoredCount = 0;

    const walk = (dir: string, depth: number): void => {
      if (depth > maxTreeDepth + 1) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (this.isDeniedDir(fullPath, entry.name)) {
            ignoredCount++;
            continue;
          }
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (this.isDeniedFile(fullPath, entry.name)) {
            ignoredCount++;
            continue;
          }
          const ext = path.extname(entry.name).toLowerCase();
          const lang = LANGUAGE_MAP[ext];
          if (lang) {
            langCounts[lang] = (langCounts[lang] ?? 0) + 1;
          }
          if (priorityExts.has(ext)) {
            let size = 0;
            try { size = fs.statSync(fullPath).size; } catch { /* ignore */ }
            priorityFiles.push({ fullPath, ext, size });
          }
        }
      }
    };

    walk(this.root, 0);

    // Sort ascending by file size — smaller files are more likely hand-written scripts,
    // not auto-generated dumps. Cap with maxKeyFiles.
    priorityFiles.sort((a, b) => a.size - b.size);

    const keyFiles: KeyFile[] = [];
    for (const f of priorityFiles.slice(0, maxKeyFiles)) {
      try {
        const raw = fs.readFileSync(f.fullPath, 'utf-8');
        const lines = raw.split('\n');
        keyFiles.push({
          relativePath: path.relative(this.root, f.fullPath).replace(/\\/g, '/'),
          language: LANGUAGE_MAP[f.ext] ?? f.ext,
          lineCount: lines.length,
          preview: lines.slice(0, maxPreviewLines).join('\n'),
        });
      } catch {
        // Unreadable — skip silently
      }
    }

    return {
      root: this.root,
      engine: this.engine,
      fileTree: this.buildTree(maxTreeDepth),
      languageBreakdown: langCounts,
      keyFiles,
      totalSourceFilesFound: priorityFiles.length,
      ignoredCount,
      scannedAt: new Date().toISOString(),
    };
  }

  // ── Tree builder ─────────────────────────────────────────────────────────────

  private buildTree(maxDepth: number): string {
    const lines: string[] = [path.basename(this.root) + '/'];

    const walkForTree = (dir: string, depth: number, prefix: string): void => {
      if (depth >= maxDepth) return;
      if (lines.length > 100) {
        lines.push(`${prefix}... (truncated)`);
        return;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      const allowedDirs = entries
        .filter(e => e.isDirectory() && !this.isDeniedDir(path.join(dir, e.name), e.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      const allowedFiles = entries
        .filter(e => e.isFile() && !this.isDeniedFile(path.join(dir, e.name), e.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      const all = [...allowedDirs, ...allowedFiles];

      for (let i = 0; i < all.length; i++) {
        const item = all[i];
        const isLast = i === all.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');

        if (item.isDirectory()) {
          const dirPath = path.join(dir, item.name);
          let fileCount = 0;
          try {
            fileCount = fs.readdirSync(dirPath).length;
          } catch { /* ignore */ }
          lines.push(`${prefix}${connector}${item.name}/  (${fileCount} items)`);
          walkForTree(dirPath, depth + 1, childPrefix);
        } else {
          lines.push(`${prefix}${connector}${item.name}`);
        }

        if (lines.length > 100) {
          lines.push(`${prefix}  ... (truncated)`);
          return;
        }
      }
    };

    walkForTree(this.root, 0, '');
    return lines.join('\n');
  }

  // ── Context serialiser ────────────────────────────────────────────────────────

  /**
   * Formats a ScanResult as a token-budgeted Markdown block suitable for
   * injection into GDD generation prompts.
   *
   * Only call this after a successful `scan()`. The output is capped to keep
   * context window usage reasonable (~2 000–3 000 tokens).
   */
  static toContextString(result: ScanResult): string {
    const langSummary = Object.entries(result.languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, count]) => `${lang} (${count})`)
      .join(', ');

    const parts: string[] = [
      `## Codebase snapshot`,
      `> Read-only static scan — secrets, binaries, and generated files excluded.`,
      ``,
      `**Languages:** ${langSummary || 'none detected'}`,
      `**Source files of interest:** ${result.totalSourceFilesFound}`,
      ``,
      `### Directory structure`,
      '```',
      result.fileTree,
      '```',
    ];

    if (result.keyFiles.length > 0) {
      parts.push('', '### Key source file previews');
      for (const f of result.keyFiles) {
        parts.push(
          '',
          `**${f.relativePath}** — ${f.language}, ${f.lineCount} lines`,
          '```',
          f.preview,
          f.lineCount > 25 ? '... (truncated at 25 lines)' : '',
          '```',
        );
      }
    }

    return parts.filter(l => l !== undefined).join('\n');
  }
}
