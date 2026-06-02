import chalk from 'chalk';
import { ConfigStore, OllamaClient } from '@auto-gdd/core';

export async function runModels(cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();
  const client = new OllamaClient(config.ollamaUrl);

  const running = await client.isRunning();
  if (!running) {
    console.error(chalk.red('Ollama is not running. Start it with: ollama serve'));
    process.exit(1);
  }

  const models = await client.listModels();
  if (models.length === 0) {
    console.log(chalk.yellow('No models found. Pull one with: ollama pull phi4-mini'));
    return;
  }

  console.log(chalk.bold(`\nAvailable Ollama models (${models.length})\n`));
  for (const m of models) {
    const active = m.name === config.model;
    const sizeGb = (m.size / 1e9).toFixed(1);
    const params = m.parameterSize ? ` · ${m.parameterSize}` : '';
    const marker = active ? chalk.green(' ← active') : '';
    console.log(`  ${chalk.cyan(m.name)}${params} · ${sizeGb} GB${marker}`);
  }

  console.log();
  console.log(chalk.dim('Recommended for auto-GDD:'));
  console.log(chalk.dim('  8 GB RAM  → ollama pull phi4-mini'));
  console.log(chalk.dim('  16 GB RAM → ollama pull qwen3:4b'));
  console.log(chalk.dim('  32 GB RAM → ollama pull qwen3:7b'));
  console.log(chalk.dim('  Embeddings → ollama pull nomic-embed-text'));
}
