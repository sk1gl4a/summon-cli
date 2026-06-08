#!/usr/bin/env node

import {spawn, spawnSync} from 'node:child_process';
import process from 'node:process';
import fs from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {render} from 'ink';
import {App, ReorderApp, renderSnapshot, tools, orderTools} from '../src/app.mjs';
import {loadConfig, saveConfig, configLocation} from '../src/config.mjs';

const PROG = process.env.CLI_LEVEL_NAME || 'summon';
const SCRIPT = fileURLToPath(import.meta.url);

const passthroughIndex = process.argv.indexOf('--');
const forwardedArgs = passthroughIndex === -1 ? [] : process.argv.slice(passthroughIndex + 1);
const rawArgs = passthroughIndex === -1 ? process.argv.slice(2) : process.argv.slice(2, passthroughIndex);

const flags = new Set(rawArgs.filter(arg => arg.startsWith('-')));
const args = rawArgs.filter(arg => !arg.startsWith('-'));
const command = args[0];

const config = loadConfig();
let logo = config.logo;
if (flags.has('--no-logo')) {
  logo = false;
  saveConfig({logo: false});
} else if (flags.has('--logo')) {
  logo = true;
  saveConfig({logo: true});
}
const items = orderTools(config.order);

if (process.env.CLI_LEVEL_SNAPSHOT === '1') {
  process.stdout.write(renderSnapshot(Number(process.env.CLI_LEVEL_ACTIVE || 0)));
  process.exit(0);
}

if (flags.has('--help') || flags.has('-h') || command === 'help') {
  printHelp();
  process.exit(0);
}

const canRenderTui = Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.TERM !== 'dumb');

switch (command) {
  case 'reorder':
    await runReorder();
    break;
  case 'default':
    await runDefault(args[1]);
    break;
  case 'alias':
    runAlias(args[1]);
    break;
  case undefined:
    await runMenu();
    break;
  default:
    process.stderr.write(`${PROG}: unknown command '${command}'. Try '${PROG} --help'.\n`);
    process.exit(2);
}

async function runMenu() {
  if (!canRenderTui) {
    process.stdout.write(renderSnapshot(0));
    process.stderr.write(`${PROG}: interactive terminal required for selection.\n`);
    process.exit(2);
  }

  clearScreen();
  const selected = await chooseTool();
  if (!selected) {
    process.exit(0);
  }

  clearScreen();
  process.exitCode = await runCommand(selected.command, forwardedArgs);
}

async function runReorder() {
  requireTui('reorder');
  clearScreen();
  const order = await new Promise(resolve => {
    let instance;
    instance = render(React.createElement(ReorderApp, {
      onCancel: () => {
        instance.unmount();
        resolve(null);
      },
      onDone: result => {
        instance.unmount();
        resolve(result);
      }
    }));
  });

  if (!order) {
    process.stdout.write('Reorder cancelled.\n');
    return;
  }

  saveConfig({order});
  process.stdout.write(`Saved order: ${order.join(' › ')}\n`);
}

async function runDefault(target) {
  if (target === 'off' || target === 'none') {
    saveConfig({default: null});
    process.stdout.write(`Default cleared. The cursor starts on the first tool.\n`);
    return;
  }

  if (target) {
    const tool = tools.find(item => item.id === target || item.command === target);
    if (!tool) {
      process.stderr.write(`${PROG}: no tool '${target}'. Options: ${tools.map(t => t.id).join(', ')}.\n`);
      process.exit(2);
    }
    saveConfig({default: tool.id});
    process.stdout.write(`Default set to ${tool.label}. The menu now opens with the cursor on it.\n`);
    return;
  }

  requireTui('default');
  clearScreen();
  const selected = await chooseTool();
  if (!selected) {
    process.stdout.write('No change.\n');
    return;
  }
  saveConfig({default: selected.id});
  process.stdout.write(`Default set to ${selected.label}. The menu now opens with the cursor on it.\n`);
}

function runAlias(name) {
  if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) {
    process.stderr.write(`${PROG}: usage: ${PROG} alias <name>\n`);
    process.exit(2);
  }

  const binDir = join(homedir(), '.local', 'bin');
  const target = join(binDir, name);
  const shim = `#!/usr/bin/env sh\nCLI_LEVEL_NAME=${name} exec ${process.execPath} ${SCRIPT} "$@"\n`;

  fs.mkdirSync(binDir, {recursive: true});
  fs.writeFileSync(target, shim);
  fs.chmodSync(target, 0o755);
  process.stdout.write(`Created '${name}' at ${target}.\n`);
  if (!`${process.env.PATH}`.split(':').includes(binDir)) {
    process.stdout.write(`Note: ${binDir} is not on your PATH yet.\n`);
  }
}

function chooseTool() {
  return new Promise(resolve => {
    let instance;
    instance = render(React.createElement(App, {
      items,
      logo,
      initialId: config.default,
      onCancel: () => {
        instance.unmount();
        resolve(null);
      },
      onSelect: tool => {
        instance.unmount();
        resolve(tool);
      }
    }));
  });
}

function requireTui(what) {
  if (!canRenderTui) {
    process.stderr.write(`${PROG}: '${what}' needs an interactive terminal.\n`);
    process.exit(2);
  }
}

function commandExists(cmd) {
  const result = spawnSync('sh', ['-lc', `command -v ${shellQuote(cmd)} >/dev/null 2>&1`], {stdio: 'ignore'});
  return result.status === 0;
}

function runCommand(cmd, cmdArgs) {
  const child = spawn(cmd, cmdArgs, {stdio: 'inherit', shell: false});

  let signal = null;
  let status = null;

  child.on('exit', (code, receivedSignal) => {
    status = code;
    signal = receivedSignal;
  });

  return waitForChild(child).then(() => {
    if (signal) {
      process.kill(process.pid, signal);
      return 128;
    }
    return status ?? 0;
  });
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', error => {
      if (error.code === 'ENOENT') {
        process.stderr.write(`${PROG}: command not found: ${child.spawnfile}\n`);
      } else {
        process.stderr.write(`${PROG}: failed to start ${child.spawnfile}: ${error.message}\n`);
      }
      reject(error);
    });
    child.once('close', resolve);
  }).catch(error => {
    process.exitCode = error.code === 'ENOENT' ? 127 : 1;
  });
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printHelp() {
  process.stdout.write(`Usage: ${PROG} [command] [--no-logo] [-- args...]

Summon your AI CLI. A terminal launcher.

Commands:
  (none)            Open the picker
  reorder           Set the order tools appear in
  default [tool]    Start the cursor on <tool>; no tool = pick one; 'off' clears
  alias <name>      Install a second command name for this launcher
  help              Show this help

Options:
  --no-logo         Hide the side logo and remember it
  --logo            Show the side logo and remember it

Anything after -- is passed to the launched tool, e.g. ${PROG} -- --version
Config: ${configLocation()}
`);
}
