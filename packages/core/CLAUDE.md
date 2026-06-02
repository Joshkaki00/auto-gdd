# packages/core

Shared engine for auto-gdd. No CLI, UI, or VS Code dependencies allowed here.

## RAG pipeline

See `src/rag/` for the full pipeline. Key files:

- `src/rag/Chunker.ts` — parent-child chunking. `chunkMarkdown(text, source)` returns `Chunk[]`.
- `src/rag/RAGIndexer.ts` — wraps `vectra` `LocalIndex`. Call `indexer.init()` before any read/write.
- `src/rag/HybridRetriever.ts` — vector search + BM25 + cross-encoder rerank. Returns `RetrievedChunk[]`.

### vectra types

`queryItems` returns `QueryResult<Meta>[]` where each result has `.item.metadata` and `.score`.
`listItems` returns `LocalDocumentResult<Meta>[]` where each has `.metadata` directly.
Always access metadata via the `getMeta(metadata, key)` helper — never cast directly.

## Ollama clients

- `src/ollama/OllamaClient.ts` — text generation. `generate(opts)` streams via `onToken` callback.
- `src/ollama/EmbeddingClient.ts` — `embed(text)` returns `number[]`. Model: `nomic-embed-text`.

## Config

- `src/config/ConfigStore.ts` — `resolve()` merges global (`~/.auto-gdd/config.json`) + workspace (`.auto-gdd.json`). Workspace wins.
- `src/config/types.ts` — `ResolvedConfig`, `GlobalConfig`, `WorkspaceConfig`, `EngineId`.

## Engine profiles

`src/engines/engineProfiles.ts` exports `ENGINE_PROFILES` (map) and `getProfile(id)`.
Each profile has `mechanicsVocabulary` and `techSpecsHint` used to ground GDD section prompts.

## GDD assembly

`src/gdd/PromptTemplates.ts` — `GDD_SECTIONS` array drives generation order.
`src/gdd/GDDAssembler.ts` — iterates sections, retrieves RAG context, calls `OllamaClient.generate()`.
`src/gdd/MarkdownWriter.ts` — writes YAML frontmatter + wikilinks when `splitSections: true`.
