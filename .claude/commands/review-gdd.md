Review the generated GDD for completeness, consistency, and engine accuracy: $ARGUMENTS

Steps:

1. Find the GDD to review:
   - If $ARGUMENTS is a file path, use that.
   - Otherwise read `outputPath` from `.auto-gdd.json` and list the most recent `.md` file there.

2. Invoke the `gdd-reviewer` subagent (see `.claude/agents/gdd-reviewer.md`) on the GDD file.
   Pass the full file path as context.

3. Present the reviewer's structured report:
   - Strengths
   - Missing or incomplete sections
   - Inconsistencies
   - Suggestions
   - Verdict: READY FOR PRODUCTION / NEEDS REVISION / MAJOR GAPS

4. If the verdict is NEEDS REVISION or MAJOR GAPS, ask the user which sections to regenerate,
   then run: `node packages/cli/dist/index.js generate --section <key>`
   (once `--section` flag exists — otherwise note it as a future improvement).
