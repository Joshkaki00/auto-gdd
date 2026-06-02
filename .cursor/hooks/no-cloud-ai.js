#!/usr/bin/env node
/**
 * beforeShellExecution hook — blocks installation of cloud AI SDK packages.
 * auto-gdd is a 100% offline tool. Cloud API dependencies must never be added.
 *
 * Blocked packages: openai, anthropic, groq-sdk, @google/generative-ai,
 *   cohere-ai, mistralai, replicate, together-ai, ai (Vercel AI SDK)
 */
const input = JSON.parse(await readStdin());
const cmd = (input.command ?? '').toLowerCase();

const CLOUD_PKGS = [
  'openai',
  'anthropic',
  '@anthropic-ai',
  'groq-sdk',
  'groq',
  '@google/generative-ai',
  'google-generativeai',
  'cohere-ai',
  'mistralai',
  'replicate',
  'together-ai',
  '"ai"',     // Vercel AI SDK
  "'ai'",
];

const isInstall = /npm\s+(install|i|add)|yarn\s+add|pnpm\s+add/.test(cmd);
const blocked = isInstall && CLOUD_PKGS.some(pkg => cmd.includes(pkg));

if (blocked) {
  process.stdout.write(
    JSON.stringify({
      permission: 'deny',
      user_message: '🚫 Cloud AI package blocked',
      agent_message:
        'auto-gdd is 100% offline. Cloud AI SDKs (openai, anthropic, groq, etc.) are forbidden. ' +
        'Use Ollama via packages/core/src/ollama/OllamaClient.ts instead.',
    }) + '\n',
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ permission: 'allow' }) + '\n');

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data || '{}'));
    process.stdin.on('error', reject);
  });
}
