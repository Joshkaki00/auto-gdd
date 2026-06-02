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
  ENGINE_PROFILES,
  EngineId,
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
        const engine = (config.engine ?? 'unknown');
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
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-foreground);
    --border: var(--vscode-panel-border, #3c3c3c);
    --input-bg: var(--vscode-input-background);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --badge-bg: var(--vscode-badge-background);
    --badge-fg: var(--vscode-badge-foreground);
    --term-bg: var(--vscode-terminal-background, #1e1e1e);
    --term-fg: var(--vscode-terminal-foreground, #cccccc);
    --success: var(--vscode-testing-iconPassed, #4ec9b0);
    --warn: var(--vscode-editorWarning-foreground, #cca700);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--fg); padding: 16px; background: var(--bg); }

  /* ── Layout ── */
  .card { margin-bottom: 16px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .card-header { padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; border-bottom: 1px solid var(--border); }
  .card-body { padding: 12px; }

  /* ── Forms ── */
  label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; opacity: 0.6; }
  .field { margin-bottom: 10px; }
  input, select, textarea {
    width: 100%; background: var(--input-bg); color: var(--fg);
    border: 1px solid var(--border); border-radius: 4px;
    padding: 5px 8px; font-size: 13px; font-family: inherit;
  }
  input:focus, select:focus, textarea:focus { outline: 1px solid var(--btn-bg); }
  textarea { resize: vertical; min-height: 72px; }
  .row { display: flex; gap: 8px; }
  .row .field { flex: 1; }
  .check-label { display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.8; margin-bottom: 10px; text-transform: none; letter-spacing: 0; }
  .check-label input { width: auto; }

  /* ── Buttons ── */
  .btn { background: var(--btn-bg); color: var(--btn-fg); border: none; border-radius: 4px; padding: 7px 14px; cursor: pointer; font-size: 13px; font-family: inherit; transition: background 0.1s; }
  .btn:hover { background: var(--btn-hover); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  .btn-secondary { background: transparent; border: 1px solid var(--border); color: var(--fg); }
  .btn-secondary:hover { background: var(--border); }

  /* ── Engine badge ── */
  .badge { display: inline-block; background: var(--badge-bg); color: var(--badge-fg); border-radius: 3px; padding: 1px 7px; font-size: 10px; font-weight: 600; vertical-align: middle; }

  /* ── Progress bar ── */
  #progress-bar-wrap { display: none; margin-bottom: 12px; }
  .pb-header { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.65; margin-bottom: 4px; }
  .pb-track { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .pb-fill { height: 100%; background: var(--btn-bg); border-radius: 2px; transition: width 0.3s ease; }

  /* ── Streaming sections ── */
  #sections-view { display: none; margin-top: 4px; }
  .gdd-section { margin-bottom: 8px; border: 1px solid var(--border); border-radius: 5px; overflow: hidden; }
  .gdd-section-header {
    display: flex; align-items: center; gap: 8px; padding: 6px 10px;
    font-size: 12px; font-weight: 600; cursor: pointer; user-select: none;
    background: rgba(255,255,255,0.03);
  }
  .gdd-section-header:hover { background: rgba(255,255,255,0.06); }
  .gdd-section-status { font-size: 13px; flex-shrink: 0; }
  .gdd-section-title { flex: 1; }
  .gdd-section-meta { font-size: 10px; opacity: 0.5; font-weight: 400; }
  .gdd-section-body {
    font-size: 11px; font-family: var(--vscode-editor-font-family, monospace);
    background: var(--term-bg); color: var(--term-fg);
    padding: 8px 10px; white-space: pre-wrap; max-height: 180px;
    overflow-y: auto; border-top: 1px solid var(--border);
    display: none;
  }
  .gdd-section-body.active { display: block; }
  .cursor-blink { display: inline-block; width: 7px; height: 13px; background: var(--term-fg); vertical-align: text-bottom; animation: blink 0.9s step-end infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

  /* ── RAG + misc ── */
  .rag-stat { font-size: 11px; opacity: 0.6; margin-bottom: 8px; }
  .status { font-size: 11px; margin-top: 8px; min-height: 16px; }
  .status.ok { color: var(--success); }
  .status.err { color: var(--warn); }
  hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
</style>
</head>
<body>

<!-- Config card -->
<div class="card">
  <div class="card-header">Project &nbsp;<span id="engine-badge" class="badge">detecting…</span></div>
  <div class="card-body">
    <div class="field"><label>Engine</label><select id="engine">${engineOptions}</select></div>
    <div class="row">
      <div class="field"><label>Game Name</label><input id="gameName" placeholder="Neon Drift" /></div>
      <div class="field"><label>Genre</label><input id="genre" placeholder="top-down roguelite" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Platform</label><input id="platform" placeholder="PC, Web" /></div>
      <div class="field"><label>Output Path</label><input id="outputPath" placeholder="./gdd" /></div>
    </div>
    <button class="btn btn-full btn-secondary" onclick="saveConfig()">Save to .auto-gdd.json</button>
  </div>
</div>

<!-- Generate card -->
<div class="card">
  <div class="card-header">Generate GDD</div>
  <div class="card-body">
    <div class="field"><label>Game Concept</label>
      <textarea id="concept" placeholder="Describe your game in 2–4 sentences…"></textarea>
    </div>
    <div class="row">
      <div class="field"><label>Model</label><input id="model" placeholder="phi4-mini" /></div>
    </div>
    <label class="check-label">
      <input type="checkbox" id="split"> Split into separate Obsidian notes per section
    </label>
    <button id="genBtn" class="btn btn-full" onclick="generate()">⚡ Generate GDD</button>
    <div id="status" class="status"></div>

    <!-- Progress bar -->
    <div id="progress-bar-wrap">
      <div class="pb-header">
        <span id="pb-label">Starting…</span>
        <span id="pb-speed" style="font-size:10px"></span>
      </div>
      <div class="pb-track"><div id="pb-fill" class="pb-fill" style="width:0%"></div></div>
    </div>

    <!-- Section-by-section stream view -->
    <div id="sections-view"></div>
  </div>
</div>

<!-- RAG card -->
<div class="card">
  <div class="card-header">RAG Reference Library</div>
  <div class="card-body">
    <div id="rag-stats" class="rag-stat">No documents indexed.</div>
    <button class="btn btn-full btn-secondary" onclick="indexFolder()">Index Reference Folder…</button>
    <div id="rag-status" class="status"></div>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let isGenerating = false;
  let currentSectionEl = null;
  let tokenCount = 0;
  let sectionTokenCount = 0;
  let sectionStartMs = 0;
  let speedInterval = null;

  window.addEventListener('message', e => {
    const msg = e.data;

    // ── config ──────────────────────────────────────
    if (msg.type === 'config') {
      const c = msg.config;
      setVal('engine', c.engine || 'unknown');
      setVal('gameName', c.gameName || '');
      setVal('genre', c.genre || '');
      setVal('platform', c.platform || '');
      setVal('outputPath', c.outputPath || './gdd');
      setVal('model', c.model || '');
      const sel = document.getElementById('engine');
      document.getElementById('engine-badge').textContent = sel.options[sel.selectedIndex]?.text || 'Unknown';
      if (msg.stats) {
        document.getElementById('rag-stats').textContent = msg.stats.totalChunks > 0
          ? msg.stats.totalChunks + ' chunks · ' + msg.stats.documents.length + ' docs'
          : 'No documents indexed.';
      }
    }

    // ── section start ────────────────────────────────
    if (msg.type === 'progress') {
      document.getElementById('progress-bar-wrap').style.display = 'block';
      document.getElementById('sections-view').style.display = 'block';
      const pct = Math.round((msg.index / msg.total) * 100);
      document.getElementById('pb-fill').style.width = pct + '%';
      document.getElementById('pb-label').textContent = '[' + (msg.index + 1) + '/' + msg.total + '] ' + msg.section;

      // Collapse previous section body if it was open
      if (currentSectionEl) {
        const body = currentSectionEl.querySelector('.gdd-section-body');
        body.classList.remove('active');
        const cursor = body.querySelector('.cursor-blink');
        if (cursor) cursor.remove();
        currentSectionEl.querySelector('.gdd-section-status').textContent = '✓';
        const elapsed = ((Date.now() - sectionStartMs) / 1000).toFixed(1);
        const speed = sectionTokenCount > 0 ? Math.round(sectionTokenCount / ((Date.now() - sectionStartMs) / 1000)) : 0;
        currentSectionEl.querySelector('.gdd-section-meta').textContent = elapsed + 's · ' + speed + ' tok/s';
      }

      sectionTokenCount = 0;
      sectionStartMs = Date.now();

      const sec = document.createElement('div');
      sec.className = 'gdd-section';
      sec.innerHTML =
        '<div class="gdd-section-header" onclick="toggleSection(this)">' +
          '<span class="gdd-section-status">⏳</span>' +
          '<span class="gdd-section-title">' + escHtml(msg.section) + '</span>' +
          '<span class="gdd-section-meta"></span>' +
        '</div>' +
        '<div class="gdd-section-body active"><span class="cursor-blink"></span></div>';
      document.getElementById('sections-view').appendChild(sec);
      currentSectionEl = sec;
      sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── token ────────────────────────────────────────
    if (msg.type === 'token' && currentSectionEl) {
      tokenCount++;
      sectionTokenCount++;
      const body = currentSectionEl.querySelector('.gdd-section-body');
      const cursor = body.querySelector('.cursor-blink');
      const text = document.createTextNode(msg.token);
      body.insertBefore(text, cursor);
      body.scrollTop = body.scrollHeight;
    }

    // ── done ─────────────────────────────────────────
    if (msg.type === 'done') {
      if (currentSectionEl) {
        const body = currentSectionEl.querySelector('.gdd-section-body');
        const cursor = body.querySelector('.cursor-blink');
        if (cursor) cursor.remove();
        body.classList.remove('active');
        currentSectionEl.querySelector('.gdd-section-status').textContent = '✓';
        const elapsed = ((Date.now() - sectionStartMs) / 1000).toFixed(1);
        const speed = sectionTokenCount > 0 ? Math.round(sectionTokenCount / ((Date.now() - sectionStartMs) / 1000)) : 0;
        currentSectionEl.querySelector('.gdd-section-meta').textContent = elapsed + 's · ' + speed + ' tok/s';
        currentSectionEl = null;
      }
      document.getElementById('pb-fill').style.width = '100%';
      document.getElementById('pb-label').textContent = '✓ Complete';
      clearInterval(speedInterval);
      setStatus('ok', '✓ Saved: ' + msg.filePath);
      enableBtn();
    }

    // ── error ────────────────────────────────────────
    if (msg.type === 'error') {
      clearInterval(speedInterval);
      setStatus('err', '✗ ' + msg.message);
      enableBtn();
    }

    // ── rag ──────────────────────────────────────────
    if (msg.type === 'indexing') {
      document.getElementById('rag-status').textContent = 'Indexing…';
    }
    if (msg.type === 'index_progress') {
      document.getElementById('rag-status').textContent = 'Indexing ' + (msg.index + 1) + '/' + msg.total + '…';
    }
    if (msg.type === 'indexed') {
      document.getElementById('rag-stats').textContent = msg.count + ' docs (' + msg.chunks + ' chunks) indexed';
      document.getElementById('rag-status').textContent = '';
    }

    if (msg.type === 'trigger_generate') generate();
  });

  function generate() {
    if (isGenerating) return;
    isGenerating = true;
    tokenCount = 0;
    document.getElementById('genBtn').disabled = true;
    document.getElementById('genBtn').textContent = '⏳ Generating…';
    document.getElementById('sections-view').innerHTML = '';
    document.getElementById('sections-view').style.display = 'none';
    document.getElementById('progress-bar-wrap').style.display = 'none';
    document.getElementById('pb-fill').style.width = '0%';
    setStatus('', 'Starting Ollama…');
    currentSectionEl = null;

    speedInterval = setInterval(() => {
      document.getElementById('pb-speed').textContent = tokenCount + ' tokens';
    }, 800);

    vscode.postMessage({
      type: 'generate',
      gameName: getVal('gameName'),
      genre: getVal('genre'),
      platform: getVal('platform'),
      concept: getVal('concept'),
      model: getVal('model'),
      split: document.getElementById('split').checked,
    });
  }

  function saveConfig() {
    vscode.postMessage({
      type: 'save_config',
      engine: getVal('engine'),
      gameName: getVal('gameName'),
      genre: getVal('genre'),
      platform: getVal('platform'),
      outputPath: getVal('outputPath'),
    });
    setStatus('ok', '✓ Saved to .auto-gdd.json');
    setTimeout(() => setStatus('', ''), 2000);
  }

  function indexFolder() {
    vscode.postMessage({ type: 'open_folder_dialog' });
  }

  function toggleSection(header) {
    const body = header.nextElementSibling;
    body.classList.toggle('active');
  }

  function enableBtn() {
    isGenerating = false;
    document.getElementById('genBtn').disabled = false;
    document.getElementById('genBtn').textContent = '⚡ Generate GDD';
  }

  function setStatus(cls, text) {
    const el = document.getElementById('status');
    el.className = 'status' + (cls ? ' ' + cls : '');
    el.textContent = text;
  }

  function getVal(id) { return document.getElementById(id).value; }
  function setVal(id, v) { document.getElementById(id).value = v; }
  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
</script>
</body>
</html>`;
  }
}
