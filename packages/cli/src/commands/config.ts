import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigStore, ENGINE_PROFILES, EngineId } from '@auto-gdd/core';

export async function runConfig(reset: boolean, cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);

  if (reset) {
    store.writeWorkspace({});
    console.log(chalk.green('✓ Workspace config cleared. Run `auto-gdd init` to set it up again.'));
    return;
  }

  const config = store.resolve();

  console.log(chalk.bold('\nCurrent configuration:\n'));
  console.log(chalk.dim('Global (~/.auto-gdd/config.json):'));
  const global = store.readGlobal();
  console.log(`  ollamaUrl:      ${global.ollamaUrl}`);
  console.log(`  model:          ${global.model}`);
  console.log(`  embeddingModel: ${global.embeddingModel}`);
  console.log();
  console.log(chalk.dim('Workspace (.auto-gdd.json):'));
  const ws = store.readWorkspace();
  console.log(`  engine:         ${ws.engine ?? chalk.dim('(not set)')}`);
  console.log(`  gameName:       ${ws.gameName ?? chalk.dim('(not set)')}`);
  console.log(`  genre:          ${ws.genre ?? chalk.dim('(not set)')}`);
  console.log(`  platform:       ${ws.platform ?? chalk.dim('(not set)')}`);
  console.log(`  outputPath:     ${ws.outputPath ?? chalk.dim('(not set)')}`);
  console.log(`  ragSourcePath:  ${ws.ragSourcePath ?? chalk.dim('(not set)')}`);
  console.log();

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What do you want to edit?',
    choices: [
      { name: 'Workspace config (game name, engine, genre, platform)', value: 'workspace' },
      { name: 'Global config (Ollama URL, model)', value: 'global' },
      { name: 'Nothing — just viewing', value: 'exit' },
    ],
  }]);

  if (action === 'exit') return;

  if (action === 'workspace') {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'engine',
        message: 'Engine:',
        choices: Object.values(ENGINE_PROFILES).map(p => ({ name: p.displayName, value: p.id })),
        default: ws.engine ?? 'unknown',
      },
      { type: 'input', name: 'gameName', message: 'Game name:', default: ws.gameName ?? '' },
      { type: 'input', name: 'genre', message: 'Genre:', default: ws.genre ?? '' },
      { type: 'input', name: 'platform', message: 'Platform(s):', default: ws.platform ?? '' },
      { type: 'input', name: 'outputPath', message: 'Output path:', default: ws.outputPath ?? './gdd' },
      { type: 'input', name: 'ragSourcePath', message: 'RAG source folder:', default: ws.ragSourcePath ?? '' },
    ]);
    store.writeWorkspace({
      engine: answers.engine as EngineId,
      gameName: answers.gameName || undefined,
      genre: answers.genre || undefined,
      platform: answers.platform || undefined,
      outputPath: answers.outputPath || undefined,
      ragSourcePath: answers.ragSourcePath || undefined,
    });
    console.log(chalk.green(`\n✓ Workspace config updated: ${store.workspaceConfigPath()}`));
  }

  if (action === 'global') {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'ollamaUrl', message: 'Ollama URL:', default: config.ollamaUrl },
      { type: 'input', name: 'model', message: 'Default model:', default: config.model },
      { type: 'input', name: 'embeddingModel', message: 'Embedding model:', default: config.embeddingModel },
    ]);
    store.writeGlobal(answers);
    console.log(chalk.green('\n✓ Global config updated.'));
  }
}
