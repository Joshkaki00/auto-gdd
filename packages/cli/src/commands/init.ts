import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  WorkspaceDetector,
  ConfigStore,
  CursorScaffold,
  WorkspaceScanner,
  ENGINE_PROFILES,
  EngineId,
} from '@auto-gdd/core';

export async function runInit(cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const detector = new WorkspaceDetector(cwd);

  const spinner = ora('Scanning workspace for game engine...').start();
  const result = detector.detect();
  spinner.stop();

  if (result.engine !== 'unknown') {
    console.log(chalk.green(`\nDetected: ${ENGINE_PROFILES[result.engine].displayName}`));
    for (const e of result.evidence) {
      console.log(chalk.dim(`  ✓ ${e}`));
    }
  } else {
    console.log(chalk.yellow('\nNo engine detected automatically.'));
  }

  const engineChoices = Object.values(ENGINE_PROFILES).map(p => ({
    name: `${p.displayName}${p.id === result.engine ? chalk.green(' ← detected') : ''}`,
    value: p.id,
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'engine',
      message: 'Game engine:',
      choices: engineChoices,
      default: result.engine,
    },
    {
      type: 'input',
      name: 'gameName',
      message: 'Game name:',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'genre',
      message: 'Genre (e.g. roguelite, FPS, puzzle platformer):',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'platform',
      message: 'Target platform(s) (e.g. PC, Mobile, Web):',
      default: ENGINE_PROFILES[result.engine]?.defaultPlatforms.slice(0, 2).join(', ') ?? 'PC',
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output path for GDD files:',
      default: './gdd',
    },
    {
      type: 'input',
      name: 'ragSourcePath',
      message: 'RAG reference folder (leave blank to skip):',
      default: '',
    },
  ]);

  const wsConfig = {
    engine: answers.engine as EngineId,
    gameName: answers.gameName.trim(),
    genre: answers.genre.trim(),
    platform: answers.platform.trim(),
    outputPath: answers.outputPath.trim(),
    ragSourcePath: answers.ragSourcePath.trim() || undefined,
  };

  store.writeWorkspace(wsConfig);

  console.log(chalk.green(`\n✓ Workspace config saved to ${store.workspaceConfigPath()}`));
  console.log(chalk.dim('  You can edit .auto-gdd.json directly at any time.'));
  console.log(chalk.dim('  Run `auto-gdd generate` to create your GDD.'));

  writeCLAUDEMd(cwd, wsConfig);
  writeCursorRules(cwd, wsConfig);
  await runCodebaseScan(cwd, wsConfig.engine);
}

function writeCLAUDEMd(
  cwd: string,
  cfg: {
    gameName: string;
    engine: EngineId;
    genre: string;
    platform: string;
    outputPath: string;
    ragSourcePath?: string;
  },
): void {
  const profile = ENGINE_PROFILES[cfg.engine];
  const claudePath = join(cwd, 'CLAUDE.md');
  const alreadyExists = existsSync(claudePath);

  const content = `# ${cfg.gameName}

## Project context

| Key | Value |
|-----|-------|
| Game name | ${cfg.gameName} |
| Engine | ${profile?.displayName ?? cfg.engine} |
| Genre | ${cfg.genre} |
| Platform | ${cfg.platform} |
| GDD output | \`${cfg.outputPath}\` |${cfg.ragSourcePath ? `\n| RAG source | \`${cfg.ragSourcePath}\` |` : ''}

## auto-gdd commands

\`\`\`bash
npx auto-gdd generate          # generate full GDD
npx auto-gdd generate --split  # one Obsidian note per section
npx auto-gdd rag index         # index RAG reference library
npx auto-gdd rag search "q"    # test a query
npx auto-gdd models            # list available Ollama models
\`\`\`

## Agent instructions

- When the user asks to write or update the GDD, run \`npx auto-gdd generate\`
- GDD files are in \`${cfg.outputPath}/\` — read them before answering design questions
- Never suggest cloud AI APIs — this project uses Ollama (local, free)
  - Engine: **${profile?.displayName ?? cfg.engine}** — use ${profile?.language ?? 'the appropriate language'} examples
  - For code snippets, target ${profile?.displayName ?? cfg.engine}${profile?.language ? ` (${profile.language})` : ''}
`;

  writeFileSync(claudePath, content, 'utf-8');

  if (alreadyExists) {
    console.log(chalk.yellow(`\n↻ Updated CLAUDE.md with game context`));
  } else {
    console.log(chalk.green(`✓ Created CLAUDE.md — Claude Code now knows your game context`));
  }
  console.log(chalk.dim(`  ${claudePath}`));
}

async function runCodebaseScan(cwd: string, engine: EngineId): Promise<void> {
  const spinner = ora('Scanning codebase (read-only — secrets and binaries excluded)...').start();
  try {
    const scanner = new WorkspaceScanner(cwd, engine);
    const result = scanner.scan();
    spinner.stop();

    if (result.totalSourceFilesFound === 0) {
      console.log(chalk.dim('\n  No source files found yet — that is fine for a new project.'));
      console.log(chalk.dim('  Re-run `auto-gdd generate` after adding code to get grounded output.'));
      return;
    }

    const langSummary = Object.entries(result.languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([lang, count]) => `${lang} (${count})`)
      .join(', ');

    console.log(chalk.green(`\n✓ Codebase scanned — ${result.totalSourceFilesFound} source file(s) found`));
    console.log(chalk.dim(`  Languages: ${langSummary}`));
    console.log(chalk.dim(`  ${result.ignoredCount} paths excluded (binaries, secrets, generated dirs)`));
    if (result.keyFiles.length > 0) {
      console.log(chalk.dim(`  Key files: ${result.keyFiles.map(f => f.relativePath).join(', ')}`));
    }
    console.log(chalk.dim('  GDD generation will reference actual class/file names from your project.'));
    console.log(chalk.dim('  Add a .auto-gdd-ignore file to exclude any additional paths.'));
  } catch {
    spinner.stop();
    console.log(chalk.dim('\n  Codebase scan skipped (could not read directory).'));
  }
}

function writeCursorRules(
  cwd: string,
  cfg: {
    gameName: string;
    engine: EngineId;
    genre: string;
    platform: string;
    outputPath: string;
  },
): void {
  try {
    const scaffold = new CursorScaffold();
    const result = scaffold.write({
      workspaceRoot: cwd,
      gameName: cfg.gameName,
      engine: cfg.engine,
      genre: cfg.genre,
      platform: cfg.platform,
      outputPath: cfg.outputPath,
    });

    if (result.written.length > 0) {
      console.log(chalk.green(`✓ Cursor rules written — context7 + project context`));
      for (const f of result.written) {
        console.log(chalk.dim(`  ${f}`));
      }
    }
  } catch {
    // Non-fatal — Cursor may not be installed
  }
}
