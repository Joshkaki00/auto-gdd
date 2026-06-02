#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';
import {
  ConfigStore,
  WorkspaceDetector,
  OllamaClient,
  EmbeddingClient,
  RAGIndexer,
  HybridRetriever,
  GDDAssembler,
  MarkdownWriter,
  GDD_SECTIONS,
  getProfile,
  EngineId,
} from '@auto-gdd/core';

const cwd = process.cwd();
const store = new ConfigStore(cwd);

const server = new Server(
  { name: 'auto-gdd', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ─── Tools ────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'gdd_generate',
      description: 'Generate a full Game Design Document for a game project. Saves output as Markdown to the configured vault/output path.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Game name' },
          genre: { type: 'string', description: 'Game genre (e.g. roguelite, FPS, puzzle platformer)' },
          platform: { type: 'string', description: 'Target platform(s) (e.g. PC, Mobile, Web)' },
          concept: { type: 'string', description: '2–4 sentence description of the game concept' },
          model: { type: 'string', description: 'Ollama model to use (optional, uses workspace default)' },
          split_sections: { type: 'boolean', description: 'Write each GDD section as a separate Obsidian note' },
        },
        required: ['name', 'genre', 'platform', 'concept'],
      },
    },
    {
      name: 'rag_index',
      description: 'Index a folder of reference documents (Markdown, text) into the local RAG library to ground GDD generation.',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Absolute or relative path to the folder to index' },
        },
        required: ['source'],
      },
    },
    {
      name: 'rag_search',
      description: 'Search the indexed RAG reference library. Returns top matching chunks.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          top_k: { type: 'number', description: 'Number of results (default 5)' },
        },
        required: ['query'],
      },
      idempotentHint: true,
    },
    {
      name: 'rag_list',
      description: 'List all documents currently indexed in the RAG library.',
      inputSchema: { type: 'object', properties: {} },
      idempotentHint: true,
    },
    {
      name: 'models_list',
      description: 'List all Ollama models available on this machine.',
      inputSchema: { type: 'object', properties: {} },
      idempotentHint: true,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case 'gdd_generate': {
        const config = store.resolve();
        const a = args as { name: string; genre: string; platform: string; concept: string; model?: string; split_sections?: boolean };

        const llm = new OllamaClient(config.ollamaUrl);
        if (!(await llm.isRunning())) {
          return { content: [{ type: 'text', text: 'Error: Ollama is not running. Start it with: ollama serve' }], isError: true };
        }

        const model = a.model ?? config.model ?? OllamaClient.recommendModel();

        // RAG
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

        const engine = (config.engine ?? 'unknown') as EngineId;
        const outputDir = path.resolve(cwd, config.outputPath ?? 'gdd');

        const sections: string[] = [];
        const assembler = new GDDAssembler(config.ollamaUrl);

        // Send progress notifications
        const gdd = await assembler.assemble({
          gameName: a.name,
          genre: a.genre,
          platform: a.platform,
          concept: a.concept,
          engine,
          model,
          retriever,
          onSectionStart: (_key, title, i, total) => {
            // Notify progress (best-effort; MCP progress notifications)
            server.notification({
              method: 'notifications/progress',
              params: { progressToken: `gdd_${Date.now()}`, progress: i, total, message: `Generating: ${title}` },
            }).catch(() => {});
          },
          onSectionEnd: (_key, content) => sections.push(content),
        });

        const writer = new MarkdownWriter();
        const result = writer.write(gdd, {
          outputDir,
          splitSections: a.split_sections ?? false,
        });

        const profile = getProfile(engine);
        const summary = [
          `✓ GDD generated for **${a.name}**`,
          `Engine: ${profile.displayName} | Genre: ${a.genre} | Platform: ${a.platform}`,
          `Output: ${result.mainFile}`,
          a.split_sections ? `+ ${result.sectionFiles.length} section files` : '',
        ].filter(Boolean).join('\n');

        return { content: [{ type: 'text', text: summary }] };
      }

      case 'rag_index': {
        const a = args as { source: string };
        const config = store.resolve();
        const sourcePath = path.resolve(cwd, a.source);
        const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
        const indexer = new RAGIndexer(config.vectorStorePath, embedder);
        await indexer.init();
        const docs = await indexer.indexDirectory(sourcePath);
        const total = docs.reduce((s, d) => s + d.chunkCount, 0);
        store.writeWorkspace({ ragSourcePath: sourcePath });
        return {
          content: [{
            type: 'text',
            text: `Indexed ${docs.length} documents (${total} chunks) from ${sourcePath}`,
          }],
        };
      }

      case 'rag_search': {
        const a = args as { query: string; top_k?: number };
        const config = store.resolve();
        const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
        const indexer = new RAGIndexer(config.vectorStorePath, embedder);
        if (!(await indexer.rawIndex.isIndexCreated())) {
          return { content: [{ type: 'text', text: 'No RAG index. Use rag_index first.' }] };
        }
        const retriever = new HybridRetriever(indexer.rawIndex, embedder);
        const results = await retriever.retrieve(a.query, a.top_k ?? 5);
        const text = results.map((r, i) =>
          `[${i + 1}] ${r.source}${r.heading ? ` — ${r.heading}` : ''}\n${r.text.slice(0, 300)}`
        ).join('\n\n');
        return { content: [{ type: 'text', text: text || 'No results.' }] };
      }

      case 'rag_list': {
        const config = store.resolve();
        const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
        const indexer = new RAGIndexer(config.vectorStorePath, embedder);
        const stats = indexer.readStats();
        if (stats.documents.length === 0) {
          return { content: [{ type: 'text', text: 'No documents indexed.' }] };
        }
        const text = stats.documents
          .map(d => `${d.source} — ${d.chunkCount} chunks (${new Date(d.indexedAt).toLocaleDateString()})`)
          .join('\n');
        return { content: [{ type: 'text', text: `${stats.totalChunks} total chunks\n\n${text}` }] };
      }

      case 'models_list': {
        const config = store.resolve();
        const client = new OllamaClient(config.ollamaUrl);
        if (!(await client.isRunning())) {
          return { content: [{ type: 'text', text: 'Ollama is not running.' }], isError: true };
        }
        const models = await client.listModels();
        if (models.length === 0) {
          return { content: [{ type: 'text', text: 'No models. Pull one: ollama pull phi4-mini' }] };
        }
        const text = models
          .map(m => `${m.name}${m.parameterSize ? ` (${m.parameterSize})` : ''} — ${(m.size / 1e9).toFixed(1)} GB`)
          .join('\n');
        return { content: [{ type: 'text', text: text }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

// ─── Resources ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'gdd://list',
      name: 'Generated GDDs',
      description: 'List of all GDD files previously generated in the output directory',
      mimeType: 'text/plain',
    },
    {
      uri: 'rag://documents',
      name: 'RAG Reference Library',
      description: 'Metadata about all indexed reference documents',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  const config = store.resolve();

  if (uri === 'gdd://list') {
    const outputDir = path.resolve(cwd, config.outputPath ?? 'gdd');
    let files: string[] = [];
    try {
      const { readdirSync } = await import('node:fs');
      files = readdirSync(outputDir).filter(f => f.endsWith('.md'));
    } catch { /* dir may not exist */ }
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: files.length > 0 ? files.join('\n') : 'No GDDs generated yet.',
      }],
    };
  }

  if (uri === 'rag://documents') {
    const embedder = new EmbeddingClient(config.ollamaUrl, config.embeddingModel);
    const indexer = new RAGIndexer(config.vectorStorePath, embedder);
    const stats = indexer.readStats();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ─── Prompts ──────────────────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [{
    name: 'gdd_prompt',
    description: 'Full section-by-section GDD prompt template. Use to understand what auto-gdd will generate.',
    arguments: [
      { name: 'game_name', description: 'Game name', required: true },
      { name: 'genre', description: 'Genre', required: true },
    ],
  }],
}));

server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (name !== 'gdd_prompt') throw new Error(`Unknown prompt: ${name}`);

  const gameName = (args as Record<string, string>)?.game_name ?? 'My Game';
  const genre = (args as Record<string, string>)?.genre ?? 'Unknown';

  const sections = GDD_SECTIONS.map(s => `### ${s.title}\n${s.key}`).join('\n\n');
  return {
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Generate a complete Game Design Document for "${gameName}" (${genre}).\n\nSections to generate:\n\n${sections}`,
      },
    }],
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const detector = new WorkspaceDetector(cwd);
  const detection = detector.detect();
  if (detection.engine !== 'unknown' && !store.readWorkspace().engine) {
    store.writeWorkspace({ engine: detection.engine as EngineId });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  process.stderr.write(`auto-gdd-mcp error: ${err}\n`);
  process.exit(1);
});
