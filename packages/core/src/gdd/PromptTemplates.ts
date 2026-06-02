import { EngineProfile } from '../engines/engineProfiles.js';

export interface GDDInput {
  gameName: string;
  genre: string;
  platform: string;
  concept: string;
  engine: EngineProfile;
  ragContext?: string;
}

export interface SectionPrompt {
  key: string;
  title: string;
  system: string;
  prompt: (input: GDDInput) => string;
}

const BASE_SYSTEM = (engine: EngineProfile) =>
  `You are an expert game designer writing a professional Game Design Document (GDD).
Write detailed, specific, actionable content — avoid vague filler.
${engine.id !== 'unknown' ? `The game is being built in ${engine.displayName}. ${engine.mechanicsVocabulary}` : ''}
Format output in clean Markdown with headings, bullet points, and tables where appropriate.
Do not include meta-commentary. Only output the section content.`;

const ragBlock = (ctx?: string) =>
  ctx ? `\n\n## Reference Material\nUse the following retrieved context to ground your writing:\n\n${ctx}\n\n---\n\n` : '';

export const GDD_SECTIONS: SectionPrompt[] = [
  {
    key: 'overview',
    title: 'Game Overview',
    system: '',
    prompt: ({ gameName, genre, platform, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Game Overview** section for a GDD for a game called "${gameName}".

Genre: ${genre}
Platform: ${platform}
Concept: ${concept}
Engine: ${engine.displayName}

Include:
- **Tagline** — one punchy sentence
- **Genre & Subgenre**
- **Target Platform(s)**
- **Target Audience** — age, gamer type, comparable games they play
- **Core Fantasy** — the feeling the player is buying
- **Unique Selling Points** — 3–5 bullet points that make this game distinct
- **Comparable Titles** — 2–3 games this is similar to and how it differentiates
`,
  },
  {
    key: 'core_loop',
    title: 'Core Gameplay Loop',
    system: '',
    prompt: ({ gameName, genre, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Core Gameplay Loop** section for "${gameName}" (${genre}).
Concept: ${concept}
Engine: ${engine.displayName}

Include:
- **Primary Loop** — the 30-second to 3-minute repeating cycle (action → feedback → reward)
- **Session Loop** — what a typical 15–30 minute play session looks like
- **Meta Loop** — progression that spans multiple sessions (unlocks, upgrades, story)
- **Win / Lose / Continue Conditions**
- **Player Agency** — key decisions the player makes each loop
- A simple diagram or numbered sequence showing the loop flow
`,
  },
  {
    key: 'mechanics',
    title: 'Core Mechanics',
    system: '',
    prompt: ({ gameName, genre, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Core Mechanics** section for "${gameName}" (${genre}).
Concept: ${concept}
Engine: ${engine.displayName}. ${engine.mechanicsVocabulary}

Include:
- **Movement & Controls** — how the player moves, jump/dash/interact actions
- **Primary Mechanic** — the central interaction that defines gameplay
- **Combat / Interaction System** — if applicable, detailed breakdown
- **Progression Systems** — leveling, skill trees, item systems, unlocks
- **Economy** — in-game currency, resources, crafting if applicable
- **Difficulty & Balance** — how challenge scales
- For each mechanic, include: Description | Player Input | Game Response | Feedback (visual/audio/haptic)
`,
  },
  {
    key: 'story',
    title: 'Story & Characters',
    system: '',
    prompt: ({ gameName, genre, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Story & Characters** section for "${gameName}" (${genre}).
Concept: ${concept}

Include:
- **Premise** — 2–3 sentence world setup and central conflict
- **Player Character** — name, background, motivation, arc
- **Antagonist / Central Conflict** — who or what opposes the player and why
- **Supporting Cast** — 2–3 key NPCs with roles
- **World** — setting, tone, lore overview (keep concise, expand in a separate lore doc)
- **Narrative Delivery** — how story is told (cutscenes, dialogue, environmental storytelling, etc.)
- **Story Beats** — 5–7 high-level milestones (Act 1 hook → midpoint → climax → resolution)
`,
  },
  {
    key: 'art_direction',
    title: 'Art Direction',
    system: '',
    prompt: ({ gameName, genre, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Art Direction** section for "${gameName}" (${genre}).
Concept: ${concept}
Engine: ${engine.displayName}

Include:
- **Visual Style** — art style in one sentence (e.g. "hand-painted 2D with deep shadows")
- **Mood & Atmosphere** — emotional tone, lighting approach
- **Color Palette** — primary and accent colors with emotional intent
- **Reference Games / Films** — 3–5 visual inspirations
- **Character Design** — design language for characters
- **Environment Design** — biomes, zones, architectural style
- **UI Aesthetic** — how the UI fits the world (diegetic vs HUD, fonts, icons)
- **Technical Art Notes** — resolution, texture budget, shader style (relevant to ${engine.displayName})
`,
  },
  {
    key: 'audio',
    title: 'Audio Design',
    system: '',
    prompt: ({ gameName, genre, concept, ragContext }) => `
${ragBlock(ragContext)}
Write the **Audio Design** section for "${gameName}" (${genre}).
Concept: ${concept}

Include:
- **Music Style** — genre, tempo, instrumentation, mood
- **Dynamic Music** — how music responds to gameplay (adaptive layers, stingers, transitions)
- **Reference Tracks / Artists** — 3–5 musical references
- **Sound Effects Philosophy** — realistic vs stylised, key SFX categories
- **Voice Acting** — yes/no, scope (full VO, barks only, narrator), tone
- **Audio Milestones** — what audio ships at prototype, alpha, beta
`,
  },
  {
    key: 'ui_ux',
    title: 'UI / UX',
    system: '',
    prompt: ({ gameName, genre, concept, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **UI/UX** section for "${gameName}" (${genre}).
Concept: ${concept}
Engine: ${engine.displayName}

Include:
- **HUD Design** — what's always on screen, what appears contextually
- **Menu Structure** — main menu → options → pause → game over flow
- **Key Screens** — inventory, map, skill tree, etc. (list with description)
- **Accessibility** — colorblind modes, font sizes, remappable controls, difficulty options
- **Onboarding** — how the player learns the game (tutorial, contextual hints, organic discovery)
- **Platform Conventions** — any platform-specific UI norms (mobile tap targets, console cursor navigation)
`,
  },
  {
    key: 'tech_specs',
    title: 'Technical Specifications',
    system: '',
    prompt: ({ gameName, platform, engine, ragContext }) => `
${ragBlock(ragContext)}
Write the **Technical Specifications** section for "${gameName}".
Platform: ${platform}
Engine: ${engine.displayName}

${engine.techSpecHints}

Include:
- **Engine & Version** — ${engine.displayName}, relevant plugins/packages
- **Target Platforms** — list with min/recommended hardware specs
- **Performance Targets** — frame rate, resolution, load time goals
- **Scripting Language** — ${engine.language.join(' / ')}
- **Asset Pipeline** — source formats, export formats, compression strategy
- **Third-Party Libraries** — physics, audio, networking, analytics
- **Save System** — local save, cloud sync, format
- **Build & Deploy** — CI/CD approach, distribution platform (Steam, itch.io, app stores)
- **Scope Constraints** — known technical risks, areas to prototype early
`,
  },
  {
    key: 'scope',
    title: 'Scope & Milestones',
    system: '',
    prompt: ({ gameName, genre, concept, ragContext }) => `
${ragBlock(ragContext)}
Write the **Scope & Milestones** section for "${gameName}" (${genre}).
Concept: ${concept}

Include:
- **MVP Feature List** — the minimum set of features that constitute a shippable game (bullet list)
- **Nice-to-Have Features** — features cut from MVP but desired post-launch (bullet list)
- **Out of Scope** — explicit list of features that will NOT be in v1.0
- **Milestone Table** — use a Markdown table with columns: Milestone | Goal | Key Deliverables | Est. Duration
  Suggested milestones: Prototype → Vertical Slice → Alpha → Beta → Gold / Launch
- **Team Roles Needed** — programmer, artist, sound designer, etc. (even for solo devs, note which hats you're wearing)
- **Risk Register** — top 3–5 risks with likelihood, impact, and mitigation
`,
  },
];

export function buildSystemPrompt(engine: EngineProfile): string {
  return BASE_SYSTEM(engine);
}
