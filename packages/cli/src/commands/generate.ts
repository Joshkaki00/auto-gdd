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
  WorkspaceScanner,
  GDD_SECTIONS,
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
  /** Skip codebase scanning — use when the project has no source files yet */
  noScan?: boolean;
  /** Comma-separated section key(s) to regenerate (e.g. "mechanics" or "mechanics,story"). */
  section?: string;
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

  const sectionFilter = flags.section
    ? flags.section.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Validate section keys early
  if (sectionFilter && sectionFilter.length > 0) {
    const validKeys = GDD_SECTIONS.map(s => s.key);
    const invalid = sectionFilter.filter(k => !validKeys.includes(k));
    if (invalid.length > 0) {
      console.error(chalk.red(`\nUnknown section key(s): ${invalid.join(', ')}`));
      console.error(chalk.dim(`Valid keys: ${validKeys.join(', ')}`));
      process.exit(1);
    }
    console.log(chalk.dim(`\nSection mode: regenerating [${sectionFilter.join(', ')}]`));
  }

  // Engine detection
  let {engine} = config;
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

  // Codebase scan
  let codebaseContext: string | undefined;
  if (!flags.noScan) {
    const scanSpinner = ora('Scanning codebase...').start();
    try {
      const scanner = new WorkspaceScanner(cwd, engine);
      const scanResult = scanner.scan();
      scanSpinner.stop();
      if (scanResult.totalSourceFilesFound > 0) {
        codebaseContext = WorkspaceScanner.toContextString(scanResult);
        const langSummary = Object.entries(scanResult.languageBreakdown)
          .sort(([, a], [, b]) => b - a).slice(0, 3)
          .map(([lang, count]) => `${lang}×${count}`).join(', ');
        console.log(chalk.dim(`Codebase: ${scanResult.totalSourceFilesFound} source files (${langSummary})`));
      } else {
        scanSpinner.stop();
        console.log(chalk.dim('Codebase: no source files yet — GDD will be concept-only'));
      }
    } catch {
      scanSpinner.stop();
    }
  }

  console.log(chalk.bold(`\nGenerating GDD for "${finalName}" (${finalGenre} · ${finalPlatform})`));
  console.log(chalk.dim(`Model: ${finalModel} · Engine: ${engine} · Sections: ${GDD_SECTIONS.length}\n`));

  const assembler = new GDDAssembler(config.ollamaUrl);
  let sectionStartTime = Date.now();
  let sectionTokenCount = 0;
  let totalTokens = 0;
  const totalStartTime = Date.now();

  const gdd = await assembler.assemble({
    gameName: finalName,
    genre: finalGenre,
    platform: finalPlatform,
    concept: finalConcept,
    engine,
    model: finalModel,
    retriever,
    sectionFilter,
    codebaseContext,
    onSectionStart: (_key, title, i, total) => {
      sectionStartTime = Date.now();
      sectionTokenCount = 0;
      const bar = chalk.dim('─'.repeat(50));
      process.stdout.write(`\n${bar}\n`);
      process.stdout.write(chalk.bold.cyan(`[${i + 1}/${total}] ${title}\n`));
      process.stdout.write(bar + '\n');
    },
    onToken: (token) => {
      process.stdout.write(chalk.dim(token));
      sectionTokenCount++;
      totalTokens++;
    },
    onSectionEnd: (_key, content) => {
      const elapsed = ((Date.now() - sectionStartTime) / 1000).toFixed(1);
      const tokPerSec = sectionTokenCount > 0
        ? (sectionTokenCount / ((Date.now() - sectionStartTime) / 1000)).toFixed(0)
        : '—';
      const words = content.trim().split(/\s+/).length;
      process.stdout.write(
        chalk.green(`\n✓ `) +
        chalk.dim(`${words} words · ${elapsed}s · ${tokPerSec} tok/s\n`),
      );
    },
  });

  const totalElapsed = ((Date.now() - totalStartTime) / 1000).toFixed(0);
  const sectionCount = sectionFilter?.length ?? GDD_SECTIONS.length;
  process.stdout.write(
    chalk.bold.green(`\n✓ ${sectionCount} section${sectionCount === 1 ? '' : 's'} complete`) +
    chalk.dim(` (${totalTokens} tokens · ${totalElapsed}s)\n`),
  );

  // Write output
  const writer = new MarkdownWriter();
  const result = writer.write(gdd, {
    outputDir: path.resolve(cwd, outputPath),
    splitSections: flags.split ?? false,
    sectionFilter,
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
