import path from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  ConfigStore,
  OllamaClient,
  EmbeddingClient,
  RAGIndexer,
  HybridRetriever,
  GDDAssembler,
  MarkdownWriter,
  GDD_SECTIONS,
  EngineId,
  suggestEngine,
} from '@auto-gdd/core';

interface GenerateFlags {
  name?: string;
  genre?: string;
  platform?: string;
  concept?: string;
  output?: string;
  model?: string;
  split?: boolean;
  noRag?: boolean;
}

export async function runGenerate(flags: GenerateFlags, cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();

  // Fill in missing fields from flags or prompt
  const gameName = flags.name ?? config.gameName;
  const genre = flags.genre ?? config.genre;
  const platform = flags.platform ?? config.platform;
  const outputPath = flags.output ?? config.outputPath ?? path.join(cwd, 'gdd');

  const answers: Record<string, string> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missing: any[] = [];
  if (!gameName) missing.push({ type: 'input', name: 'gameName', message: 'Game name:' });
  if (!genre) missing.push({ type: 'input', name: 'genre', message: 'Genre:' });
  if (!platform) missing.push({ type: 'input', name: 'platform', message: 'Target platform(s):' });
  missing.push({
    type: 'input',
    name: 'concept',
    message: 'Describe the game concept (2–4 sentences):',
    default: flags.concept,
  });

  if (missing.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompted = await (inquirer as any).prompt(missing);
    Object.assign(answers, prompted);
  }

  const finalName = gameName ?? answers.gameName;
  const finalGenre = genre ?? answers.genre;
  const finalPlatform = platform ?? answers.platform;
  const finalConcept = flags.concept ?? answers.concept ?? '';
  const finalModel = flags.model ?? config.model ?? OllamaClient.recommendModel();

  // Engine detection
  let engine = config.engine as EngineId | undefined;
  if (!engine || engine === 'unknown') {
    const suggestion = suggestEngine(finalGenre, finalPlatform);
    if (suggestion) {
      console.log(chalk.yellow(`\nSuggested engine: ${suggestion.engine} — ${suggestion.reason}`));
    }
  }
  if (!engine) engine = 'unknown';

  // Check Ollama
  const llmClient = new OllamaClient(config.ollamaUrl);
  const running = await llmClient.isRunning();
  if (!running) {
    console.error(chalk.red('\nOllama is not running. Start it with: ollama serve'));
    process.exit(1);
  }

  const hasModel = await llmClient.hasModel(finalModel);
  if (!hasModel) {
    console.warn(chalk.yellow(`\nModel "${finalModel}" not found locally. Pulling...`));
    const spinner = ora(`Pulling ${finalModel}...`).start();
    try {
      // ollama pull is done via CLI; advise user
      spinner.fail(`Run: ollama pull ${finalModel}`);
      process.exit(1);
    } catch {
      spinner.fail(`Could not pull model.`);
      process.exit(1);
    }
  }

  // RAG setup
  let retriever: HybridRetriever | undefined;
  if (!flags.noRag && config.ragSourcePath) {
    const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
    const indexer = new RAGIndexer(config.vectorStorePath, embedder);
    await indexer.init();
    const stats = indexer.readStats();
    if (stats.totalChunks > 0) {
      console.log(chalk.dim(`\nRAG: ${stats.totalChunks} chunks from ${stats.documents.length} documents`));
      retriever = new HybridRetriever(indexer.rawIndex, embedder);
    }
  }

  console.log(chalk.bold(`\nGenerating GDD for "${finalName}" (${finalGenre} · ${finalPlatform})`));
  console.log(chalk.dim(`Model: ${finalModel} · Engine: ${engine} · Sections: ${GDD_SECTIONS.length}\n`));

  const assembler = new GDDAssembler(config.ollamaUrl);
  let currentSection = '';

  const gdd = await assembler.assemble({
    gameName: finalName,
    genre: finalGenre,
    platform: finalPlatform,
    concept: finalConcept,
    engine,
    model: finalModel,
    retriever,
    onSectionStart: (key, title, i, total) => {
      if (currentSection) process.stdout.write('\n');
      currentSection = key;
      console.log(chalk.bold.cyan(`\n[${i + 1}/${total}] ${title}`));
    },
    onToken: (token) => process.stdout.write(token),
    onSectionEnd: () => {},
  });

  process.stdout.write('\n');

  // Write output
  const writer = new MarkdownWriter();
  const result = writer.write(gdd, {
    outputDir: path.resolve(cwd, outputPath),
    splitSections: flags.split ?? false,
  });

  console.log(chalk.green(`\n✓ GDD written to: ${result.mainFile}`));
  if (result.sectionFiles.length > 0) {
    console.log(chalk.dim(`  + ${result.sectionFiles.length} section files`));
  }

  // Persist to workspace config if not already saved
  if (!config.gameName) {
    store.writeWorkspace({ gameName: finalName, genre: finalGenre, platform: finalPlatform, engine });
  }
}
