# auto-gdd

Local AI Game Design Document generator. Free, offline, Obsidian-ready.

## Packages

- `packages/core` — shared engine (WorkspaceDetector, ConfigStore, OllamaClient, EmbeddingClient, RAGIndexer, HybridRetriever, GDDAssembler, MarkdownWriter)
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension with sidebar webview

## Build & run

```bash
npm install
npm run build                        # all packages
npm run build:core                   # core only
cd packages/cli && node dist/index.js init
cd packages/cli && node dist/index.js generate
cd packages/mcp && node dist/index.js   # MCP server
```

## Key rules

- All packages use TypeScript with `.js` extensions in imports (Node16 resolution)
- `packages/vscode` is CommonJS (`"module": "CommonJS"`); all others are ESM (`"type": "module"`)
- Never add cloud API calls — 100% offline after install
- Config hierarchy: `~/.auto-gdd/config.json` (global) → `.auto-gdd.json` (workspace, wins)
- GDD sections defined in `packages/core/src/gdd/PromptTemplates.ts` — add new sections there only
- Engine profiles in `packages/core/src/engines/engineProfiles.ts`
- RAG vector store: `vectra` (file-based, no server) stored in `.auto-gdd-vectors/`

## Adding a new game engine

1. Add profile to `ENGINE_PROFILES` in `packages/core/src/engines/engineProfiles.ts`
2. Add signature rule to `RULES` array in `packages/core/src/detector/WorkspaceDetector.ts`
3. Update `.cursor/hooks/workspace-open.js` and `.claude/skills/generate-gdd/SKILL.md`

## IMPORTANT: After editing any .ts file, run `npm run build` to verify no type errors
