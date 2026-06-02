import * as vscode from 'vscode';
import path from 'node:path';
import {
  ConfigStore,
  OllamaClient,
  EmbeddingClient,
  RAGIndexer,
  HybridRetriever,
  GDDAssembler,
  MarkdownWriter,
  WorkspaceDetector,
  ENGINE_PROFILES,
  EngineId,
  getProfile,
} from '@auto-gdd/core';

export class GDDPanel {
  static currentPanel: GDDPanel | undefined;

  private webview: vscode.Webview;
  private extensionUri: vscode.Uri;
  private workspaceRoot: string;

  constructor(webview: vscode.Webview, extensionUri: vscode.Uri, workspaceRoot: string) {
    this.webview = webview;
    this.extensionUri = extensionUri;
    this.workspaceRoot = workspaceRoot;

    webview.options = { enableScripts: true };
    webview.html = this.getHtml();

    webview.onDidReceiveMessage(msg => this.handleMessage(msg));
    this.refresh();
  }

  static createOrShow(extensionUri: vscode.Uri, workspaceRoot: string): GDDPanel {
    if (GDDPanel.currentPanel) {
      GDDPanel.currentPanel.refresh();
      return GDDPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel('auto-gdd', 'Auto-GDD', vscode.ViewColumn.Beside, {
      enableScripts: true,
    });
    GDDPanel.currentPanel = new GDDPanel(panel.webview, extensionUri, workspaceRoot);
    panel.onDidDispose(() => { GDDPanel.currentPanel = undefined; });
    return GDDPanel.currentPanel;
  }

  refresh(): void {
    const store = new ConfigStore(this.workspaceRoot);
    const config = store.resolve();
    const stats = this.getRagStats(config.vectorStorePath);
    this.webview.postMessage({ type: 'config', config, stats });
  }

  triggerGenerate(): void {
    this.webview.postMessage({ type: 'trigger_generate' });
  }

  triggerRagIndex(sourcePath: string): void {
    this.webview.postMessage({ type: 'trigger_rag_index', source: sourcePath });
    this.handleMessage({ type: 'rag_index', source: sourcePath });
  }

  private getRagStats(vectorStorePath: string) {
    try {
      const { EmbeddingClient: EC, RAGIndexer: RI } = require('@auto-gdd/core');
      const config = new ConfigStore(this.workspaceRoot).resolve();
      const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
      const indexer = new RAGIndexer(vectorStorePath, embedder);
      return indexer.readStats();
    } catch {
      return { totalChunks: 0, documents: [] };
    }
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    const store = new ConfigStore(this.workspaceRoot);
    const config = store.resolve();

    switch (msg.type) {
      case 'generate': {
        const { gameName, genre, platform, concept, model, split } = msg as {
          gameName: string; genre: string; platform: string; concept: string; model: string; split: boolean;
        };

        const llm = new OllamaClient(config.ollamaUrl);
        if (!(await llm.isRunning())) {
          this.webview.postMessage({ type: 'error', message: 'Ollama is not running. Run: ollama serve' });
          return;
        }

        let retriever: HybridRetriever | undefined;
        if (config.ragSourcePath) {
          const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
          const indexer = new RAGIndexer(config.vectorStorePath, embedder);
          await indexer.init();
          const stats = indexer.readStats();
          if (stats.totalChunks > 0) {
            retriever = new HybridRetriever(indexer.rawIndex, embedder);
          }
        }

        const outputDir = path.resolve(this.workspaceRoot, config.outputPath ?? 'gdd');
        const engine = (config.engine ?? 'unknown') as EngineId;
        const assembler = new GDDAssembler(config.ollamaUrl);

        this.webview.postMessage({ type: 'generating', total: 9 });

        const gdd = await assembler.assemble({
          gameName,
          genre,
          platform,
          concept,
          engine,
          model: model || config.model,
          retriever,
          onSectionStart: (_key, title, i, total) => {
            this.webview.postMessage({ type: 'progress', section: title, index: i, total });
          },
          onToken: (token) => {
            this.webview.postMessage({ type: 'token', token });
          },
        });

        const writer = new MarkdownWriter();
        const result = writer.write(gdd, { outputDir, splitSections: split });

        this.webview.postMessage({ type: 'done', filePath: result.mainFile });
        store.writeWorkspace({ gameName, genre, platform, engine });

        // Open the file
        const doc = await vscode.workspace.openTextDocument(result.mainFile);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
        break;
      }

      case 'rag_index': {
        const sourcePath = msg.source as string;
        const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
        const indexer = new RAGIndexer(config.vectorStorePath, embedder);
        await indexer.init();
        this.webview.postMessage({ type: 'indexing' });
        const docs = await indexer.indexDirectory(sourcePath, (_f, i, total) => {
          this.webview.postMessage({ type: 'index_progress', index: i, total });
        });
        const total = docs.reduce((s, d) => s + d.chunkCount, 0);
        store.writeWorkspace({ ragSourcePath: sourcePath });
        this.webview.postMessage({ type: 'indexed', count: docs.length, chunks: total });
        this.refresh();
        break;
      }

      case 'save_config': {
        const { engine, gameName, genre, platform, outputPath } = msg as Record<string, string>;
        store.writeWorkspace({ engine: engine as EngineId, gameName, genre, platform, outputPath });
        this.refresh();
        break;
      }
    }
  }

  private getHtml(): string {
    const engineOptions = Object.values(ENGINE_PROFILES)
      .map(p => `<option value="${p.id}">${p.displayName}</option>`)
      .join('\n');

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Auto-GDD</title>
<style>
  :root { --bg: var(--vscode-editor-background); --fg: var(--vscode-foreground); --accent: var(--vscode-button-background); --border: var(--vscode-panel-border); --input-bg: var(--vscode-input-background); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--fg); padding: 16px; }
  h2 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--fg); }
  .section { margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
  label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; opacity: 0.7; }
  input, select, textarea { width: 100%; background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; font-size: 13px; font-family: inherit; margin-bottom: 10px; }
  textarea { resize: vertical; min-height: 80px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 8px 14px; cursor: pointer; font-size: 13px; width: 100%; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .engine-badge { display: inline-block; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; padding: 2px 8px; font-size: 11px; margin-bottom: 10px; }
  .rag-info { font-size: 11px; opacity: 0.6; margin-bottom: 8px; }
  #log { font-size: 11px; font-family: monospace; background: var(--vscode-terminal-background, #1e1e1e); color: var(--vscode-terminal-foreground, #d4d4d4); border-radius: 4px; padding: 8px; max-height: 200px; overflow-y: auto; margin-top: 10px; white-space: pre-wrap; display: none; }
  .progress { font-size: 11px; margin-top: 8px; opacity: 0.7; }
</style>
</head>
<body>
<h2>Auto-GDD</h2>

<div class="section">
  <div id="engine-badge" class="engine-badge">Engine: detecting...</div>
  <label>Engine</label>
  <select id="engine">${engineOptions}</select>
  <label>Game Name</label>
  <input id="gameName" placeholder="e.g. Neon Drift" />
  <label>Genre</label>
  <input id="genre" placeholder="e.g. top-down roguelite" />
  <label>Platform</label>
  <input id="platform" placeholder="e.g. PC, Web" />
  <label>Output Path</label>
  <input id="outputPath" placeholder="./gdd" />
  <button onclick="saveConfig()">Save to .auto-gdd.json</button>
</div>

<div class="section">
  <label>Game Concept</label>
  <textarea id="concept" placeholder="Describe your game in 2–4 sentences..."></textarea>
  <label>Model (optional)</label>
  <input id="model" placeholder="phi4-mini" />
  <label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0">
    <input type="checkbox" id="split" style="width:auto;margin:0"> Split into separate Obsidian notes
  </label>
  <br>
  <button id="genBtn" onclick="generate()">Generate GDD</button>
  <div id="progress" class="progress"></div>
  <div id="log"></div>
</div>

<div class="section">
  <h2>RAG Reference Library</h2>
  <div id="rag-stats" class="rag-info">No documents indexed.</div>
  <button onclick="indexFolder()">Index Reference Folder...</button>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let isGenerating = false;

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'config') {
      const c = msg.config;
      document.getElementById('engine').value = c.engine || 'unknown';
      document.getElementById('gameName').value = c.gameName || '';
      document.getElementById('genre').value = c.genre || '';
      document.getElementById('platform').value = c.platform || '';
      document.getElementById('outputPath').value = c.outputPath || './gdd';
      document.getElementById('model').value = c.model || '';
      const badge = document.getElementById('engine-badge');
      const engineName = document.getElementById('engine').options[document.getElementById('engine').selectedIndex]?.text || 'Unknown';
      badge.textContent = 'Engine: ' + engineName;
      if (msg.stats) {
        const el = document.getElementById('rag-stats');
        el.textContent = msg.stats.totalChunks > 0
          ? msg.stats.totalChunks + ' chunks from ' + msg.stats.documents.length + ' documents'
          : 'No documents indexed.';
      }
    }
    if (msg.type === 'progress') {
      document.getElementById('progress').textContent = '[' + (msg.index+1) + '/' + msg.total + '] ' + msg.section;
      document.getElementById('log').style.display = 'block';
    }
    if (msg.type === 'token') {
      const log = document.getElementById('log');
      log.textContent += msg.token;
      log.scrollTop = log.scrollHeight;
    }
    if (msg.type === 'done') {
      document.getElementById('genBtn').disabled = false;
      document.getElementById('genBtn').textContent = 'Generate GDD';
      document.getElementById('progress').textContent = '✓ Done: ' + msg.filePath;
      isGenerating = false;
    }
    if (msg.type === 'error') {
      document.getElementById('genBtn').disabled = false;
      document.getElementById('genBtn').textContent = 'Generate GDD';
      document.getElementById('progress').textContent = '✗ ' + msg.message;
      isGenerating = false;
    }
    if (msg.type === 'indexed') {
      document.getElementById('rag-stats').textContent = msg.count + ' docs (' + msg.chunks + ' chunks) indexed';
    }
    if (msg.type === 'trigger_generate') generate();
  });

  function generate() {
    if (isGenerating) return;
    isGenerating = true;
    document.getElementById('genBtn').disabled = true;
    document.getElementById('genBtn').textContent = 'Generating...';
    document.getElementById('log').textContent = '';
    document.getElementById('progress').textContent = 'Starting...';
    vscode.postMessage({
      type: 'generate',
      gameName: document.getElementById('gameName').value,
      genre: document.getElementById('genre').value,
      platform: document.getElementById('platform').value,
      concept: document.getElementById('concept').value,
      model: document.getElementById('model').value,
      split: document.getElementById('split').checked,
    });
  }

  function saveConfig() {
    vscode.postMessage({
      type: 'save_config',
      engine: document.getElementById('engine').value,
      gameName: document.getElementById('gameName').value,
      genre: document.getElementById('genre').value,
      platform: document.getElementById('platform').value,
      outputPath: document.getElementById('outputPath').value,
    });
  }

  function indexFolder() {
    vscode.postMessage({ type: 'open_folder_dialog' });
  }
</script>
</body>
</html>`;
  }
}
