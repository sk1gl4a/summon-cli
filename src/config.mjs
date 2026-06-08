import {homedir} from 'node:os';
import {join, dirname} from 'node:path';
import fs from 'node:fs';

const baseDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const configPath = join(baseDir, 'summon-cli', 'config.json');

const DEFAULTS = {
  order: [],
  logo: true,
  default: null,
  customTools: []
};

export function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {...DEFAULTS, ...parsed};
  } catch {
    return {...DEFAULTS};
  }
}

export function saveConfig(patch) {
  const next = {...loadConfig(), ...patch};
  fs.mkdirSync(dirname(configPath), {recursive: true});
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function configLocation() {
  return configPath;
}
