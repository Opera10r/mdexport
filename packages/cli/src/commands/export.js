import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

export async function exportCommand(filePath, opts) {
  // Resolve file path
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const mdExtensions = ['.md', '.mdx', '.markdown', '.mdown', '.mkd'];
  if (!mdExtensions.includes(path.extname(resolved).toLowerCase())) {
    throw new Error(`Not a markdown file: ${resolved}`);
  }

  // Read markdown
  const markdown = fs.readFileSync(resolved, 'utf8');
  const fileSize = (fs.statSync(resolved).size / 1024).toFixed(1);
  const fileName = path.basename(resolved, path.extname(resolved));

  console.log('');
  console.log(chalk.green(`  ✓ Reading ${path.basename(resolved)} (${fileSize}KB)`));

  // Determine format
  const format = opts.format || 'pdf';
  const ext = format === 'docx' ? 'docx' : 'pdf';

  // Determine output path — default to CWD, --desktop sends to ~/Desktop
  let outputPath;
  if (opts.output) {
    outputPath = path.resolve(opts.output);
  } else if (opts.desktop) {
    const desktop = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop');
    outputPath = path.join(desktop, `${fileName}.${ext}`);
  } else {
    outputPath = path.resolve(`${fileName}.${ext}`);
  }

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
    basePath: path.dirname(resolved),
  };

  // Render
  const themeLabel = opts.theme ? ` with ${opts.theme} theme` : '';
  const isTTY = process.stdout.isTTY;
  const spinner = isTTY ? ora(`  Rendering ${ext.toUpperCase()}${themeLabel}...`).start() : null;
  if (!isTTY) { console.log(`  Rendering ${ext.toUpperCase()}${themeLabel}...`); }

  const startTime = Date.now();

  try {
    let buffer;

    if (format === 'docx') {
      const { localRenderDOCX } = await import('../local-render-docx.js');
      buffer = await localRenderDOCX(markdown, exportOpts);
    } else {
      const { localRenderPDF } = await import('../local-render.js');
      buffer = await localRenderPDF(markdown, exportOpts);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const outputSize = (buffer.byteLength / 1024).toFixed(0);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(outputPath, buffer);

    if (spinner) { spinner.stop(); }
    console.log(chalk.green(`  ✓ Exported: ${path.basename(outputPath)} (${outputSize}KB) in ${elapsed}s`));

    // Open file if requested (cross-platform)
    if (opts.open) {
      const { exec } = await import('child_process');
      const cmd = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start ""'
        : 'xdg-open';
      exec(`${cmd} "${outputPath}"`);
    }

    console.log('');
  } catch (err) {
    if (spinner) { spinner.stop(); }

    console.error(chalk.red(`  ✗ Export failed: ${err.message}`));

    console.log('');
    err._logged = true;
    throw err;
  }
}
