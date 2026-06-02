// @ts-check
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Ignored paths ──────────────────────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '.cursor/**',
      '.claude/**',
    ],
  },

  // ── Plugin registrations (must come before configs that use their rules) ───
  plugins.stylistic,
  plugins.importX,
  plugins.node,
  plugins.typescriptEslint,

  // ── Base Airbnb + TypeScript (parser, stylistic, import-x, ts-eslint) ──────
  ...configs.base.typescript,

  // ── Node.js best-practices (eslint-plugin-n) ───────────────────────────────
  ...configs.node.recommended,

  // ── TypeScript rule layers ──────────────────────────────────────────────────
  rules.typescript.base,
  rules.typescript.typescriptEslint,
  rules.typescript.imports,

  // ── Project-specific overrides ─────────────────────────────────────────────
  {
    rules: {
      // ESM monorepo uses explicit .js extensions in imports
      'import-x/extensions': 'off',

      // Allow single-export files (most core classes)
      'import-x/prefer-default-export': 'off',

      // Classes are the primary abstraction — allow methods without `this`
      'class-methods-use-this': 'off',

      // Console is intentional in CLI tooling
      'no-console': 'off',

      // Allow for-of in async contexts; only ban goto-style syntax
      'no-restricted-syntax': [
        'error',
        { selector: 'LabeledStatement', message: 'Labels are a form of GOTO.' },
        { selector: 'WithStatement', message: '`with` is disallowed in strict mode.' },
      ],

      // CLI tools legitimately call process.exit()
      'n/no-process-exit': 'off',

      // Sync FS methods are appropriate for a CLI/config tool — no event loop to block
      'n/no-sync': 'off',

      // TypeScript hoists function declarations — no need for this rule
      '@typescript-eslint/no-use-before-define': 'off',

      // Shebangs are required for CLI entry points
      'n/hashbang': 'off',

      // Allow devDeps in test and config files
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.spec.ts',
          ],
        },
      ],

      // TypeScript handles unused vars better
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Allow any-cast as escape hatch for imprecise third-party types
      '@typescript-eslint/no-explicit-any': 'warn',

      // No need for explicit return types in a small monorepo
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow non-null assertions where we know better than the type
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // ── VS Code extension overrides ────────────────────────────────────────────
  {
    files: ['packages/vscode/src/**/*.ts'],
    rules: {
      // @types/vscode is correctly a devDependency for VS Code extensions
      'import-x/no-extraneous-dependencies': 'off',
      // VS Code extension entry is CommonJS; require() is permitted
      'n/global-require': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
