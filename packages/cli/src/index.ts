import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runGenerate } from './commands/generate.js';
import { runConfig } from './commands/config.js';
import { runModels } from './commands/models.js';
import { runDoctor } from './commands/doctor.js';
import { runRagIndex, runRagList, runRagSearch, runRagClear } from './commands/rag.js';

const program = new Command();

program
  .name('auto-gdd')
  .description('Local AI Game Design Document generator — free, offline, Obsidian-ready')
  .version('0.1.0');

program
  .command('init')
  .description('Detect engine and set up workspace config (.auto-gdd.json)')
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
  .option('--section <keys>', 'Regenerate specific section(s), comma-separated (e.g. mechanics,story)')
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

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
