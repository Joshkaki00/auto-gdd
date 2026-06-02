import chalk from 'chalk';
import {
  ConfigStore,
  OllamaClient,
  EmbeddingClient,
  RAGIndexer,
  GDD_SECTIONS,
} from '@auto-gdd/core';

function ok(msg: string) { console.log(chalk.green('  ✓') + ' ' + msg); }
function warn(msg: string) { console.log(chalk.yellow('  ⚠') + ' ' + msg); }
function fail(msg: string) { console.log(chalk.red('  ✗') + ' ' + msg); }

export async function runDoctor(cwd = process.cwd()): Promise<void> {
  console.log(chalk.bold('\nauto-gdd doctor\n'));
  let allOk = true;

  // ── 1. Workspace config ───────────────────────────────────────────────────
  console.log(chalk.bold('Config'));
  const store = new ConfigStore(cwd);
  const ws = store.readWorkspace();
  const config = store.resolve();

  if (ws) {
    ok(`.auto-gdd.json found`);
    if (ws.gameName) ok(`Game: ${ws.gameName}`); else warn('gameName not set — run: auto-gdd init');
    if (ws.engine && ws.engine !== 'unknown') ok(`Engine: ${ws.engine}`);
    else warn('Engine unknown — run: auto-gdd init to auto-detect');
  } else {
    warn('No .auto-gdd.json in current directory — run: auto-gdd init');
  }

  // ── 2. Ollama ─────────────────────────────────────────────────────────────
  console.log(chalk.bold('\nOllama'));
  const llm = new OllamaClient(config.ollamaUrl);

  if (await llm.isRunning()) {
    ok(`Ollama running at ${config.ollamaUrl}`);

    const models = await llm.listModels();
    if (models.length === 0) {
      warn('No models pulled — run: ollama pull phi4-mini');
      allOk = false;
    } else {
      ok(`${models.length} model(s) available`);
      const recommended = OllamaClient.recommendModel();
      const hasRecommended = models.some(m => m.name.startsWith(recommended));
      if (hasRecommended) {
        ok(`Recommended model "${recommended}" is available`);
      } else {
        warn(`Recommended model "${recommended}" not found — run: ollama pull ${recommended}`);
      }
    }

    // Check configured model
    if (config.model) {
      const hasConfigured = await llm.hasModel(config.model);
      if (hasConfigured) ok(`Configured model "${config.model}" available`);
      else { fail(`Configured model "${config.model}" not found — run: ollama pull ${config.model}`); allOk = false; }
    }
  } else {
    fail(`Ollama not running at ${config.ollamaUrl} — run: ollama serve`);
    allOk = false;
  }

  // ── 3. Embedding model ────────────────────────────────────────────────────
  console.log(chalk.bold('\nRAG / Embeddings'));
  const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);

  try {
    const ready = await embedder.isReady();
    if (ready) {
      ok(`Embedding model "${config.embeddingModel}" available`);
    } else {
      warn(`Embedding model "${config.embeddingModel}" not found — run: ollama pull ${config.embeddingModel}`);
    }
  } catch {
    warn(`Could not check embedding model (Ollama may be offline)`);
  }

  // Check RAG index
  const indexer = new RAGIndexer(config.vectorStorePath, embedder);
  const stats = indexer.readStats();
  if (stats.totalChunks > 0) {
    ok(`RAG index: ${stats.totalChunks} chunks from ${stats.documents.length} document(s)`);
    const stale = stats.documents.filter(d => {
      const age = Date.now() - new Date(d.indexedAt).getTime();
      return age > 30 * 24 * 60 * 60 * 1000; // > 30 days
    });
    if (stale.length > 0) warn(`${stale.length} document(s) indexed >30 days ago — consider re-indexing`);
  } else {
    warn('No RAG index — run: auto-gdd rag index --source <path>  (optional but recommended)');
  }

  // ── 4. GDD sections ───────────────────────────────────────────────────────
  console.log(chalk.bold('\nGDD sections'));
  ok(`${GDD_SECTIONS.length} sections configured: ${GDD_SECTIONS.map(s => s.key).join(', ')}`);

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log('');
  if (allOk) {
    console.log(chalk.bold.green('✓ Everything looks good! Run: auto-gdd generate'));
  } else {
    console.log(chalk.bold.yellow('⚠ Some issues found. Fix the above and re-run: auto-gdd doctor'));
  }
}
