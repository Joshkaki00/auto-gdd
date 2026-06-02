---
name: rag-index
description: Index a folder of reference documents into the local RAG library to ground GDD generation
---

# Index RAG Reference Library

Index a folder of Markdown or text files into the local vector store so GDD generation can retrieve relevant patterns, mechanics, and design principles from your own reference material.

## Steps

1. Ask the user which folder to index (or read `ragSourcePath` from `.auto-gdd.json` if already set)

2. Check that Ollama is running and `nomic-embed-text` is available:
   ```bash
   node packages/cli/dist/index.js models
   ```
   If `nomic-embed-text` is missing: `ollama pull nomic-embed-text`

3. Run the indexer:
   ```bash
   node packages/cli/dist/index.js rag index --source "$SOURCE_PATH"
   ```

4. After indexing, show the stats:
   ```bash
   node packages/cli/dist/index.js rag list
   ```

## Good reference material to index

- Prior GDDs (your own or public examples)
- Game design articles saved as Markdown
- Your Obsidian game design notes
- Genre/mechanic wikis exported as `.md`
- Game jam postmortems

## Notes

- Supported formats: `.md`, `.txt`, `.markdown`
- Vectors stored in `.auto-gdd-vectors/` (ignored by git via `.gitignore`)
- Re-indexing the same file updates it; does not duplicate
- Clear with: `node packages/cli/dist/index.js rag clear`
