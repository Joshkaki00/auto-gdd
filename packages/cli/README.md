# auto-gdd

> Generate professional Game Design Documents with local AI — free, offline, Obsidian-ready.

No cloud. No API keys. No subscriptions. Powered by [Ollama](https://ollama.com).

## Quick start

```bash
# Pull a model
ollama pull phi4-mini          # 8 GB RAM
ollama pull nomic-embed-text:v1.5  # for RAG (optional)

# Initialize and generate
npx auto-gdd init
npx auto-gdd generate
```

## Commands

| Command | Description |
|---------|-------------|
| `auto-gdd doctor` | Check Ollama, embedding model, and RAG index health |
| `auto-gdd init` | Detect engine, write config, scaffold Cursor rules |
| `auto-gdd generate` | Generate a full GDD |
| `auto-gdd generate --section mechanics` | Regenerate one section only |
| `auto-gdd generate --no-scan` | Skip codebase scan (empty projects) |
| `auto-gdd generate --split` | One Obsidian note per section |
| `auto-gdd rag index --source ./refs` | Index reference documents |
| `auto-gdd rag search "roguelite progression"` | Test retrieval |
| `auto-gdd config` | View/edit workspace config |
| `auto-gdd models` | List available Ollama models |

## Requirements

- Node.js ≥ 22
- [Ollama](https://ollama.com) running locally

## Full documentation

See the [auto-gdd repository](https://github.com/auto-gdd/auto-gdd) for full documentation, supported engines, MCP setup, and VS Code extension.

## License

MIT
