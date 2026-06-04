import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarkdownWriter } from './MarkdownWriter.js';
import type { AssembledGDD } from './GDDAssembler.js';
import { GDD_SECTIONS } from './PromptTemplates.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-gdd-writer-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeGDD(overrides: Partial<AssembledGDD> = {}): AssembledGDD {
  const sections: Record<string, string> = {};
  for (const s of GDD_SECTIONS) {
    sections[s.key] = `Content for ${s.title}`;
  }
  return {
    gameName: 'Test Game',
    genre: 'Action',
    platform: 'PC',
    engine: 'unknown',
    generatedAt: '2026-06-04T00:00:00.000Z',
    sections,
    ...overrides,
  };
}

describe('MarkdownWriter – write (single file)', () => {
  it('creates the GDD markdown file', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD(), { outputDir: tmpDir });

    expect(fs.existsSync(result.mainFile)).toBe(true);
    expect(result.sectionFiles).toHaveLength(0);
  });

  it('includes YAML frontmatter', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD(), { outputDir: tmpDir });
    const content = fs.readFileSync(result.mainFile, 'utf-8');

    expect(content).toContain('---');
    expect(content).toContain('title: "Test Game - GDD"');
    expect(content).toContain('game: "Test Game"');
    expect(content).toContain('genre: "Action"');
    expect(content).toContain('status: draft');
  });

  it('includes all GDD section headings', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD(), { outputDir: tmpDir });
    const content = fs.readFileSync(result.mainFile, 'utf-8');

    for (const section of GDD_SECTIONS) {
      expect(content).toContain(`## ${section.title}`);
    }
  });

  it('sanitizes game name for filename', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD({ gameName: 'My: Game!' }), { outputDir: tmpDir });

    expect(path.basename(result.mainFile)).toMatch(/^My-Game/);
  });
});

describe('MarkdownWriter – write (split sections)', () => {
  it('creates separate section files with wikilinks', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD(), {
      outputDir: tmpDir,
      splitSections: true,
    });

    expect(result.sectionFiles.length).toBe(GDD_SECTIONS.length);
    const mainContent = fs.readFileSync(result.mainFile, 'utf-8');
    expect(mainContent).toContain('![[');
  });

  it('each section file contains YAML frontmatter and content', () => {
    const writer = new MarkdownWriter();
    const result = writer.write(makeGDD(), {
      outputDir: tmpDir,
      splitSections: true,
    });

    const firstSection = fs.readFileSync(result.sectionFiles[0], 'utf-8');
    expect(firstSection).toContain('---');
    expect(firstSection).toContain('parent:');
  });
});

describe('MarkdownWriter – mergeIntoExisting', () => {
  it('replaces only the targeted section, leaving others intact', () => {
    const writer = new MarkdownWriter();
    const gdd = makeGDD();
    writer.write(gdd, { outputDir: tmpDir });

    const mainFile = path.join(tmpDir, 'Test-Game - GDD.md');
    const originalContent = fs.readFileSync(mainFile, 'utf-8');
    expect(originalContent).toContain('Content for Game Overview');

    gdd.sections.overview = 'Updated overview content';
    writer.write(gdd, { outputDir: tmpDir, sectionFilter: ['overview'] });

    const updated = fs.readFileSync(mainFile, 'utf-8');
    expect(updated).toContain('Updated overview content');

    const secondSection = GDD_SECTIONS[1];
    if (secondSection) {
      expect(updated).toContain(`Content for ${secondSection.title}`);
    }
  });

  it('falls back to full write when file does not exist yet', () => {
    const writer = new MarkdownWriter();
    const gdd = makeGDD();

    const result = writer.write(gdd, {
      outputDir: tmpDir,
      sectionFilter: ['overview'],
    });

    expect(fs.existsSync(result.mainFile)).toBe(true);
  });
});
