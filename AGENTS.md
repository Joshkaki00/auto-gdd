# auto-gdd — Agent Instructions

## What this project is
A free, fully local Game Design Document generator. Uses Ollama for LLM + embeddings, vectra for local vector search, and outputs Obsidian-ready Markdown. Ships as a CLI, MCP server, and VS Code extension.

## Monorepo structure
- `packages/core` — all shared logic (no CLI/UI dependencies)
- `packages/cli` — terminal interface (`npx auto-gdd`)
- `packages/mcp` — MCP server for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension

## Key rules
- All packages use TypeScript. Import with `.js` extensions (Node16 resolution).
- `packages/vscode` uses CommonJS (`"module": "CommonJS"` in tsconfig). All others are ESM.
- Never add cloud API calls. Everything must work 100% offline after install.
- Engine detection is in `WorkspaceDetector.ts`. Config is in `ConfigStore.ts`. Workspace config file is `.auto-gdd.json`.
- GDD section prompts live in `PromptTemplates.ts`. Each section is a `SectionPrompt` object.
- RAG uses `vectra` (file-based vector store). No ChromaDB server required.

## Build
```bash
npm install
npm run build          # builds all packages
npm run build:core     # core only
npm run build:cli      # cli only
```

## Run CLI locally
```bash
cd packages/cli
node dist/index.js init
node dist/index.js generate
node dist/index.js models
```

## Run MCP server locally
```bash
cd packages/mcp
node dist/index.js
```

## Add to Cursor mcp.json
```json
{
  "mcpServers": {
    "auto-gdd": {
      "command": "npx",
      "args": ["auto-gdd-mcp"]
    }
  }
}
```
