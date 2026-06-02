import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import {
  ConfigStore,
  EmbeddingClient,
  RAGIndexer,
  HybridRetriever,
} from '@auto-gdd/core';

export async function runRagIndex(source: string, cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();
  const sourcePath = path.resolve(cwd, source);

  const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
  const indexer = new RAGIndexer(config.vectorStorePath, embedder);
  await indexer.init();

  const spinner = ora('Indexing...').start();
  const docs = await indexer.indexDirectory(sourcePath, (file: string, i: number, tot: number) => {
    spinner.text = `[${i + 1}/${tot}] ${path.basename(file)}`;
  });
  spinner.stop();

  if (docs.length === 0) {
    console.log(chalk.yellow('No documents indexed. Supported formats: .md .txt .markdown'));
    return;
  }

  const total = docs.reduce((s: number, d: { chunkCount: number }) => s + d.chunkCount, 0);
  console.log(chalk.green(`\n✓ Indexed ${docs.length} documents (${total} chunks)`));
  for (const doc of docs) {
    console.log(chalk.dim(`  ${path.relative(cwd, doc.source)} — ${doc.chunkCount} chunks`));
  }

  store.writeWorkspace({ ragSourcePath: sourcePath });
}

export async function runRagList(cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();
  const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
  const indexer = new RAGIndexer(config.vectorStorePath, embedder);
  const stats = indexer.readStats();

  if (stats.documents.length === 0) {
    console.log(chalk.yellow('No documents indexed. Run: auto-gdd rag:index --source <path>'));
    return;
  }

  console.log(chalk.bold(`\nRAG Index — ${stats.totalChunks} total chunks\n`));
  for (const doc of stats.documents) {
    const rel = path.relative(cwd, doc.source);
    const date = new Date(doc.indexedAt).toLocaleDateString();
    console.log(`  ${chalk.cyan(rel)} — ${doc.chunkCount} chunks — indexed ${date}`);
  }
}

export async function runRagSearch(query: string, cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();
  const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
  const indexer = new RAGIndexer(config.vectorStorePath, embedder);

  const initialized = await indexer.rawIndex.isIndexCreated();
  if (!initialized) {
    console.log(chalk.yellow('No index found. Run: auto-gdd rag:index --source <path>'));
    return;
  }

  const retriever = new HybridRetriever(indexer.rawIndex, embedder);
  const spinner = ora('Searching...').start();
  const results = await retriever.retrieve(query, 5);
  spinner.stop();

  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  console.log(chalk.bold(`\nTop ${results.length} results for: "${query}"\n`));
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(chalk.cyan(`[${i + 1}] ${path.relative(cwd, r.source)}${r.heading ? ` — ${r.heading}` : ''}`));
    console.log(chalk.dim(`    score: ${r.score.toFixed(4)}`));
    console.log(`    ${r.text.slice(0, 200)}...`);
    console.log();
  }
}

export async function runRagClear(cwd = process.cwd()): Promise<void> {
  const store = new ConfigStore(cwd);
  const config = store.resolve();
  const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
  const indexer = new RAGIndexer(config.vectorStorePath, embedder);
  await indexer.clear();
  console.log(chalk.green('✓ RAG index cleared.'));
}
