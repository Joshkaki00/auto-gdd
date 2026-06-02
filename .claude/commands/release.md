Prepare a release for auto-gdd: $ARGUMENTS

$ARGUMENTS should be the version bump type: patch | minor | major (default: patch)

Steps:

1. **Verify clean state**
   ```
   git status
   git diff
   ```
   Abort if there are uncommitted changes that aren't part of this release.

2. **Lint + build**
   ```
   npm run lint
   npm run build
   ```
   Fix any errors before continuing.

3. **Bump versions** — update `version` in all four `package.json` files consistently:
   - `package.json` (root)
   - `packages/core/package.json`
   - `packages/cli/package.json`
   - `packages/mcp/package.json`
   - `packages/vscode/package.json`

4. **Update CHANGELOG** — add a section for the new version with today's date.
   List changes under: Added / Changed / Fixed.
   If `CHANGELOG.md` does not exist, create it.

5. **Commit and tag**
   ```
   git add -A
   git commit -m "chore: release vX.Y.Z"
   git tag vX.Y.Z
   ```

6. **Publish** (only if the user confirms)
   ```
   npm publish --workspace=packages/core
   npm publish --workspace=packages/cli
   npm publish --workspace=packages/mcp
   ```
   VS Code extension requires `vsce package` separately — remind the user.
