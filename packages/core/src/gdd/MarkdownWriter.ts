import fs from 'node:fs';
import path from 'node:path';
import { AssembledGDD } from './GDDAssembler.js';
import { GDD_SECTIONS } from './PromptTemplates.js';
import { getProfile } from '../engines/engineProfiles.js';

export interface WriteOptions {
  outputDir: string;
  splitSections?: boolean;
  /** When provided, only update these sections in an already-existing GDD file. */
  sectionFilter?: string[];
}

export interface WriteResult {
  mainFile: string;
  sectionFiles: string[];
}

function sanitize(name: string): string {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function frontmatter(gdd: AssembledGDD): string {
  const engine = getProfile(gdd.engine);
  return [
    '---',
    `title: "${gdd.gameName} - GDD"`,
    `game: "${gdd.gameName}"`,
    `genre: "${gdd.genre}"`,
    `platform: "${gdd.platform}"`,
    `engine: "${engine.displayName}"`,
    `tags: [gdd, game-design, ${gdd.genre.toLowerCase().replace(/\s+/g, '-')}, ${gdd.engine}]`,
    `created: "${gdd.generatedAt.split('T')[0]}"`,
    'status: draft',
    '---',
    '',
  ].join('\n');
}

export class MarkdownWriter {
  /**
   * When sectionFilter is set and the GDD file already exists, only replace the
   * content of those sections in-place rather than rewriting the whole document.
   */
  write(gdd: AssembledGDD, opts: WriteOptions): WriteResult {
    fs.mkdirSync(opts.outputDir, { recursive: true });

    const baseName = sanitize(gdd.gameName);
    const mainFile = path.join(opts.outputDir, `${baseName} - GDD.md`);

    if (opts.sectionFilter && opts.sectionFilter.length > 0 && fs.existsSync(mainFile)) {
      return this.mergeIntoExisting(gdd, opts.sectionFilter, mainFile);
    }

    const sectionFiles: string[] = [];

    // Build full GDD as single file
    const lines: string[] = [
      frontmatter(gdd),
      `# ${gdd.gameName} — Game Design Document`,
      '',
      `> **Genre:** ${gdd.genre} | **Platform:** ${gdd.platform} | **Engine:** ${getProfile(gdd.engine).displayName}`,
      '',
      '## Table of Contents',
      '',
    ];

    for (const section of GDD_SECTIONS) {
      if (opts.splitSections) {
        lines.push(`- [[${baseName} - ${section.title}]]`);
      } else {
        lines.push(`- [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of GDD_SECTIONS) {
      const content = gdd.sections[section.key] ?? '';

      if (opts.splitSections) {
        // Write each section as its own file
        const sectionFileName = `${baseName} - ${section.title}.md`;
        const sectionPath = path.join(opts.outputDir, sectionFileName);
        const sectionLines = [
          `---`,
          `title: "${gdd.gameName} - ${section.title}"`,
          `tags: [gdd, game-design, ${gdd.engine}]`,
          `created: "${gdd.generatedAt.split('T')[0]}"`,
          `parent: "[[${baseName} - GDD]]"`,
          `---`,
          '',
          `# ${section.title}`,
          '',
          content,
          '',
          `---`,
          `*Part of [[${baseName} - GDD]]*`,
          '',
        ].join('\n');

        fs.writeFileSync(sectionPath, sectionLines, 'utf-8');
        sectionFiles.push(sectionPath);

        // Add wikilink reference in main file
        lines.push(`## ${section.title}`);
        lines.push('');
        lines.push(`![[${baseName} - ${section.title}]]`);
        lines.push('');
      } else {
        lines.push(`## ${section.title}`);
        lines.push('');
        lines.push(content);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    fs.writeFileSync(mainFile, lines.join('\n'), 'utf-8');

    return { mainFile, sectionFiles };
  }

  private mergeIntoExisting(
    gdd: AssembledGDD,
    sectionFilter: string[],
    mainFile: string,
  ): WriteResult {
    let doc = fs.readFileSync(mainFile, 'utf-8');

    for (const key of sectionFilter) {
      const section = GDD_SECTIONS.find(s => s.key === key);
      if (!section || !gdd.sections[key]) continue;

      const newContent = gdd.sections[key];
      const heading = `## ${section.title}`;

      // Replace everything between "## Title\n" and the next "---\n" or end-of-file
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `(${escapedHeading}\\n\\n?)([\\s\\S]*?)(?=\\n---\\n|\\n## |$)`,
        'g',
      );

      if (pattern.test(doc)) {
        doc = doc.replace(
          new RegExp(`(${escapedHeading}\\n\\n?)([\\s\\S]*?)(?=\\n---\\n|\\n## |$)`, 'g'),
          `${heading}\n\n${newContent}\n\n`,
        );
      }
    }

    fs.writeFileSync(mainFile, doc, 'utf-8');
    return { mainFile, sectionFiles: [] };
  }
}
