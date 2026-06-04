# Auto-GDD

> Generate professional Game Design Documents with local AI — free, offline, Obsidian-ready.

No cloud. No API keys. No subscriptions. Just Ollama running on your machine.

---

## Features

- **Local AI** — powered by Ollama (phi4-mini, qwen3, and more)
- **RAG pipeline** — ground generation in your own reference library (prior GDDs, design notes, genre wikis)
- **Workspace-aware** — auto-detects your game engine (Godot, Unreal, Unity, Phaser, Three.js, GameMaker, Bevy…) and adapts the GDD accordingly
- **Obsidian-ready** — outputs YAML frontmatter + wikilinks; works with any Markdown vault
- **Cursor scaffolding** — `init` writes `.cursor/rules/` with engine-specific context7 IDs and project context
- **Three delivery modes**: CLI · VS Code/Cursor extension · MCP server (works in Cursor chat, Claude Desktop, Windsurf)

---

## Requirements

- **Node.js ≥ 22** (Node 20 is EOL since March 2026)
- **Ollama** — [ollama.com](https://ollama.com) — Windows, macOS, Linux

---

## Quick Start

### 1. Install Ollama & pull a model

Choose based on your hardware:

| RAM    | Recommended model  | Command                    |
|--------|--------------------|----------------------------|
| 8 GB   | phi4-mini (2.5 GB) | `ollama pull phi4-mini`    |
| 16 GB  | qwen3:4b (2.9 GB)  | `ollama pull qwen3:4b`     |
| 32 GB+ | qwen3:7b (4.7 GB)  | `ollama pull qwen3:7b`     |

For RAG (optional but recommended):
```bash
ollama pull nomic-embed-text:v1.5
```

### 2. Generate your first GDD

```bash
npx auto-gdd init        # detect engine, set project config, scaffold Cursor rules
npx auto-gdd generate    # generate the GDD
```

---

## How it grounds GDDs in your actual code

When you run `auto-gdd generate`, it performs a read-only static scan of your project before calling Ollama. The scan:

1. Walks your directory tree, collecting source files for your detected engine (`.gd` for Godot, `.cs` for Unity, `.rs` for Bevy, `.ts/.js` for web engines, etc.)
2. Skips secrets, binaries, and generated dirs automatically — **no `.env`, `*.key`, `node_modules`, `Library/`, `.git/` etc. ever enter the context window**
3. Extracts a directory tree and first-25-line preview of the key source files
4. Injects this snapshot into Ollama's system prompt so every GDD section can reference real class names, file names, and existing systems

The result: mechanics sections that match what you've actually built, tech specs that name real scripts, and scope estimates grounded in code you already have.

Add a `.auto-gdd-ignore` file to exclude any additional paths (same format as `.gitignore`).

---

## CLI Reference

```bash
# Check Ollama, embedding model, and RAG index health
npx auto-gdd doctor

# Initialize workspace (detects engine, writes .auto-gdd.json + .cursor/rules/)
npx auto-gdd init

# Generate full GDD (uses .auto-gdd.json for context)
npx auto-gdd generate

# Generate with flags (no prompts)
npx auto-gdd generate --name "Neon Drift" --genre "top-down roguelite" --platform PC \
  --concept "A neon-lit car game where you collect power-ups and drift through procedural levels."

# Regenerate specific section(s) only — merges into existing GDD file
npx auto-gdd generate --section mechanics
npx auto-gdd generate --section mechanics,story

# Skip codebase scan (for empty/concept-stage projects)
npx auto-gdd generate --no-scan

# Split into separate Obsidian notes (one per section)
npx auto-gdd generate --split

# View/edit config
npx auto-gdd config
npx auto-gdd config --reset   # clear workspace config

# List available Ollama models
npx auto-gdd models
```

Valid section keys: `overview` · `core_loop` · `mechanics` · `story` · `art_direction` · `audio` · `ui_ux` · `tech_specs` · `scope`

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

The embedding model (`nomic-embed-text:v1.5`) is pinned to avoid silent vector drift. If you change the model, re-index your entire library.

### `.auto-gdd-ignore`

Create this file in your project root to exclude paths from the codebase scan (same format as `.gitignore`):

```
# Don't scan generated UI code
src/generated/
# Don't scan vendor forks
third_party/
```

Secrets, binaries, and common generated directories are always excluded regardless of this file.

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

## Cursor Scaffolding

`auto-gdd init` writes two Cursor rules into your game project:

- **`.cursor/rules/use-context7.mdc`** — pre-resolved context7 IDs for your detected engine (Godot, Unity, Unreal, Phaser, Three.js, Bevy, PixiJS, Kaplay), so any agent working in the project fetches up-to-date API docs automatically
- **`.cursor/rules/game-project.mdc`** — project context (name, engine, genre, platform, GDD path) applied to every agent session

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
| Kaboom/Kaplay | `kaboom` or `kaplay` in `package.json` |
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
npm install     # requires Node >= 22
npm run build
npm run lint
```

See `AGENTS.md` for agent/AI assistant instructions when contributing.

---

## License

MIT — free forever, no royalties, no subscriptions.
