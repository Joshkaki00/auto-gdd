import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runGenerate } from './commands/generate.js';
import { runConfig } from './commands/config.js';
import { runModels } from './commands/models.js';
import { runDoctor } from './commands/doctor.js';
import { runCompletions } from './commands/completions.js';
import { runRagIndex, runRagList, runRagSearch, runRagClear } from './commands/rag.js';

const program = new Command();

program
  .name('auto-gdd')
  .description('Local AI Game Design Document generator — free, offline, Obsidian-ready')
  .version('0.1.0');

program
  .command('init')
  .description('Detect engine and set up workspace config (.auto-gdd.json)')
  .addHelpText('after', `
Examples:
  $ auto-gdd init                    # interactive wizard
  $ auto-gdd init                    # re-run to pick a different engine`)
  .action(() => runInit());

program
  .command('generate')
  .description('Generate a full GDD for the current project')
  .option('-n, --name <name>', 'Game name')
  .option('-g, --genre <genre>', 'Genre')
  .option('-p, --platform <platform>', 'Target platform(s)')
  .option('-c, --concept <concept>', 'Game concept description')
  .option('-o, --output <path>', 'Output directory')
  .option('-m, --model <model>', 'Ollama model to use')
  .option('--split', 'Split into one file per section (Obsidian wikilinks)')
  .option('--no-rag', 'Skip RAG retrieval')
  .option('--no-scan', 'Skip codebase scanning (use for empty/new projects)')
  .option('--section <keys>', 'Regenerate specific section(s), comma-separated (e.g. mechanics,story)')
  .option('-y, --yes', 'Non-interactive: use config + flags only, exit if required fields are missing')
  .addHelpText('after', `
Examples:
  $ auto-gdd generate
  $ auto-gdd generate --concept "A top-down roguelike dungeon crawler"
  $ auto-gdd generate --section mechanics,story
  $ auto-gdd generate --no-rag --no-scan --yes \\
      --name "Dungeon Run" --genre roguelike --platform PC \\
      --concept "Procedural dungeon crawler with permadeath"`)
  .action((opts) => runGenerate(opts));

program
  .command('doctor')
  .description('Check Ollama, embedding model, RAG index, and config health')
  .action(() => runDoctor());

program
  .command('config')
  .description('View or edit configuration')
  .option('--reset', 'Clear workspace config and start fresh')
  .action((opts) => runConfig(opts.reset ?? false));

program
  .command('models')
  .description('List available Ollama models')
  .action(() => runModels());

const rag = program.command('rag').description('Manage the RAG reference library');

rag
  .command('index')
  .description('Index a folder of reference documents')
  .requiredOption('-s, --source <path>', 'Folder to index')
  .action((opts) => runRagIndex(opts.source));

rag
  .command('list')
  .description('List indexed documents')
  .action(() => runRagList());

rag
  .command('search <query>')
  .description('Search the indexed library')
  .action((query: string) => runRagSearch(query));

rag
  .command('clear')
  .description('Clear the RAG index')
  .action(() => runRagClear());

program
  .command('completions [shell]')
  .description('Output shell completion script (bash, zsh, fish)')
  .addHelpText('after', `
Examples:
  $ eval "$(auto-gdd completions bash)"
  $ eval "$(auto-gdd completions zsh)"
  $ auto-gdd completions fish > ~/.config/fish/completions/auto-gdd.fish`)
  .action((shell?: string) => runCompletions(shell));

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
