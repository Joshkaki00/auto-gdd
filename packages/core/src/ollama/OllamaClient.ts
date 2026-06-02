import { Ollama } from 'ollama';

export interface GenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  ollamaUrl?: string;
  temperature?: number;
  onToken?: (token: string) => void;
}

export interface ModelInfo {
  name: string;
  size: number;
  parameterSize?: string;
}

export class OllamaClient {
  private client: Ollama;

  constructor(url = 'http://localhost:11434') {
    this.client = new Ollama({ host: url });
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const stream = await this.client.generate({
      model: opts.model,
      prompt: opts.prompt,
      system: opts.system,
      stream: true,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_ctx: 8192,
      },
    });

    let full = '';
    for await (const chunk of stream) {
      full += chunk.response;
      opts.onToken?.(chunk.response);
    }
    return full;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await this.client.list();
      return res.models.map(m => ({
        name: m.name,
        size: m.size,
        parameterSize: (m.details as { parameter_size?: string } | undefined)?.parameter_size,
      }));
    } catch {
      return [];
    }
  }

  async isRunning(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(m => m.name === modelName || m.name.startsWith(modelName.split(':')[0]));
  }

  /** Recommend a model based on rough available memory heuristic */
  static recommendModel(availableGb?: number): string {
    const gb = availableGb ?? 8;
    if (gb >= 32) return 'qwen3:7b';
    if (gb >= 16) return 'qwen3:4b';
    return 'phi4-mini';
  }
}
