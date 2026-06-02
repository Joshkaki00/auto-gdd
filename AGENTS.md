# auto-gdd

Free, 100% offline Game Design Document generator. Uses Ollama (local LLM + embeddings), vectra (local vector search), and outputs Obsidian-ready Markdown.

## Packages
- `packages/core` — shared logic. No CLI/UI dependencies.
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension

## Build
```bash
npm install && npm run build
npm run lint          # ESLint Airbnb/TypeScript
npm run lint:fix
```

## Run
```bash
cd packages/cli && node dist/index.js init
cd packages/cli && node dist/index.js generate
cd packages/mcp && node dist/index.js   # MCP server
```

## Hard rules
- **Never add cloud AI SDKs** (`openai`, `anthropic`, `groq`, etc.). Hooks enforce this.
- **After any `.ts` edit, run `npm run build`.** Hooks enforce this.
- `packages/vscode` is CommonJS. All others are ESM.
- Import paths need `.js` extension (Node16). ESLint enforces this.

## MCP config (Cursor / Claude Desktop)
```json
{ "mcpServers": { "auto-gdd": { "command": "npx", "args": ["auto-gdd-mcp"] } } }
```
