import { OllamaClient } from '../ollama/OllamaClient.js';
import { HybridRetriever } from '../rag/HybridRetriever.js';
import { GDD_SECTIONS, GDDInput, buildSystemPrompt } from './PromptTemplates.js';
import { getProfile } from '../engines/engineProfiles.js';
import { EngineId } from '../config/types.js';

export interface AssembleInput {
  gameName: string;
  genre: string;
  platform: string;
  concept: string;
  engine: EngineId;
  model: string;
  ollamaUrl?: string;
  retriever?: HybridRetriever;
  onSectionStart?: (key: string, title: string, index: number, total: number) => void;
  onToken?: (token: string) => void;
  onSectionEnd?: (key: string, content: string) => void;
}

export interface AssembledGDD {
  gameName: string;
  genre: string;
  platform: string;
  engine: EngineId;
  sections: Record<string, string>;
  generatedAt: string;
}

export class GDDAssembler {
  private llm: OllamaClient;

  constructor(ollamaUrl = 'http://localhost:11434') {
    this.llm = new OllamaClient(ollamaUrl);
  }

  async assemble(input: AssembleInput): Promise<AssembledGDD> {
    const engineProfile = getProfile(input.engine);
    const system = buildSystemPrompt(engineProfile);
    const sections: Record<string, string> = {};

    for (let i = 0; i < GDD_SECTIONS.length; i++) {
      const section = GDD_SECTIONS[i];
      input.onSectionStart?.(section.key, section.title, i, GDD_SECTIONS.length);

      let ragContext: string | undefined;
      if (input.retriever) {
        const query = `${section.title} for ${input.gameName} ${input.genre} game: ${input.concept}`;
        const chunks = await input.retriever.retrieve(query, 4);
        if (chunks.length > 0) {
          ragContext = chunks
            .map(c => `### From: ${c.source}${c.heading ? ` — ${c.heading}` : ''}\n${c.parentText}`)
            .join('\n\n');
        }
      }

      const gddInput: GDDInput = {
        gameName: input.gameName,
        genre: input.genre,
        platform: input.platform,
        concept: input.concept,
        engine: engineProfile,
        ragContext,
      };

      const prompt = section.prompt(gddInput);
      const content = await this.llm.generate({
        model: input.model,
        prompt,
        system,
        onToken: input.onToken,
      });

      sections[section.key] = content.trim();
      input.onSectionEnd?.(section.key, content.trim());
    }

    return {
      gameName: input.gameName,
      genre: input.genre,
      platform: input.platform,
      engine: input.engine,
      sections,
      generatedAt: new Date().toISOString(),
    };
  }
}
