import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Find the mdexport CLI entry point.
 * Prefers the globally installed `mdexport`, falls back to the bundled copy
 * relative to this extension, then to npx.
 */
function findCliPath(context: vscode.ExtensionContext): { node: string; script: string } | { npx: string } {
  // Use the CLI bundled alongside the extension (monorepo layout)
  const bundled = path.resolve(context.extensionPath, '..', 'cli', 'bin', 'mdexport.js');
  try {
    require('fs').accessSync(bundled);
    return { node: process.execPath, script: bundled };
  } catch {
    // Not found — fall back to npx
  }
  return { npx: 'mdexport' };
}

export async function exportFile(
  filePath: string,
  format: 'pdf' | 'docx',
  context: vscode.ExtensionContext
) {
  const config = vscode.workspace.getConfiguration('mdexport');
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath, ext);

  const font = config.get<string>('defaultFont', 'sans');
  const theme = config.get<string>('defaultTheme', 'clean');
  const toc = config.get<boolean>('toc', false);
  const margins = config.get<string>('defaultMargins', 'normal');
  const lineSpacing = config.get<number>('defaultLineSpacing', 1.15);
  const pageNumbers = config.get<boolean>('pageNumbers', true);
  const saveToDesktop = config.get<boolean>('saveToDesktop', true);

  // Output to Desktop or next to source file
  const outputDir = saveToDesktop
    ? path.join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop')
    : path.dirname(filePath);
  const outputPath = path.join(outputDir, `${fileName}.${format}`);

  // Build CLI args
  const args = [
    'export', filePath,
    '--local',
    '--format', format,
    '--font', font,
    '--theme', theme,
    '--margins', margins,
    '--line-spacing', String(lineSpacing),
    '--output', outputPath,
  ];
  if (toc) { args.push('--toc'); }
  if (pageNumbers) { args.push('--page-numbers'); }
  if (saveToDesktop) { args.push('--desktop'); }

  try {
    const cli = findCliPath(context);
    if ('npx' in cli) {
      await execFileAsync('npx', [cli.npx, ...args], {
        timeout: 120000,
        env: process.env,
        shell: true,
      });
    } else {
      await execFileAsync(cli.node, [cli.script, ...args], {
        timeout: 120000,
        env: process.env,
      });
    }

    const action = await vscode.window.showInformationMessage(
      `MDExport: Exported ${fileName}.${format}`,
      'Open File',
      'Show in Explorer'
    );

    if (action === 'Open File') {
      vscode.env.openExternal(vscode.Uri.file(outputPath));
    } else if (action === 'Show in Explorer') {
      vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
    }
  } catch (error: any) {
    const stderr = error.stderr ? `\n${error.stderr}` : '';
    const msg = `MDExport error: ${error.message}${stderr}`;
    const channel = vscode.window.createOutputChannel('MDExport');
    channel.appendLine(msg);
    channel.show();
    vscode.window.showErrorMessage(`MDExport failed for ${fileName}.${format} — see Output panel for details.`);
  }
}

export async function quickExport(
  uri: vscode.Uri | undefined,
  format: 'pdf' | 'docx',
  context: vscode.ExtensionContext
) {
  const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;

  const mdExts = ['.md', '.mdx', '.markdown', '.mdown', '.mkd'];
  if (!filePath || !mdExts.includes(path.extname(filePath).toLowerCase())) {
    vscode.window.showErrorMessage('MDExport: Please open or select a Markdown file.');
    return;
  }

  await exportFile(filePath, format, context);
}
