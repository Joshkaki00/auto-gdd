# Contributing to auto-gdd

Thanks for your interest! auto-gdd is a local-only, offline-first tool — please keep that in mind when contributing.

## Ground rules

- **No cloud AI SDKs.** Never add `openai`, `anthropic`, `groq`, or any cloud AI dependency. Hooks will block the commit.
- **Build after every `.ts` edit.** Run `npm run build` before committing.
- **ESM everywhere** except `packages/vscode`, which must stay CommonJS.
- **Import paths need `.js` extension** (Node16 module resolution). ESLint enforces this.

## Setup

```bash
git clone https://github.com/auto-gdd/auto-gdd.git
cd auto-gdd
npm install
npm run build
npm test
```

You'll also need [Ollama](https://ollama.com) running locally to test end-to-end:

```bash
ollama pull phi4-mini
ollama pull nomic-embed-text:v1.5
```

## Development workflow

```bash
npm run build          # compile all packages
npm run lint           # ESLint (Airbnb/TypeScript)
npm run lint:fix       # auto-fix lint errors
npm test               # run Vitest unit tests
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) — a `commit-msg` hook enforces the format:

```
feat: add support for Godot 4.3 shaders
fix: correct --no-rag flag handling
chore: bump inquirer to v14
docs: update MCP setup instructions
test: add WorkspaceScanner edge cases
```

## Adding a new game engine

1. Add to `ENGINE_PROFILES` in `packages/core/src/engines/engineProfiles.ts`
2. Add a signature rule to `RULES` in `packages/core/src/detector/WorkspaceDetector.ts`
3. Add source file extensions to `ENGINE_SOURCE_EXTENSIONS` in `packages/core/src/scanner/WorkspaceScanner.ts`
4. Add a Context7 ID (if the engine has docs on Context7) to `ENGINE_CONTEXT7` in `packages/core/src/cursor/CursorScaffold.ts`
5. Add a detection test in `packages/core/src/detector/WorkspaceDetector.test.ts`

## Package layout

| Package | Purpose |
|---|---|
| `packages/core` | All shared logic — no CLI/UI deps |
| `packages/cli` | `npx auto-gdd` CLI |
| `packages/mcp` | MCP server for Cursor / Claude Desktop / Windsurf |
| `packages/vscode` | VS Code / Cursor extension |

## Releasing

Releases use [Changesets](https://github.com/changesets/changesets):

```bash
npx changeset          # describe your change
npm run version-packages   # bump versions + update CHANGELOGs
npm run release        # build + publish
```

## Questions?

Open an issue — happy to help.
