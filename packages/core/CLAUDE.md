# packages/core

Shared engine for auto-gdd. No CLI, UI, or VS Code dependencies allowed here.

## RAG pipeline

See `src/rag/` for the full pipeline. Key files:

- `src/rag/Chunker.ts` — parent-child chunking. `chunkMarkdown(text, source)` returns `Chunk[]`.
- `src/rag/RAGIndexer.ts` — wraps `vectra` `LocalIndex`. Call `indexer.init()` before any read/write.
- `src/rag/HybridRetriever.ts` — vector search + BM25 + cross-encoder rerank. Returns `RetrievedChunk[]`.

### vectra API (v0.15)

`queryItems(vector, query, topK, filter?, isBm25?)` — the `query` string argument is **required** as of v0.14+.
`listItems(filter?)` returns `LocalDocumentResult<Meta>[]` where each has `.metadata` directly.
Always access metadata via the `getMeta(metadata, key)` helper — never cast directly.

## Ollama clients

- `src/ollama/OllamaClient.ts` — text generation. `generate(opts)` streams via `onToken` callback.
- `src/ollama/EmbeddingClient.ts` — embedding generation. Model pinned to `nomic-embed-text:v1.5`.
  - `embedDocument(text)` — applies `search_document:` task prefix before embedding
  - `embedQuery(text)` — applies `search_query:` task prefix before embedding
  - `embed(text)` — raw embed, no prefix (legacy, avoid for new code)
  - `isReady()` — checks if the embedding model is pulled in Ollama
  - Task prefixes are applied automatically for `nomic-embed-text` and `nomic-embed-text:v1.5`

**Important:** always use `embedDocument` when indexing chunks and `embedQuery` when embedding a search query. Using the wrong method silently degrades retrieval quality.

## Config

- `src/config/ConfigStore.ts` — `resolve()` merges global (`~/.auto-gdd/config.json`) + workspace (`.auto-gdd.json`). Workspace wins.
- `src/config/types.ts` — `ResolvedConfig`, `GlobalConfig`, `WorkspaceConfig`, `EngineId`.
- Default `embeddingModel` is `nomic-embed-text:v1.5`. Do not change to bare `nomic-embed-text` — pinning prevents silent vector drift.

## Engine profiles

`src/engines/engineProfiles.ts` exports `ENGINE_PROFILES` (map) and `getProfile(id)`.
Each profile has `mechanicsVocabulary` and `techSpecsHint` used to ground GDD section prompts.

## GDD assembly

`src/gdd/PromptTemplates.ts` — `GDD_SECTIONS` array drives generation order.
`src/gdd/GDDAssembler.ts` — iterates sections, retrieves RAG context, calls `OllamaClient.generate()`.
  - `AssembleInput.sectionFilter?: string[]` — when set, only generates the specified section keys.
`src/gdd/MarkdownWriter.ts` — writes YAML frontmatter + wikilinks when `splitSections: true`.
  - `WriteOptions.sectionFilter?: string[]` — when set and the output file already exists, merges only those sections in-place rather than rewriting the whole document.

## Cursor scaffolding

`src/cursor/CursorScaffold.ts` — called by `auto-gdd init`.
- `writeContext7Rule(dir, engineId)` — writes `.cursor/rules/use-context7.mdc` with engine-specific context7 IDs.
- `writeProjectRule(dir, wsConfig)` — writes `.cursor/rules/game-project.mdc` with project metadata.

Supported engine → context7 ID mappings live in `ENGINE_CONTEXT7` at the top of the file. Add new entries when adding a new engine.
