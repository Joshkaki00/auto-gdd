Check the health of the RAG reference library.

Steps:

1. **Index stats**
   ```
   node packages/cli/dist/index.js rag list
   ```
   Report: number of documents, total chunks, oldest/newest indexed date.

2. **Embedding model check**
   ```
   node packages/cli/dist/index.js models
   ```
   Confirm `nomic-embed-text` is available. If not, tell the user to run `ollama pull nomic-embed-text`.

3. **Smoke test** — run a sample search to confirm retrieval is working:
   ```
   node packages/cli/dist/index.js rag search "core game loop mechanics"
   ```
   If results look relevant, the index is healthy.
   If results are empty or garbled, suggest re-indexing: `node packages/cli/dist/index.js rag index`.

4. **Config check** — read `.auto-gdd.json` and confirm `ragSourcePath` and `vectorStorePath` are set.
   If `ragSourcePath` is empty, remind the user to index a reference folder first.
