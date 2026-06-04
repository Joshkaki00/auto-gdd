import chalk from 'chalk';

const COMMANDS = ['init', 'generate', 'doctor', 'config', 'models', 'rag', 'completions', 'help'];
const GENERATE_FLAGS = [
  '--name', '--genre', '--platform', '--concept', '--output', '--model',
  '--split', '--no-rag', '--no-scan', '--section', '--yes', '--help',
];
const RAG_SUBCOMMANDS = ['index', 'list', 'search', 'clear'];

const BASH = `\
# auto-gdd bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   eval "$(auto-gdd completions bash)"

_auto_gdd_completions() {
  local cur prev words cword
  _init_completion 2>/dev/null || {
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
  }

  local commands="${COMMANDS.join(' ')}"
  local generate_flags="${GENERATE_FLAGS.join(' ')}"

  if [ "\${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  case "\${COMP_WORDS[1]}" in
    generate)
      COMPREPLY=( $(compgen -W "$generate_flags" -- "$cur") )
      ;;
    rag)
      COMPREPLY=( $(compgen -W "${RAG_SUBCOMMANDS.join(' ')}" -- "$cur") )
      ;;
    completions)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") )
      ;;
  esac
}

complete -F _auto_gdd_completions auto-gdd
`;

const ZSH = `\
#compdef auto-gdd
# auto-gdd zsh completion
# Add to your ~/.zshrc:
#   eval "$(auto-gdd completions zsh)"

_auto_gdd() {
  local state

  _arguments \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      local commands=(
        ${COMMANDS.map(c => `'${c}'`).join('\n        ')}
      )
      _describe 'command' commands
      ;;
    args)
      case $words[2] in
        generate)
          _arguments \\
            ${GENERATE_FLAGS.map(f => `'${f}[${f.replace('--', '')}]'`).join(' \\\n            ')}
          ;;
        rag)
          local subcommands=(${RAG_SUBCOMMANDS.map(c => `'${c}'`).join(' ')})
          _describe 'subcommand' subcommands
          ;;
        completions)
          local shells=('bash' 'zsh' 'fish')
          _describe 'shell' shells
          ;;
      esac
      ;;
  esac
}

_auto_gdd
`;

const FISH = `\
# auto-gdd fish completion
# Save to ~/.config/fish/completions/auto-gdd.fish
# Or run: auto-gdd completions fish > ~/.config/fish/completions/auto-gdd.fish

set -l commands ${COMMANDS.join(' ')}

complete -c auto-gdd -f -n "__fish_use_subcommand" -a "$commands"

${COMMANDS.map(c => `complete -c auto-gdd -f -n "__fish_seen_subcommand_from ${c}" -s h -l help -d 'Show help'`).join('\n')}

# generate flags
${GENERATE_FLAGS.map(f => `complete -c auto-gdd -f -n "__fish_seen_subcommand_from generate" -l ${f.replace('--', '').replace('no-', '')} -d '${f}'`).join('\n')}

# rag subcommands
${RAG_SUBCOMMANDS.map(c => `complete -c auto-gdd -f -n "__fish_seen_subcommand_from rag" -a "${c}"`).join('\n')}

# completions shells
complete -c auto-gdd -f -n "__fish_seen_subcommand_from completions" -a "bash zsh fish"
`;

type Shell = 'bash' | 'zsh' | 'fish';

export function runCompletions(shell?: string): void {
  const scripts: Record<Shell, string> = { bash: BASH, zsh: ZSH, fish: FISH };

  if (!shell) {
    console.log(chalk.bold('auto-gdd shell completions\n'));
    console.log('Usage:');
    console.log(chalk.cyan('  eval "$(auto-gdd completions bash)"'));
    console.log(chalk.cyan('  eval "$(auto-gdd completions zsh)"'));
    console.log(chalk.cyan('  auto-gdd completions fish > ~/.config/fish/completions/auto-gdd.fish'));
    console.log('');
    console.log(chalk.dim('Supported shells: bash, zsh, fish'));
    return;
  }

  const script = scripts[shell as Shell];
  if (!script) {
    console.error(chalk.red(`Unknown shell: ${shell}`));
    console.error(chalk.dim('Supported: bash, zsh, fish'));
    process.exit(1);
  }

  process.stdout.write(script);
}
