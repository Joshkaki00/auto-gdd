import { LocalIndex, QueryResult, MetadataTypes } from 'vectra';
import { EmbeddingClient } from '../ollama/EmbeddingClient.js';

export interface RetrievedChunk {
  text: string;
  parentText: string;
  source: string;
  heading: string;
  score: number;
}

type ChunkMeta = Record<string, MetadataTypes>;

function getMeta(metadata: ChunkMeta, key: string): string {
  const val = metadata[key];
  return typeof val === 'string' ? val : '';
}

export class HybridRetriever {
  private index: LocalIndex;
  private embedder: EmbeddingClient;

  constructor(index: LocalIndex, embedder: EmbeddingClient) {
    this.index = index;
    this.embedder = embedder;
  }

  async retrieve(query: string, topK = 5): Promise<RetrievedChunk[]> {
    if (!(await this.index.isIndexCreated())) return [];

    const queryVec = await this.embedder.embed(query);

    const vectorResults = await this.vectorSearch(queryVec, query, topK * 4);
    const bm25Results = await this.bm25Search(query, topK * 4);

    const fused = this.reciprocalRankFusion(vectorResults, bm25Results);
    const top = fused.slice(0, topK * 2);

    const reranked = await this.rerank(query, top, queryVec);
    return reranked.slice(0, topK);
  }

  private async vectorSearch(queryVec: number[], query: string, k: number): Promise<RetrievedChunk[]> {
    try {
      const results: QueryResult<ChunkMeta>[] = await this.index.queryItems(queryVec, query, k);
      return results.map(r => ({
        text: getMeta(r.item.metadata, 'text'),
        parentText: getMeta(r.item.metadata, 'parentText'),
        source: getMeta(r.item.metadata, 'source'),
        heading: getMeta(r.item.metadata, 'heading'),
        score: r.score,
      }));
    } catch {
      return [];
    }
  }

  private async bm25Search(query: string, k: number): Promise<RetrievedChunk[]> {
    try {
      const allItems = await this.index.listItems<ChunkMeta>();
      const queryTokens = this.tokenize(query);
      if (queryTokens.length === 0 || allItems.length === 0) return [];

      const corpus = allItems.map(item => ({
        chunk: {
          text: getMeta(item.metadata, 'text'),
          parentText: getMeta(item.metadata, 'parentText'),
          source: getMeta(item.metadata, 'source'),
          heading: getMeta(item.metadata, 'heading'),
          score: 0,
        },
        tokens: this.tokenize(getMeta(item.metadata, 'text')),
      }));

      const avgDocLen = corpus.reduce((s, d) => s + d.tokens.length, 0) / corpus.length;
      const k1 = 1.5;
      const b = 0.75;
      const scores: { chunk: RetrievedChunk; score: number }[] = [];

      for (const doc of corpus) {
        let score = 0;
        for (const term of queryTokens) {
          const tf = doc.tokens.filter(t => t === term).length;
          if (tf === 0) continue;
          const df = corpus.filter(d => d.tokens.includes(term)).length;
          const idf = Math.log((corpus.length - df + 0.5) / (df + 0.5) + 1);
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc.tokens.length / avgDocLen))));
        }
        if (score > 0) scores.push({ chunk: doc.chunk, score });
      }

      scores.sort((x, y) => y.score - x.score);
      return scores.slice(0, k).map(s => ({ ...s.chunk, score: s.score }));
    } catch {
      return [];
    }
  }

  private reciprocalRankFusion(listA: RetrievedChunk[], listB: RetrievedChunk[], k = 60): RetrievedChunk[] {
    const scores = new Map<string, { chunk: RetrievedChunk; score: number }>();

    const add = (list: RetrievedChunk[]) => {
      list.forEach((chunk, rank) => {
        const key = chunk.source + '::' + chunk.text.slice(0, 80);
        const prev = scores.get(key);
        const delta = 1 / (k + rank + 1);
        if (prev) { prev.score += delta; } else { scores.set(key, { chunk, score: delta }); }
      });
    };

    add(listA);
    add(listB);
    return [...scores.values()].sort((a, b) => b.score - a.score).map(v => ({ ...v.chunk, score: v.score }));
  }

  private async rerank(query: string, candidates: RetrievedChunk[], queryVec: number[]): Promise<RetrievedChunk[]> {
    const scored = await Promise.all(
      candidates.map(async c => {
        const vec = await this.embedder.embed(c.parentText || c.text);
        return { ...c, score: this.embedder.cosineSimilarity(queryVec, vec) };
      }),
    );
    return scored.sort((a, b) => b.score - a.score);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  }
}
