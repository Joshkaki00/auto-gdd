# auto-gdd

Free, 100% offline Game Design Document generator. Uses Ollama (local LLM + embeddings), vectra (local vector search), and outputs Obsidian-ready Markdown.

## Requirements

- Node.js **≥ 22** (Node 20 EOL since March 2026)
- Ollama running locally

## Packages
- `packages/core` — shared logic. No CLI/UI dependencies.
- `packages/cli` — `npx auto-gdd` terminal interface
- `packages/mcp` — MCP server (Stdio) for Cursor/Claude/Windsurf
- `packages/vscode` — VS Code/Cursor extension

## Build
```bash
npm install && npm run build
npm run lint          # ESLint Airbnb/TypeScript flat config
npm run lint:fix
```

## Run
```bash
cd packages/cli && node dist/index.js doctor      # health check
cd packages/cli && node dist/index.js init        # detect engine, write config + Cursor rules
cd packages/cli && node dist/index.js generate    # full GDD
cd packages/cli && node dist/index.js generate --section mechanics  # single section
cd packages/mcp && node dist/index.js             # MCP server (Stdio)
```

## Key dependencies (pinned versions)
| Package | Version | Notes |
|---------|---------|-------|
| `ollama` (JS SDK) | `^0.6.3` | Streaming fix in 0.6.1 |
| `vectra` | `^0.15.0` | `queryItems(vec, query, k)` — query string is now required |
| `commander` | `^14.0.3` | v12 is EOL |
| `inquirer` | `^14.0.2` | Fixes high-severity `tmp` CVE from v10 |
| `@modelcontextprotocol/sdk` | `^1.29.0` | v1.x is production-stable; v2 alpha not ready |
| `zod` | `^4.4.3` | Used in MCP server for `server/discover` schema |

## Hard rules
- **Never add cloud AI SDKs** (`openai`, `anthropic`, `groq`, etc.). Hooks enforce this.
- **After any `.ts` edit, run `npm run build`.** Hooks enforce this.
- `packages/vscode` is CommonJS. All others are ESM.
- Import paths need `.js` extension (Node16 resolution). ESLint enforces this.

## MCP config (Cursor / Claude Desktop)
```json
{ "mcpServers": { "auto-gdd": { "command": "npx", "args": ["auto-gdd-mcp"] } } }
```

## Upcoming
- `TODO(2026-07-28)` in `packages/mcp/src/index.ts` — bump `@modelcontextprotocol/sdk` and replace hand-rolled `ServerDiscoverRequestSchema` once Tier-1 SDK ships 2026-07-28 spec support.
