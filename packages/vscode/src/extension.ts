import * as vscode from 'vscode';
import { GDDPanel } from './GDDPanel';
import { ConfigStore, WorkspaceDetector, ENGINE_PROFILES } from '@auto-gdd/core';
import path from 'node:path';
import fs from 'node:fs';

let panel: GDDPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  // Auto-detect engine on activation (silent)
  autoDetectEngine(workspaceRoot);

  // Watch .auto-gdd.json for changes
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, '.auto-gdd.json')
  );
  configWatcher.onDidChange(() => panel?.refresh());
  configWatcher.onDidCreate(() => panel?.refresh());
  context.subscriptions.push(configWatcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('auto-gdd.openPanel', () => {
      panel = GDDPanel.createOrShow(context.extensionUri, workspaceRoot);
    }),

    vscode.commands.registerCommand('auto-gdd.generate', () => {
      panel = GDDPanel.createOrShow(context.extensionUri, workspaceRoot);
      panel.triggerGenerate();
    }),

    vscode.commands.registerCommand('auto-gdd.init', async () => {
      await runInit(workspaceRoot);
      panel?.refresh();
    }),

    vscode.commands.registerCommand('auto-gdd.redetectEngine', async () => {
      await redetectEngine(workspaceRoot);
      panel?.refresh();
    }),

    vscode.commands.registerCommand('auto-gdd.indexReferences', async () => {
      const folder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        openLabel: 'Select Reference Folder',
      });
      if (!folder?.[0]) return;
      panel = GDDPanel.createOrShow(context.extensionUri, workspaceRoot);
      panel.triggerRagIndex(folder[0].fsPath);
    }),

    vscode.window.registerWebviewViewProvider('auto-gdd.panel', {
      resolveWebviewView(view) {
        panel = new GDDPanel(view.webview, context.extensionUri, workspaceRoot);
        view.onDidChangeVisibility(() => {
          if (view.visible) panel?.refresh();
        });
      },
    })
  );
}

export function deactivate(): void {
  panel = undefined;
}

async function autoDetectEngine(root: string): Promise<void> {
  const store = new ConfigStore(root);
  const ws = store.readWorkspace();
  if (ws.engine && ws.engine !== 'unknown') return;

  const detector = new WorkspaceDetector(root);
  const result = detector.detect();
  if (result.engine !== 'unknown') {
    store.writeWorkspace({ engine: result.engine });
    const name = ENGINE_PROFILES[result.engine].displayName;
    vscode.window.showInformationMessage(
      `Auto-GDD detected engine: ${name}. Run "Auto-GDD: Initialize Workspace" to complete setup.`,
      'Initialize'
    ).then(action => {
      if (action === 'Initialize') runInit(root);
    });
  }
}

async function redetectEngine(root: string): Promise<void> {
  const detector = new WorkspaceDetector(root);
  const result = detector.detect();
  const store = new ConfigStore(root);
  if (result.engine !== 'unknown') {
    store.writeWorkspace({ engine: result.engine });
    vscode.window.showInformationMessage(`Detected: ${ENGINE_PROFILES[result.engine].displayName}`);
  } else {
    vscode.window.showWarningMessage('No game engine detected in this workspace.');
  }
}

async function runInit(root: string): Promise<void> {
  const terminal = vscode.window.createTerminal({ name: 'Auto-GDD Init', cwd: root });
  terminal.show();
  terminal.sendText('npx auto-gdd init');
}
