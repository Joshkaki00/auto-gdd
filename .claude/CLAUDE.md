# auto-gdd

Local AI GDD generator. Free, offline, Obsidian-ready.

## Packages

- `packages/core` — shared engine (WorkspaceDetector, ConfigStore, OllamaClient, EmbeddingClient, RAGIndexer, HybridRetriever, GDDAssembler, MarkdownWriter)
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension (CommonJS — required by VS Code API)

## Shell commands

```bash
npm run build          # all packages (hooks run this after every .ts edit)
npm run lint           # ESLint Airbnb/TypeScript
npm run lint:fix
cd packages/cli && node dist/index.js init
cd packages/cli && node dist/index.js generate
```

## Slash commands

Repeated workflows are encoded in `.claude/commands/` — use them instead of re-explaining:
- `/add-engine` — add a new game engine (profiles, detection, hooks, skill)
- `/review-gdd` — invoke the gdd-reviewer agent on the latest GDD
- `/release` — lint, build, bump, tag, publish
- `/rag-health` — check RAG index stats and embedding availability

## Non-negotiable rules

- **Offline only.** No `openai`, `anthropic`, `groq`, or any cloud AI SDK. Hooks block installs.
- **Build is enforced.** PostToolUse hook runs `npm run build` after every `.ts` edit.
- `packages/vscode` stays CommonJS. All others are ESM.
- Import `.js` extensions required (Node16). ESLint enforces this.

## Where things live

| Concern | File |
|---------|------|
| GDD section prompts | `packages/core/src/gdd/PromptTemplates.ts` |
| Engine profiles | `packages/core/src/engines/engineProfiles.ts` |
| Engine detection | `packages/core/src/detector/WorkspaceDetector.ts` |
| Config read/write | `packages/core/src/config/ConfigStore.ts` |
| RAG pipeline details | `packages/core/CLAUDE.md` |
