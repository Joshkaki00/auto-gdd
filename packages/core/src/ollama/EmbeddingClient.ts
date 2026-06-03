import { Ollama } from 'ollama';

// nomic-embed-text uses task prefixes for optimal retrieval quality.
// https://docs.nomic.ai/reference/endpoints/nomic-embed-text
const TASK_PREFIXES: Record<string, { doc: string; query: string }> = {
  'nomic-embed-text': { doc: 'search_document: ', query: 'search_query: ' },
  'nomic-embed-text:v1.5': { doc: 'search_document: ', query: 'search_query: ' },
};

export class EmbeddingClient {
  private client: Ollama;
  private model: string;
  private prefixes: { doc: string; query: string } | undefined;

  constructor(url = 'http://localhost:11434', model = 'nomic-embed-text:v1.5') {
    this.client = new Ollama({ host: url });
    this.model = model;
    // Match by base name (strip :tag) to cover pinned + unpinned variants
    const baseName = model.split(':')[0];
    this.prefixes = TASK_PREFIXES[model] ?? TASK_PREFIXES[baseName];
  }

  async isReady(): Promise<boolean> {
    try {
      const list = await this.client.list();
      const baseName = this.model.split(':')[0];
      return list.models.some(m => m.name.startsWith(this.model) || m.name.startsWith(baseName));
    } catch {
      return false;
    }
  }

  /** Embed a document chunk for indexing (applies search_document: prefix where needed). */
  async embedDocument(text: string): Promise<number[]> {
    return this.embed(this.prefixes ? this.prefixes.doc + text : text);
  }

  /** Embed a query string for retrieval (applies search_query: prefix where needed). */
  async embedQuery(text: string): Promise<number[]> {
    return this.embed(this.prefixes ? this.prefixes.query + text : text);
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings({
      model: this.model,
      prompt: text,
    });
    return response.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
