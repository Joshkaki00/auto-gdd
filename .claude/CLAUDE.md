# auto-gdd

Local AI GDD generator. Free, offline, Obsidian-ready.

## Packages

- `packages/core` — shared engine (WorkspaceDetector, ConfigStore, OllamaClient, EmbeddingClient, RAGIndexer, HybridRetriever, GDDAssembler, MarkdownWriter)
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension (CommonJS — required by VS Code API)

## Commands

```bash
npm install
npm run build          # all packages
npm run build:core     # core only
npm run lint           # ESLint (Airbnb extended, TypeScript)
npm run lint:fix       # auto-fix
cd packages/cli && node dist/index.js init
cd packages/cli && node dist/index.js generate
cd packages/mcp && node dist/index.js
```

## Non-negotiable rules

- **Offline only.** Never add `openai`, `anthropic`, `groq`, or any cloud AI SDK. A `beforeShellExecution` hook will block installs.
- **Build runs automatically.** A `PostToolUse` hook runs `npm run build` after every `.ts` edit and surfaces errors.
- `packages/vscode` stays CommonJS. All other packages are ESM.
- Import paths require `.js` extension (Node16 resolution). ESLint enforces this.

## Where things live

| Concern | File |
|---------|------|
| GDD section prompts | `packages/core/src/gdd/PromptTemplates.ts` |
| Engine profiles | `packages/core/src/engines/engineProfiles.ts` |
| Engine detection | `packages/core/src/detector/WorkspaceDetector.ts` |
| Config read/write | `packages/core/src/config/ConfigStore.ts` |

## Adding a new engine

1. Add to `ENGINE_PROFILES` in `engineProfiles.ts`
2. Add signature to `RULES` in `WorkspaceDetector.ts`
3. Add detection in `.cursor/hooks/workspace-open.js` and `.claude/skills/generate-gdd/SKILL.md`
