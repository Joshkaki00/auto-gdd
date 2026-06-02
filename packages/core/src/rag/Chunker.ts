export interface Chunk {
  id: string;
  text: string;
  parentText?: string;
  source: string;
  heading?: string;
  index: number;
}

const CHILD_SIZE = 400;
const PARENT_SIZE = 1200;
const OVERLAP = 80;

/** Split text on markdown heading boundaries, then by size. */
export function chunkMarkdown(source: string, content: string): Chunk[] {
  const sections = splitOnHeadings(content);
  const chunks: Chunk[] = [];
  let globalIdx = 0;

  for (const section of sections) {
    const parents = slidingWindow(section.text, PARENT_SIZE, OVERLAP);
    for (const parentText of parents) {
      const children = slidingWindow(parentText, CHILD_SIZE, OVERLAP);
      for (const childText of children) {
        if (childText.trim().length < 30) continue;
        chunks.push({
          id: `${source}::${globalIdx}`,
          text: childText.trim(),
          parentText: parentText.trim(),
          source,
          heading: section.heading,
          index: globalIdx++,
        });
      }
    }
  }

  return chunks;
}

function splitOnHeadings(text: string): { heading: string; text: string }[] {
  const lines = text.split('\n');
  const sections: { heading: string; text: string }[] = [];
  let current: { heading: string; lines: string[] } = { heading: '', lines: [] };

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (current.lines.length > 0) {
        sections.push({ heading: current.heading, text: current.lines.join('\n') });
      }
      current = { heading: line.replace(/^#+\s*/, '').trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) {
    sections.push({ heading: current.heading, text: current.lines.join('\n') });
  }
  return sections.length > 0 ? sections : [{ heading: '', text: text }];
}

function slidingWindow(text: string, size: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  if (words.length <= size / 5) return [text];
  const chunks: string[] = [];
  const step = Math.max(1, Math.floor((size - overlap) / 5));
  const windowWords = Math.floor(size / 5);

  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + windowWords).join(' ');
    if (slice.trim()) chunks.push(slice);
    if (i + windowWords >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [text];
}
