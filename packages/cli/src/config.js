import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.mdexport');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeConfig(data) {
  ensureDir();
  const existing = readConfig();
  const merged = { ...existing, ...data };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

export function getLicenseKey() {
  const config = readConfig();
  return config.license_key || null;
}

export function setLicenseKey(key) {
  writeConfig({ license_key: key });
}

export function clearLicenseKey() {
  const config = readConfig();
  delete config.license_key;
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
