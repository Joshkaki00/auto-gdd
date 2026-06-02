import fs from 'node:fs';
import path from 'node:path';
import type { EngineId } from '../config/types.js';

export interface ScaffoldInput {
  workspaceRoot: string;
  gameName: string;
  engine: EngineId;
  genre: string;
  platform: string;
  outputPath: string;
}

export interface ScaffoldResult {
  written: string[];
  skipped: string[];
}

/**
 * Context7 library IDs for each supported game engine.
 * Resolved live via context7 MCP — do not guess these.
 */
const ENGINE_CONTEXT7: Partial<Record<EngineId, { id: string; label: string }[]>> = {
  godot: [
    { id: '/godotengine/godot-docs', label: 'Godot 4 docs (GDScript API, nodes, signals)' },
  ],
  unity: [
    { id: '/websites/unity3d_manual', label: 'Unity scripting manual (MonoBehaviour, C# API)' },
  ],
  unreal: [
    { id: '/websites/dev_epicgames_unreal-engine', label: 'Unreal Engine 5 docs (Blueprints, C++)' },
  ],
  phaser: [
    { id: '/websites/phaser_io', label: 'Phaser (scenes, sprites, physics, input, cameras)' },
  ],
  threejs: [
    { id: '/mrdoob/three.js', label: 'Three.js (geometry, materials, renderer, scene)' },
  ],
  bevy: [
    { id: '/websites/rs_bevy_bevy', label: 'Bevy (ECS, systems, components, resources)' },
  ],
  pixi: [
    { id: '/llmstxt/pixijs_llms-full_txt', label: 'PixiJS (Application, Sprite, Texture, Container)' },
  ],
  kaboom: [
    { id: '/websites/kaplayjs', label: 'Kaplay/Kaboom (scenes, sprites, components, collision)' },
  ],
};

/** TypeScript / JS packages shared across web-based engines */
const WEB_ENGINE_IDS = ['phaser', 'threejs', 'pixi', 'kaboom'] as EngineId[];

const TYPESCRIPT_IDS = [
  { id: '/microsoft/TypeScript', label: 'TypeScript language reference' },
];

export class CursorScaffold {
  write(input: ScaffoldInput): ScaffoldResult {
    const result: ScaffoldResult = { written: [], skipped: [] };
    const cursorDir = path.join(input.workspaceRoot, '.cursor', 'rules');

    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }

    this.writeContext7Rule(input, cursorDir, result);
    this.writeProjectRule(input, cursorDir, result);

    return result;
  }

  private writeContext7Rule(
    input: ScaffoldInput,
    rulesDir: string,
    result: ScaffoldResult,
  ): void {
    const file = path.join(rulesDir, 'use-context7.mdc');
    const engineEntries = ENGINE_CONTEXT7[input.engine] ?? [];
    const extraEntries = WEB_ENGINE_IDS.includes(input.engine) ? TYPESCRIPT_IDS : [];
    const allEntries = [...engineEntries, ...extraEntries];

    const tableRows = allEntries
      .map(e => `| \`${e.id}\` | ${e.label} |`)
      .join('\n');

    const hasEntries = allEntries.length > 0;

    const content = [
      '---',
      'description: Fetch up-to-date library docs via Context7 before writing any API calls',
      'alwaysApply: true',
      '---',
      '',
      '## Use Context7 before writing library code',
      '',
      'Before writing or editing code that calls a third-party library API, fetch current docs via Context7.',
      'Do **not** rely on training data for API signatures — they go stale.',
      '',
      '### Two-step pattern',
      '',
      '1. If the library ID is unknown → call `resolve-library-id` with the library name + your task as the query',
      '2. Then call `query-docs` with the resolved ID and a specific query',
      '',
      'Skip step 1 when you already have the ID.',
      '',
      ...(hasEntries ? [
        '### Pre-resolved IDs for this project',
        '',
        '| Context7 ID | What it covers |',
        '|-------------|----------------|',
        tableRows,
        '',
      ] : []),
      '### When to call it',
      '',
      '- Adding a method call on a library class you haven\'t used before',
      '- Unsure about an API signature, event name, or option',
      '- Writing integration code between two libraries',
      '',
      '### When to skip it',
      '',
      '- Pure logic with no library calls (loops, math, pure functions)',
      '- Refactoring within a single file',
      '- The same API was already fetched earlier in this session',
    ].join('\n');

    fs.writeFileSync(file, content, 'utf-8');
    result.written.push(file);
  }

  private writeProjectRule(
    input: ScaffoldInput,
    rulesDir: string,
    result: ScaffoldResult,
  ): void {
    const file = path.join(rulesDir, 'game-project.mdc');

    const content = [
      '---',
      `description: ${input.gameName} — game project context for AI agents`,
      'alwaysApply: true',
      '---',
      '',
      `## ${input.gameName}`,
      '',
      '| Key | Value |',
      '|-----|-------|',
      `| Engine | ${input.engine} |`,
      `| Genre | ${input.genre} |`,
      `| Platform | ${input.platform} |`,
      `| GDD | \`${input.outputPath}\` |`,
      '',
      '## Agent instructions',
      '',
      `- This is a **${input.genre}** game built with **${input.engine}** targeting **${input.platform}**.`,
      `- Game Design Documents are in \`${input.outputPath}/\`. Read them before answering design questions.`,
      '- To regenerate the GDD, run: `auto-gdd generate`',
      '- To add a new section or update one, run: `auto-gdd generate --section <key>`',
    ].join('\n');

    fs.writeFileSync(file, content, 'utf-8');
    result.written.push(file);
  }
}
