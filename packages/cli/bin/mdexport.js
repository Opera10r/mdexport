#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exportCommand } from '../src/commands/export.js';
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
  .option('--cover', 'Include cover page', false)
  .option('--cover-title <text>', 'Cover page title')
  .option('--cover-date', 'Include date on cover', true)
  .option('--logo <path>', 'Path to logo image for cover')
  .option('--margins <size>', 'narrow | normal | wide', 'normal')
  .option('--line-spacing <n>', 'Line spacing: 1.0, 1.15, 1.5, 2.0', '1.15')
  .option('--header <text>', 'Header text')
  .option('--footer <text>', 'Footer text')
  .option('--page-numbers', 'Include page numbers', false)
  .option('--accent <color>', 'Hex color for accent')
  .option('--output <path>', 'Output file path')
  .option('--desktop', 'Save output to Desktop', false)
  .option('--open', 'Open file after export', false)
  .action(async (file, opts) => {
    try {
      await exportCommand(file, opts);
    } catch (err) {
      // exportCommand already logs user-friendly errors for render failures,
      // but validation errors (file not found, wrong type) throw before that
      if (err.message && !err._logged) {
        console.error(chalk.red(`  ✗ ${err.message}`));
        console.log('');
      }
      process.exit(1);
    }
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

// ── Default (no command) ─────────────────────────────────────────────

program.action(() => {
  console.log('');
  console.log(chalk.bold('  MDExport') + chalk.dim(' — Your markdown. Publication-ready in seconds.'));
  console.log('');
  console.log(chalk.dim('  Usage:'));
  console.log('    mdexport export README.md');
  console.log('    mdexport export README.md --desktop');
  console.log('    mdexport export README.md --theme editorial --font serif');
  console.log('    mdexport export README.md --cover --cover-title "My Book" --toc');
  console.log('    mdexport watch README.md --theme clean');
  console.log('');
  console.log(chalk.dim('  Run mdexport --help for all options.'));
  console.log('');
});

program.parse();
