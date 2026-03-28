import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function exportFile(
  filePath: string,
  format: 'pdf' | 'docx',
  context: vscode.ExtensionContext
) {
  const config = vscode.workspace.getConfiguration('mdexport');
  const fileName = path.basename(filePath, '.md');

  const font = config.get<string>('defaultFont', 'sans');
  const theme = config.get<string>('defaultTheme', 'clean');
  const toc = config.get<boolean>('toc', false);
  const margins = config.get<string>('defaultMargins', 'normal');
  const lineSpacing = config.get<number>('defaultLineSpacing', 1.15);
  const pageNumbers = config.get<boolean>('pageNumbers', true);

  // Build CLI args
  const args = [
    'export', filePath,
    '--local',
    '--format', format,
    '--font', font,
    '--theme', theme,
    '--margins', margins,
    '--line-spacing', String(lineSpacing),
  ];
  if (toc) { args.push('--toc'); }
  if (pageNumbers) { args.push('--page-numbers'); }

  // Output defaults to Desktop
  const desktop = process.env.HOME
    ? path.join(process.env.HOME, 'Desktop')
    : path.join(process.env.USERPROFILE || '', 'Desktop');
  const outputPath = path.join(desktop, `${fileName}.${format}`);

  try {
    const shellArgs = args.map(a => `"${a}"`).join(' ');
    await execAsync(`/opt/homebrew/opt/node@20/bin/node /Users/parsifal2.0/Desktop/mdexport/packages/cli/bin/mdexport.js ${shellArgs}`, {
      timeout: 120000,
    });

    const action = await vscode.window.showInformationMessage(
      `MDExport: Exported ${fileName}.${format} to Desktop`,
      'Open File',
      'Show in Explorer'
    );

    if (action === 'Open File') {
      vscode.env.openExternal(vscode.Uri.file(outputPath));
    } else if (action === 'Show in Explorer') {
      vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`MDExport error: ${error.message}`);
  }
}

export async function quickExport(
  uri: vscode.Uri | undefined,
  format: 'pdf' | 'docx',
  context: vscode.ExtensionContext
) {
  const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;

  if (!filePath?.endsWith('.md')) {
    vscode.window.showErrorMessage('MDExport: Please open or select a Markdown file.');
    return;
  }

  await exportFile(filePath, format, context);
}
