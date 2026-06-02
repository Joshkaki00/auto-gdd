import { EngineId } from '../config/types.js';

export interface EngineProfile {
  id: EngineId;
  displayName: string;
  language: string[];
  defaultPlatforms: string[];
  keyPatterns: string[];
  techSpecHints: string;
  mechanicsVocabulary: string;
}

export const ENGINE_PROFILES: Record<EngineId, EngineProfile> = {
  godot: {
    id: 'godot',
    displayName: 'Godot 4',
    language: ['GDScript', 'C#'],
    defaultPlatforms: ['Windows', 'macOS', 'Linux', 'Web', 'Android', 'iOS'],
    keyPatterns: ['Scenes', 'Nodes', 'Signals', 'Resources', 'Autoloads'],
    techSpecHints:
      'Engine: Godot 4.x. Scene-node architecture with GDScript or C#. Export via built-in export templates. Signals for decoupled communication. Resources for shared data assets.',
    mechanicsVocabulary:
      'Use Godot terminology: Nodes, Scenes, Signals, CharacterBody2D/3D, Area2D/3D, AnimationPlayer, StateMachine, Resources.',
  },
  unreal: {
    id: 'unreal',
    displayName: 'Unreal Engine 5',
    language: ['C++', 'Blueprints'],
    defaultPlatforms: ['Windows', 'macOS', 'PS5', 'Xbox Series', 'iOS', 'Android'],
    keyPatterns: ['Blueprints', 'Levels', 'Actors', 'Components', 'Nanite', 'Lumen'],
    techSpecHints:
      'Engine: Unreal Engine 5.x. Actor-Component model. Blueprint visual scripting and/or C++. Nanite for geometry, Lumen for global illumination. Data Assets for configuration. Target PC/console at 60fps minimum.',
    mechanicsVocabulary:
      'Use UE5 terminology: Actors, Components, Blueprints, Game Mode, Game State, Player Controller, Pawns, Data Assets, Enhanced Input.',
  },
  unity: {
    id: 'unity',
    displayName: 'Unity 6',
    language: ['C#'],
    defaultPlatforms: ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'WebGL', 'Console'],
    keyPatterns: ['GameObjects', 'Prefabs', 'ScriptableObjects', 'Scenes', 'UGUI'],
    techSpecHints:
      'Engine: Unity 6.x. GameObject-Component model with C#. Prefabs for reusable entities. ScriptableObjects for data-driven design. URP or HDRP render pipeline.',
    mechanicsVocabulary:
      'Use Unity terminology: GameObjects, Components, Prefabs, ScriptableObjects, MonoBehaviour, Coroutines, Physics layers, Unity Events.',
  },
  phaser: {
    id: 'phaser',
    displayName: 'Phaser 4',
    language: ['TypeScript', 'JavaScript'],
    defaultPlatforms: ['Web', 'Mobile Web'],
    keyPatterns: ['Scenes', 'GameObjects', 'Physics', 'Tilemaps', 'WebGL'],
    techSpecHints:
      'Engine: Phaser 4. Canvas/WebGL 2D framework. Scene-based architecture. Arcade or Matter.js physics. Asset loading via Loader plugin. Targets modern browsers.',
    mechanicsVocabulary:
      'Use Phaser terminology: Scenes, Sprites, Groups, Tilemaps, Tweens, Arcade Physics, Input Manager.',
  },
  threejs: {
    id: 'threejs',
    displayName: 'Three.js',
    language: ['TypeScript', 'JavaScript'],
    defaultPlatforms: ['Web'],
    keyPatterns: ['Scene', 'Camera', 'Renderer', 'Mesh', 'WebGL'],
    techSpecHints:
      'Library: Three.js. WebGL 3D renderer. Custom game loop with requestAnimationFrame. GLTF for 3D assets. Rapier or Cannon.js for physics. Vite or webpack build.',
    mechanicsVocabulary:
      'Use Three.js terminology: Scene, Mesh, Geometry, Material, Lights, Camera, Renderer, Object3D, Raycaster.',
  },
  gamemaker: {
    id: 'gamemaker',
    displayName: 'GameMaker',
    language: ['GML', 'GML Visual'],
    defaultPlatforms: ['Windows', 'macOS', 'Linux', 'Web', 'Android', 'iOS', 'Console'],
    keyPatterns: ['Rooms', 'Objects', 'Sprites', 'Sequences', 'Shaders'],
    techSpecHints:
      'Engine: GameMaker. Room-Object architecture. GML scripting. Sprite-based 2D. Built-in collision system. YYC compiler for performance.',
    mechanicsVocabulary:
      'Use GameMaker terminology: Objects, Rooms, Sprites, Sequences, Surfaces, Layers, Collision masks, Alarms.',
  },
  bevy: {
    id: 'bevy',
    displayName: 'Bevy',
    language: ['Rust'],
    defaultPlatforms: ['Windows', 'macOS', 'Linux', 'Web', 'Android', 'iOS'],
    keyPatterns: ['ECS', 'Systems', 'Components', 'Entities', 'Resources', 'Events'],
    techSpecHints:
      'Engine: Bevy (Rust). Entity-Component-System (ECS) architecture. Data-driven design via Components and Resources. Systems run in parallel. WASM target for web.',
    mechanicsVocabulary:
      'Use Bevy ECS terminology: Entities, Components, Systems, Resources, Events, Queries, Commands, Plugins.',
  },
  kaboom: {
    id: 'kaboom',
    displayName: 'Kaboom.js',
    language: ['TypeScript', 'JavaScript'],
    defaultPlatforms: ['Web'],
    keyPatterns: ['kaboom()', 'add()', 'onUpdate()', 'onCollide()'],
    techSpecHints:
      'Library: Kaboom.js. Component-based 2D game library for the web. Canvas renderer. Simple scene/level management.',
    mechanicsVocabulary:
      'Use Kaboom terminology: game objects with add(), components, scenes, levels, onUpdate/onDraw hooks.',
  },
  pixi: {
    id: 'pixi',
    displayName: 'PixiJS',
    language: ['TypeScript', 'JavaScript'],
    defaultPlatforms: ['Web'],
    keyPatterns: ['Application', 'Container', 'Sprite', 'Graphics', 'WebGPU'],
    techSpecHints:
      'Library: PixiJS v8. Fast WebGPU/WebGL 2D renderer. DisplayObject hierarchy. Custom game loop. Spine for animations.',
    mechanicsVocabulary:
      'Use PixiJS terminology: Application, Stage, Container, Sprite, Graphics, Texture, Ticker.',
  },
  construct: {
    id: 'construct',
    displayName: 'Construct 3',
    language: ['No-code / JavaScript'],
    defaultPlatforms: ['Web', 'Windows', 'Android', 'iOS'],
    keyPatterns: ['Event sheets', 'Behaviors', 'Layouts', 'Objects'],
    techSpecHints:
      'Engine: Construct 3. Event sheet + behavior system. No-code primary workflow with optional JS. Exports to HTML5, native wrappers.',
    mechanicsVocabulary:
      'Use Construct 3 terminology: Layouts, Event Sheets, Object Types, Behaviors, Families, Instance Variables.',
  },
  cocos: {
    id: 'cocos',
    displayName: 'Cocos Creator',
    language: ['TypeScript'],
    defaultPlatforms: ['Web', 'Android', 'iOS', 'Mini-games'],
    keyPatterns: ['Node', 'Component', 'Scene', 'Prefab', 'Cocos'],
    techSpecHints:
      'Engine: Cocos Creator. Node-Component architecture with TypeScript. Strong mobile and web mini-game support. 2D and lightweight 3D.',
    mechanicsVocabulary:
      'Use Cocos Creator terminology: Nodes, Components, Scenes, Prefabs, cc.Vec2/Vec3, Colliders, Animation Clips.',
  },
  custom: {
    id: 'custom',
    displayName: 'Custom Engine',
    language: ['C++', 'C'],
    defaultPlatforms: ['Windows', 'macOS', 'Linux'],
    keyPatterns: ['Makefile', 'CMake', 'custom renderer'],
    techSpecHints:
      'Custom engine. Describe target platforms, renderer (OpenGL/Vulkan/DirectX/Metal), build system, and key third-party libraries (SDL2, SFML, etc.).',
    mechanicsVocabulary:
      'Describe mechanics in engine-agnostic terms; specify custom system names and architecture patterns used in this project.',
  },
  unknown: {
    id: 'unknown',
    displayName: 'Not detected',
    language: [],
    defaultPlatforms: [],
    keyPatterns: [],
    techSpecHints:
      'Engine not auto-detected. Specify your engine, language, and target platforms in the Technical Specs section.',
    mechanicsVocabulary:
      'Describe mechanics in plain language; no engine-specific terminology assumed.',
  },
};

export function getProfile(engine: EngineId): EngineProfile {
  return ENGINE_PROFILES[engine] ?? ENGINE_PROFILES.unknown;
}

export const ENGINE_SUGGESTIONS: {
  genre: string[];
  platform: string[];
  engine: EngineId;
  reason: string;
}[] = [
  {
    genre: ['2d platformer', 'platformer', 'roguelite', 'roguelike', 'top-down', 'puzzle', 'metroidvania'],
    platform: ['pc', 'mac', 'linux', 'web'],
    engine: 'godot',
    reason: 'Godot 4 is the top open-source choice for 2D indie games — free, lightweight, no royalties.',
  },
  {
    genre: ['fps', 'open world', 'action rpg', 'aaa', 'cinematic', '3d'],
    platform: ['pc', 'console', 'ps5', 'xbox'],
    engine: 'unreal',
    reason: 'Unreal Engine 5 delivers AAA-quality visuals and is the industry standard for high-fidelity 3D games.',
  },
  {
    genre: ['mobile', 'casual', 'hyper-casual', 'vr', 'ar', 'cross-platform'],
    platform: ['mobile', 'android', 'ios', 'vr'],
    engine: 'unity',
    reason: 'Unity 6 has the largest mobile ecosystem and best cross-platform support including VR/AR.',
  },
  {
    genre: ['browser', 'html5', 'web', 'arcade', 'clicker'],
    platform: ['web', 'browser'],
    engine: 'phaser',
    reason: 'Phaser 4 is the benchmark framework for code-first 2D browser games.',
  },
];

export function suggestEngine(genre: string, platform: string): { engine: EngineId; reason: string } | null {
  const g = genre.toLowerCase();
  const p = platform.toLowerCase();
  for (const s of ENGINE_SUGGESTIONS) {
    if (s.genre.some(sg => g.includes(sg)) || s.platform.some(sp => p.includes(sp))) {
      return { engine: s.engine, reason: s.reason };
    }
  }
  return null;
}
