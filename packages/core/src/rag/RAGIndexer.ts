import fs from 'node:fs';
import path from 'node:path';
import { LocalIndex } from 'vectra';
import { EmbeddingClient } from '../ollama/EmbeddingClient.js';
import { chunkMarkdown } from './Chunker.js';

export interface IndexedDoc {
  source: string;
  chunkCount: number;
  indexedAt: string;
}

export interface IndexStats {
  totalChunks: number;
  documents: IndexedDoc[];
}

export class RAGIndexer {
  private index: LocalIndex;
  private embedder: EmbeddingClient;
  private statsFile: string;

  constructor(vectorStorePath: string, embedder: EmbeddingClient) {
    this.index = new LocalIndex(vectorStorePath);
    this.embedder = embedder;
    this.statsFile = path.join(vectorStorePath, 'stats.json');
  }

  async init(): Promise<void> {
    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
    }
  }

  async indexDirectory(dirPath: string, onProgress?: (file: string, i: number, total: number) => void): Promise<IndexedDoc[]> {
    await this.init();
    const files = this.collectFiles(dirPath);
    const docs: IndexedDoc[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(file, i, files.length);
      const doc = await this.indexFile(file);
      if (doc) docs.push(doc);
    }

    this.updateStats(docs);
    return docs;
  }

  async indexFile(filePath: string): Promise<IndexedDoc | null> {
    await this.init();
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = chunkMarkdown(filePath, content);
      if (chunks.length === 0) return null;

      const vectors = await Promise.all(chunks.map(c => this.embedder.embedDocument(c.text)));

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await this.index.insertItem({
          vector: vectors[i],
          metadata: {
            text: chunk.text,
            parentText: chunk.parentText ?? chunk.text,
            source: chunk.source,
            heading: chunk.heading ?? '',
            index: String(chunk.index),
          },
        });
      }

      return {
        source: filePath,
        chunkCount: chunks.length,
        indexedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`Failed to index ${filePath}:`, err);
      return null;
    }
  }

  async clear(): Promise<void> {
    if (await this.index.isIndexCreated()) {
      await this.index.deleteIndex();
    }
    if (fs.existsSync(this.statsFile)) {
      fs.unlinkSync(this.statsFile);
    }
  }

  readStats(): IndexStats {
    try {
      if (!fs.existsSync(this.statsFile)) return { totalChunks: 0, documents: [] };
      return JSON.parse(fs.readFileSync(this.statsFile, 'utf-8')) as IndexStats;
    } catch {
      return { totalChunks: 0, documents: [] };
    }
  }

  private updateStats(newDocs: IndexedDoc[]): void {
    const stats = this.readStats();
    for (const doc of newDocs) {
      const existing = stats.documents.findIndex(d => d.source === doc.source);
      if (existing >= 0) {
        stats.documents[existing] = doc;
      } else {
        stats.documents.push(doc);
      }
    }
    stats.totalChunks = stats.documents.reduce((sum, d) => sum + d.chunkCount, 0);
    fs.mkdirSync(path.dirname(this.statsFile), { recursive: true });
    fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2), 'utf-8');
  }

  private collectFiles(dir: string): string[] {
    const SUPPORTED = ['.md', '.txt', '.markdown'];
    const results: string[] = [];
    const walk = (current: string) => {
      try {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            walk(full);
          } else if (entry.isFile() && SUPPORTED.includes(path.extname(entry.name).toLowerCase())) {
            results.push(full);
          }
        }
      } catch { /* skip unreadable dirs */ }
    };
    walk(dir);
    return results;
  }

  get rawIndex(): LocalIndex {
    return this.index;
  }
}
