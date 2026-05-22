import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { exportCommand } from './export.js';

export async function watchCommand(filePath, opts) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`  ✗ File not found: ${resolved}`));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.cyan(`  Watching ${path.basename(resolved)} — press Ctrl+C to stop`));
  console.log('');

  let debounce = null;

  fs.watch(resolved, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      process.stdout.write(chalk.dim(`  [${time}] `));
      try {
        await exportCommand(filePath, { ...opts, open: false });
      } catch {
        // exportCommand logs its own errors, don't exit
      }
    }, 500);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.dim('  Stopped watching.'));
    console.log('');
    process.exit(0);
  });
}
