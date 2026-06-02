Add support for a new game engine: $ARGUMENTS

Follow these steps in order:

1. **Engine profile** — add a new entry to `ENGINE_PROFILES` in `packages/core/src/engines/engineProfiles.ts`.
   Match the shape of existing entries: `id`, `displayName`, `language`, `defaultPlatforms`, `mechanicsVocabulary`, `techSpecsHint`.

2. **Detection rule** — add a signature rule to the `RULES` array in `packages/core/src/detector/WorkspaceDetector.ts`.
   Check for signature files first (e.g. `project.godot`, `.uproject`, `Cargo.toml`), then fall back to `package.json` deps.

3. **Hook detection** — add the same check to `.cursor/hooks/workspace-open.js` inside `detectEngine()`.

4. **Skill update** — add the engine name to the supported engines list at the bottom of `.claude/skills/generate-gdd/SKILL.md`.

5. **Build and verify** — run `npm run build` and confirm zero errors.
   Then run `node packages/cli/dist/index.js init` in a directory with that engine's signature files to confirm detection.
