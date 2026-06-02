import { Ollama } from 'ollama';

export class EmbeddingClient {
  private client: Ollama;
  private model: string;

  constructor(url = 'http://localhost:11434', model = 'nomic-embed-text') {
    this.client = new Ollama({ host: url });
    this.model = model;
  }

  async isReady(): Promise<boolean> {
    try {
      const list = await this.client.list();
      return list.models.some(m => m.name.startsWith(this.model));
    } catch {
      return false;
    }
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
