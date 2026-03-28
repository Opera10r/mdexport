import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { callExportAPI } from '../api.js';
import { getLicenseKey } from '../config.js';

export async function exportCommand(filePath, opts) {
  // Resolve file path
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`  ✗ File not found: ${resolved}`));
    process.exit(1);
  }

  if (!resolved.endsWith('.md')) {
    console.error(chalk.red(`  ✗ Not a markdown file: ${resolved}`));
    process.exit(1);
  }

  // Read markdown
  const markdown = fs.readFileSync(resolved, 'utf8');
  const fileSize = (fs.statSync(resolved).size / 1024).toFixed(1);
  const fileName = path.basename(resolved, '.md');

  console.log('');
  console.log(chalk.green(`  ✓ Reading ${path.basename(resolved)} (${fileSize}KB)`));

  const isLocal = opts.local || false;

  if (isLocal) {
    console.log(chalk.green('  ✓ Local mode — rendering on your machine'));
  } else {
    const licenseKey = getLicenseKey();
    if (licenseKey) {
      console.log(chalk.green('  ✓ License verified'));
    }
  }

  // Determine format
  const format = opts.format || 'pdf';
  const ext = format === 'docx' ? 'docx' : 'pdf';

  // Determine output path
  const desktop = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop');
  const outputPath = opts.output
    ? path.resolve(opts.output)
    : path.join(desktop, `${fileName}.${ext}`);

  // Build options
  const exportOpts = {
    format,
    theme: opts.theme || 'clean',
    font: opts.font || 'sans',
    toc: opts.toc || false,
    cover: opts.cover || false,
    coverTitle: opts.coverTitle || fileName,
    coverDate: opts.coverDate !== false,
    margins: opts.margins || 'normal',
    lineSpacing: parseFloat(opts.lineSpacing) || 1.15,
    header: opts.header || null,
    footer: opts.footer || null,
    pageNumbers: opts.pageNumbers || false,
    accent: opts.accent || null,
  };

  // Render
  const themeLabel = opts.theme ? ` with ${opts.theme} theme` : '';
  const isTTY = process.stdout.isTTY;
  const spinner = isTTY ? ora(`  Rendering ${ext.toUpperCase()}${themeLabel}...`).start() : null;
  if (!isTTY) { console.log(`  Rendering ${ext.toUpperCase()}${themeLabel}...`); }

  const startTime = Date.now();

  try {
    let buffer;

    if (isLocal) {
      // Local render — all features unlocked, no API needed
      if (format === 'docx') {
        const { localRenderDOCX } = await import('../local-render-docx.js');
        buffer = await localRenderDOCX(markdown, exportOpts);
      } else {
        const { localRenderPDF } = await import('../local-render.js');
        buffer = await localRenderPDF(markdown, exportOpts);
      }
    } else {
      // API render — features gated by license
      const licenseKey = getLicenseKey();
      const result = await callExportAPI(markdown, exportOpts, licenseKey);
      buffer = Buffer.from(result);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const outputSize = (buffer.byteLength / 1024).toFixed(0);

    // Write output
    fs.writeFileSync(outputPath, buffer);

    if (spinner) { spinner.stop(); }
    console.log(chalk.green(`  ✓ Exported: ${path.basename(outputPath)} (${outputSize}KB) in ${elapsed}s`));

    // Open file if requested
    if (opts.open) {
      const { exec } = await import('child_process');
      exec(`open "${outputPath}"`);
    }

    // Show upsell for free tier (API mode only)
    if (!isLocal && !getLicenseKey()) {
      console.log('');
      console.log(chalk.dim('  ─────────────────────────────────────────'));
      console.log(chalk.dim('  Want beautiful fonts, themes, DOCX export,'));
      console.log(chalk.dim('  cover pages + more?'));
      console.log('');
      console.log(chalk.cyan('  MDExport for VS Code — $5/month'));
      console.log(chalk.cyan('  https://mdexport.dev'));
      console.log(chalk.dim('  ─────────────────────────────────────────'));
    }

    console.log('');
  } catch (err) {
    if (spinner) { spinner.stop(); }

    if (err.message === 'LICENSE_REQUIRED') {
      console.error(chalk.yellow(`  ⚠ This feature requires a license.`));
      console.log('');
      console.log(chalk.cyan('  Get MDExport → https://mdexport.dev'));
      console.log(chalk.dim('  Already have a key? Run: mdexport auth login'));
    } else {
      console.error(chalk.red(`  ✗ Export failed: ${err.message}`));
    }

    console.log('');
    process.exit(1);
  }
}
