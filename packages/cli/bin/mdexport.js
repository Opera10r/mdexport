#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exportCommand } from '../src/commands/export.js';
import { authLogin, authStatus, authLogout } from '../src/commands/auth.js';
import { watchCommand } from '../src/commands/watch.js';

const program = new Command();

program
  .name('mdexport')
  .description('Your markdown. Publication-ready in seconds.')
  .version('1.0.0');

// ── export ───────────────────────────────────────────────────────────

program
  .command('export <file>')
  .description('Export a markdown file to PDF or DOCX')
  .option('--format <type>', 'pdf or docx (default: pdf)', 'pdf')
  .option('--theme <name>', 'clean | dark | editorial | technical | warm', 'clean')
  .option('--font <family>', 'serif | sans | mono | humanist | slab', 'sans')
  .option('--toc', 'Include table of contents', false)
  .option('--local', 'Render locally (no API, all features unlocked)', false)
  .option('--cover', 'Include cover page', false)
  .option('--cover-title <text>', 'Cover page title')
  .option('--cover-date', 'Include date on cover', true)
  .option('--logo <path>', 'Path to logo image for cover (license required)')
  .option('--margins <size>', 'narrow | normal | wide', 'normal')
  .option('--line-spacing <n>', 'Line spacing: 1.0, 1.15, 1.5, 2.0', '1.15')
  .option('--header <text>', 'Header text (license required)')
  .option('--footer <text>', 'Footer text (license required)')
  .option('--page-numbers', 'Include page numbers (license required)', false)
  .option('--accent <color>', 'Hex color for accent (license required)')
  .option('--output <path>', 'Output file path')
  .option('--open', 'Open file after export', false)
  .action(async (file, opts) => {
    await exportCommand(file, opts);
  });

// ── watch ────────────────────────────────────────────────────────────

program
  .command('watch <file>')
  .description('Watch a markdown file and re-export on changes')
  .option('--format <type>', 'pdf or docx', 'pdf')
  .option('--theme <name>', 'Theme name', 'clean')
  .option('--font <family>', 'Font family', 'sans')
  .option('--toc', 'Include table of contents', false)
  .option('--output <path>', 'Output file path')
  .action(async (file, opts) => {
    await watchCommand(file, opts);
  });

// ── auth ─────────────────────────────────────────────────────────────

const auth = program
  .command('auth')
  .description('Manage your MDExport license key');

auth
  .command('login')
  .description('Enter and validate your license key')
  .action(async () => {
    await authLogin();
  });

auth
  .command('status')
  .description('Check your current license status')
  .action(async () => {
    await authStatus();
  });

auth
  .command('logout')
  .description('Remove your license key')
  .action(async () => {
    await authLogout();
  });

// ── Default (no command) ─────────────────────────────────────────────

program.action(() => {
  console.log('');
  console.log(chalk.bold('  MDExport') + chalk.dim(' — Your markdown. Publication-ready in seconds.'));
  console.log('');
  console.log(chalk.dim('  Usage:'));
  console.log('    mdexport export README.md --local');
  console.log('    mdexport export README.md --local --theme editorial --font serif');
  console.log('    mdexport export README.md --local --cover --cover-title "My Book" --toc');
  console.log('    mdexport watch README.md --theme clean');
  console.log('');
  console.log(chalk.dim('  Auth:'));
  console.log('    mdexport auth login');
  console.log('    mdexport auth status');
  console.log('    mdexport auth logout');
  console.log('');
  console.log(chalk.dim('  Run mdexport --help for all options.'));
  console.log('');
});

program.parse();
