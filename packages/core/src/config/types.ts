export type EngineId =
  | 'godot'
  | 'unreal'
  | 'unity'
  | 'phaser'
  | 'threejs'
  | 'gamemaker'
  | 'bevy'
  | 'kaboom'
  | 'pixi'
  | 'construct'
  | 'cocos'
  | 'custom'
  | 'unknown';

export interface GlobalConfig {
  ollamaUrl: string;
  model: string;
  embeddingModel: string;
  vectorStorePath: string;
}

export interface WorkspaceConfig {
  gameName?: string;
  genre?: string;
  platform?: string;
  engine?: EngineId;
  engineVersion?: string;
  outputPath?: string;
  ragSourcePath?: string;
  model?: string;
  vaultPath?: string;
}

export interface ResolvedConfig {
  ollamaUrl: string;
  model: string;
  embeddingModel: string;
  vectorStorePath: string;
  gameName?: string;
  genre?: string;
  platform?: string;
  engine?: EngineId;
  engineVersion?: string;
  outputPath?: string;
  ragSourcePath?: string;
  vaultPath?: string;
  workspaceRoot: string;
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'phi4-mini',
  embeddingModel: 'nomic-embed-text',
  vectorStorePath: '',
};
