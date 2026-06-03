# auto-gdd

Local AI GDD generator. Free, offline, Obsidian-ready.

## Packages

- `packages/core` — shared engine (WorkspaceDetector, ConfigStore, OllamaClient, EmbeddingClient, RAGIndexer, HybridRetriever, GDDAssembler, MarkdownWriter, CursorScaffold)
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension (CommonJS — required by VS Code API)

## Shell commands

```bash
npm run build          # all packages (hooks run this after every .ts edit)
npm run lint           # ESLint Airbnb/TypeScript flat config
npm run lint:fix
cd packages/cli && node dist/index.js doctor        # health check
cd packages/cli && node dist/index.js init          # detect engine + scaffold Cursor rules
cd packages/cli && node dist/index.js generate      # full GDD
cd packages/cli && node dist/index.js generate --section mechanics   # regenerate one section
```

## Slash commands

Repeated workflows are encoded in `.claude/commands/` — use them instead of re-explaining:
- `/add-engine` — add a new game engine (profiles, detection, hooks, skill)
- `/review-gdd` — invoke the gdd-reviewer agent on the latest GDD
- `/release` — lint, build, bump, tag, publish
- `/rag-health` — check RAG index stats and embedding availability

## Library docs — use Context7 first

Before writing code that calls any third-party library, fetch current docs via the `context7` MCP.
Do not guess API signatures from training data — they go stale.

Pre-resolved IDs for this project:
- `ollama` JS SDK → `/ollama/ollama-js`
- `@modelcontextprotocol/sdk` → `/modelcontextprotocol/typescript-sdk`
- `vectra` → `/stevenic/vectra`
- `typescript-eslint` → `/typescript-eslint/typescript-eslint`
- `commander` → `/tj/commander.js`
- VS Code extension API → `/websites/code_visualstudio_api`

## Non-negotiable rules

- **Offline only.** No `openai`, `anthropic`, `groq`, or any cloud AI SDK. Hooks block installs.
- **Build is enforced.** PostToolUse hook runs `npm run build` after every `.ts` edit.
- `packages/vscode` stays CommonJS. All others are ESM.
- Import `.js` extensions required (Node16). ESLint enforces this.
- Node.js **≥ 22** required (vectra 0.14+ hard requirement; Node 20 EOL March 2026).

## Where things live

| Concern | File |
|---------|------|
| GDD section prompts | `packages/core/src/gdd/PromptTemplates.ts` |
| Engine profiles | `packages/core/src/engines/engineProfiles.ts` |
| Engine detection | `packages/core/src/detector/WorkspaceDetector.ts` |
| Config read/write | `packages/core/src/config/ConfigStore.ts` |
| Cursor rules scaffolding | `packages/core/src/cursor/CursorScaffold.ts` |
| RAG pipeline details | `packages/core/CLAUDE.md` |
| Vector store | `.auto-gdd-vectors/` (vectra file-based, no server) |

## Upcoming

`TODO(2026-07-28)` in `packages/mcp/src/index.ts` — bump `@modelcontextprotocol/sdk` and replace hand-rolled `ServerDiscoverRequestSchema` once Tier-1 SDK ships 2026-07-28 spec support.
