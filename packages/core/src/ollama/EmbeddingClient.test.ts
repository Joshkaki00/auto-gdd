import { describe, expect, it, vi } from 'vitest';
import { EmbeddingClient } from './EmbeddingClient.js';

const FAKE_VEC = [0.1, 0.2, 0.3];

describe('EmbeddingClient – task prefixes', () => {
  it('prepends search_document: for nomic-embed-text:v1.5 document embedding', async () => {
    const client = new EmbeddingClient('http://localhost:11434', 'nomic-embed-text:v1.5');
    const spy = vi.spyOn(client, 'embed').mockResolvedValue(FAKE_VEC);

    await client.embedDocument('hello world');

    expect(spy).toHaveBeenCalledWith('search_document: hello world');
  });

  it('prepends search_query: for nomic-embed-text:v1.5 query embedding', async () => {
    const client = new EmbeddingClient('http://localhost:11434', 'nomic-embed-text:v1.5');
    const spy = vi.spyOn(client, 'embed').mockResolvedValue(FAKE_VEC);

    await client.embedQuery('find enemies');

    expect(spy).toHaveBeenCalledWith('search_query: find enemies');
  });

  it('prepends prefix for unpinned nomic-embed-text (base name match)', async () => {
    const client = new EmbeddingClient('http://localhost:11434', 'nomic-embed-text');
    const spy = vi.spyOn(client, 'embed').mockResolvedValue(FAKE_VEC);

    await client.embedDocument('test doc');

    expect(spy).toHaveBeenCalledWith('search_document: test doc');
  });

  it('sends raw text when model does not have a known prefix', async () => {
    const client = new EmbeddingClient('http://localhost:11434', 'mxbai-embed-large');
    const spy = vi.spyOn(client, 'embed').mockResolvedValue(FAKE_VEC);

    await client.embedDocument('raw doc');

    expect(spy).toHaveBeenCalledWith('raw doc');
  });

  it('returns the vector from embed()', async () => {
    const client = new EmbeddingClient('http://localhost:11434', 'nomic-embed-text:v1.5');
    vi.spyOn(client, 'embed').mockResolvedValue(FAKE_VEC);

    const result = await client.embedQuery('test');
    expect(result).toEqual(FAKE_VEC);
  });
});

describe('EmbeddingClient – cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const client = new EmbeddingClient();
    const v = [1, 0, 0];
    expect(client.cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const client = new EmbeddingClient();
    expect(client.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it('returns 0 for zero vectors', () => {
    const client = new EmbeddingClient();
    expect(client.cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('returns a value between -1 and 1', () => {
    const client = new EmbeddingClient();
    const a = [0.5, 0.3, -0.2];
    const b = [0.1, 0.8, 0.4];
    const sim = client.cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});
