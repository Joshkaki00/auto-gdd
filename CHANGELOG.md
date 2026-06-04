# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `WorkspaceScanner` — read-only, deterministic codebase scanner that grounds GDD generation in actual project structure (denies binaries, secrets, and generated directories)
- `CursorScaffold` — generates Cursor rules with Context7 library IDs for game engines
- `auto-gdd doctor` command — checks Ollama, model availability, RAG index health, and config validity
- `--section` flag on `generate` — regenerate specific GDD sections in-place without overwriting the rest
- `--no-scan` flag on `generate` — skip codebase scanning for empty/new projects
- Streaming token output in CLI and MCP `gdd_generate` tool
- MCP `server/discover` handler for 2026-07-28 spec compatibility
- `EmbeddingClient.embedDocument()` / `embedQuery()` with nomic task-prefix support
- Hybrid RAG retrieval (vector + BM25) with cross-encoder reranking
- Vitest unit test suite (47 tests across 5 modules)
- GitHub Actions CI (build · lint · test) and publish (OIDC provenance on tag) workflows

### Changed
- Default embedding model changed from `nomic-embed-text` to `nomic-embed-text:v1.5`
- `CLAUDE.md` is no longer overwritten on `init` re-runs
- `--concept` flag now skips the interactive prompt when provided
- Improved Ollama-offline error message includes install link (`https://ollama.com`)
- Node.js minimum requirement raised to `>=22.0.0`

### Fixed
- `--no-rag` and `--no-scan` commander.js negatable options were silently ignored
- `MarkdownWriter` split-sections mode failed on Windows when section titles contained `/`
- `vectra@0.15` `queryItems` API breaking change (second argument is now the query string)
- `inquirer` upgraded from `^10.0.0` to `^14.0.2` (patched path-traversal CVE)

## [0.1.0] — 2026-06-01

### Added
- Initial release: `@auto-gdd/core`, `auto-gdd` (CLI), `auto-gdd-mcp` (MCP server), `auto-gdd-vscode` (VS Code/Cursor extension)
- Ollama integration with `phi4-mini` default model
- Local RAG pipeline using `vectra` and `nomic-embed-text`
- Obsidian-ready Markdown output with YAML frontmatter
- Game engine auto-detection (Godot, Unity, Unreal, Phaser, Bevy, and more)
- Project-scoped config (`.auto-gdd.json`) with global fallback (`~/.auto-gdd/config.json`)
- Cursor rules scaffold with Context7 library IDs
- Claude Code integration (`CLAUDE.md`, `.claude/settings.json`, skills, agents)

[Unreleased]: https://github.com/your-org/auto-gdd/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/auto-gdd/releases/tag/v0.1.0
