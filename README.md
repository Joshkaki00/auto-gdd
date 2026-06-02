# Auto-GDD

> Generate professional Game Design Documents with local AI — free, offline, Obsidian-ready.

No cloud. No API keys. No subscriptions. Just Ollama running on your machine.

---

## Features

- **Local AI** — powered by Ollama (phi4-mini, qwen3, and more)
- **RAG pipeline** — ground generation in your own reference library (prior GDDs, design notes, genre wikis)
- **Workspace-aware** — auto-detects your game engine (Godot, Unreal, Unity, Phaser, Three.js, GameMaker, Bevy…) and adapts the GDD accordingly
- **Obsidian-ready** — outputs YAML frontmatter + wikilinks; works with any Markdown vault
- **Three delivery modes**: CLI · VS Code/Cursor extension · MCP server (works in Cursor chat, Claude Desktop, Windsurf)

---

## Quick Start

### 1. Install Ollama

[ollama.com](https://ollama.com) — available for Windows, macOS, Linux.

### 2. Pull a model

Choose based on your hardware:

| RAM      | Recommended model         | Command                        |
|----------|---------------------------|--------------------------------|
| 8 GB     | phi4-mini (2.5 GB)        | `ollama pull phi4-mini`        |
| 16 GB    | qwen3:4b (2.9 GB)         | `ollama pull qwen3:4b`         |
| 32 GB+   | qwen3:7b (4.7 GB)         | `ollama pull qwen3:7b`         |

For RAG (optional but recommended):
```bash
ollama pull nomic-embed-text
```

### 3. Generate your first GDD

```bash
npx auto-gdd init        # detect engine, set project config
npx auto-gdd generate    # generate the GDD
```

---

## CLI Usage

```bash
# Initialize workspace (detects engine, writes .auto-gdd.json)
npx auto-gdd init

# Generate GDD (uses .auto-gdd.json for context)
npx auto-gdd generate

# Generate with flags (no prompts)
npx auto-gdd generate --name "Neon Drift" --genre "top-down roguelite" --platform PC --concept "A neon-lit car game where you collect power-ups and drift through procedural levels."

# Split into separate Obsidian notes (one per section)
npx auto-gdd generate --split

# View/edit config
npx auto-gdd config
npx auto-gdd config --reset   # clear workspace config

# List available Ollama models
npx auto-gdd models
```

---

## RAG Reference Library

Feed in your own reference material to ground GDD generation:

```bash
# Index a folder of Markdown notes, GDDs, or design articles
npx auto-gdd rag index --source ~/vault/game-design

# List indexed documents
npx auto-gdd rag list

# Test retrieval
npx auto-gdd rag search "roguelite progression systems"

# Clear the index
npx auto-gdd rag clear
```

Good reference sources:
- Your own prior GDDs
- Obsidian game design notes
- Exported genre wikis (e.g. TV Tropes pages as Markdown)
- Game design articles (saved as `.md`)

---

## Cursor / Claude Desktop (MCP)

Add to your `~/.cursor/mcp.json` or Claude Desktop config:

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

Then just type in Cursor chat:

> *"Generate a GDD for a top-down roguelite called Neon Drift on PC"*

The MCP server reads `.auto-gdd.json` from your current directory automatically — it already knows your engine, game name, and vault path.

**Available MCP tools:**
| Tool | Description |
|------|-------------|
| `gdd_generate` | Generate a full GDD |
| `rag_index` | Index a reference folder |
| `rag_search` | Search the reference library |
| `rag_list` | List indexed documents |
| `models_list` | List available Ollama models |

---

## Workspace Config (`.auto-gdd.json`)

Auto-GDD writes a `.auto-gdd.json` file to your project root. Commit it alongside your game project — it persists your context across every tool.

```json
{
  "engine": "godot",
  "gameName": "Neon Drift",
  "genre": "top-down roguelite",
  "platform": "PC",
  "outputPath": "./gdd",
  "ragSourcePath": "./references"
}
```

Edit it directly or run `npx auto-gdd config` to update it interactively.

---

## Supported Engines

Auto-detected from workspace signature files:

| Engine | Detected by |
|--------|-------------|
| Godot 4 | `project.godot` |
| Unreal Engine 5 | `*.uproject` |
| Unity 6 | `Assets/` + `ProjectSettings/` |
| Phaser 4 | `phaser` in `package.json` |
| Three.js | `three` in `package.json` |
| GameMaker | `*.yyp` / `*.gmx` |
| Bevy | `bevy` in `Cargo.toml` |
| Kaboom.js | `kaboom` in `package.json` |
| PixiJS | `pixi.js` in `package.json` |
| Construct 3 | `*.c3p` |
| Cocos Creator | `assets/` + `project.json` |

---

## GDD Sections Generated

1. Game Overview (tagline, USP, comparable titles)
2. Core Gameplay Loop (primary/session/meta loops)
3. Core Mechanics (movement, combat, progression, economy)
4. Story & Characters (premise, arcs, world, story beats)
5. Art Direction (visual style, color palette, references)
6. Audio Design (music, SFX, voice acting)
7. UI / UX (HUD, menus, accessibility, onboarding)
8. Technical Specifications (engine-specific, asset pipeline, deploy)
9. Scope & Milestones (MVP, risks, milestone table)

---

## Development

```bash
git clone <repo>
cd auto-gdd
npm install
npm run build
```

See `AGENTS.md` for agent/AI assistant instructions when contributing.

---

## License

MIT — free forever, no royalties, no subscriptions.
