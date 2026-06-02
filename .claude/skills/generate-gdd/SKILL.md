---
name: generate-gdd
description: Generate a Game Design Document for the current game project using auto-gdd CLI
---

# Generate GDD

Generate a full Game Design Document for the game project in the current workspace.

## Steps

1. Check if `.auto-gdd.json` exists in the workspace root
   - If not, run `node packages/cli/dist/index.js init` (or `npx auto-gdd init` if installed globally) to detect the engine and set project config
   - If yes, read it to confirm the game name, engine, genre, and platform

2. Confirm with the user:
   - Game name
   - Genre
   - Target platform
   - A 2–4 sentence concept description (ask if not already in context)

3. Check that Ollama is running:
   ```bash
   node packages/cli/dist/index.js models
   ```
   If not running, tell the user: `ollama serve` — then wait.

4. Run GDD generation:
   ```bash
   node packages/cli/dist/index.js generate --name "$NAME" --genre "$GENRE" --platform "$PLATFORM" --concept "$CONCEPT"
   ```
   Add `--split` if the user wants separate Obsidian notes per section.

5. After generation, open the output file and show the user the path.

6. Optionally: invoke the `gdd-reviewer` subagent to check the generated GDD for completeness.

## Notes

- If RAG is set up (`ragSourcePath` in `.auto-gdd.json`), generation automatically retrieves relevant context
- Output goes to `outputPath` from `.auto-gdd.json` (default: `./gdd`)
- Model is auto-selected from `.auto-gdd.json` or global config (`~/.auto-gdd/config.json`)
- Supported engines: Godot 4, Unreal Engine 5, Unity 6, Phaser 4, Three.js, GameMaker, Bevy, Kaboom.js, PixiJS, Construct 3, Cocos Creator
