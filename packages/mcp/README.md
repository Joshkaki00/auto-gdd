# auto-gdd-mcp

> MCP server for [auto-gdd](https://github.com/auto-gdd/auto-gdd) — generate Game Design Documents directly from Cursor chat, Claude Desktop, or Windsurf.

No cloud. No API keys. Powered by [Ollama](https://ollama.com) running locally.

## Setup

Add to your `~/.cursor/mcp.json` (Cursor) or Claude Desktop config:

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

Then initialize your project once from the CLI:

```bash
npx auto-gdd init
```

After that, generate GDDs directly from chat:

> *"Generate a GDD for a top-down roguelite called Neon Drift on PC"*

## Available tools

| Tool | Description |
|------|-------------|
| `gdd_generate` | Generate a full GDD |
| `rag_index` | Index a reference folder |
| `rag_search` | Search the reference library |
| `rag_list` | List indexed documents |
| `models_list` | List available Ollama models |

## Requirements

- Node.js ≥ 22
- [Ollama](https://ollama.com) running locally
- `npx auto-gdd init` run in your game project at least once

## License

MIT
