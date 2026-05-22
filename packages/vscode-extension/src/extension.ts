import * as vscode from 'vscode';
import { quickExport } from './commands';
import { getLicenseKey, saveLicenseKey, deleteLicenseKey } from './auth';
import { validateLicenseAPI } from './api';
import { ExportPanel } from './exportPanel';

export function activate(context: vscode.ExtensionContext) {

  // ── Export as PDF (right-click + command palette) ──────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.exportPDF', async (uri?: vscode.Uri) => {
      await quickExport(uri, 'pdf', context);
    })
  );

  // ── Export as DOCX (right-click + command palette) ─────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.exportDOCX', async (uri?: vscode.Uri) => {
      await quickExport(uri, 'docx', context);
    })
  );

  // ── Open Export Panel ──────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.openPanel', () => {
      ExportPanel.createOrShow(context);
    })
  );

  // ── Enter License Key ─────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.enterLicense', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your MDExport license key',
        password: true,
        placeHolder: 'mdexp_xxxxxxxxxxxxxxxxxxxxxxxx',
        validateInput: (value) => {
          if (value && !value.startsWith('mdexp_')) {
            return 'License keys start with mdexp_';
          }
          return null;
        },
      });

      if (!key) { return; }

      try {
        const result = await validateLicenseAPI(key);
        if (result.valid) {
          await saveLicenseKey(key, context);
          vscode.window.showInformationMessage(
            `MDExport: License activated! All features unlocked. (${result.email})`
          );
        } else {
          vscode.window.showErrorMessage('MDExport: Invalid or expired license key.');
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`MDExport: Could not validate key — ${err.message}`);
      }
    })
  );

  // ── License Status ────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.licenseStatus', async () => {
      const key = await getLicenseKey(context);

      if (!key) {
        const action = await vscode.window.showInformationMessage(
          'MDExport: No license key configured. Free tier active.',
          'Enter License Key',
          'Get License ($1/month)'
        );
        if (action === 'Enter License Key') {
          vscode.commands.executeCommand('mdexport.enterLicense');
        } else if (action === 'Get License ($1/month)') {
          vscode.env.openExternal(vscode.Uri.parse('https://mdexport.dev'));
        }
        return;
      }

      try {
        const result = await validateLicenseAPI(key);
        if (result.valid) {
          vscode.window.showInformationMessage(
            `MDExport: License active — ${result.email} — ${result.exports_count} exports`
          );
        } else {
          const action = await vscode.window.showWarningMessage(
            'MDExport: License key on file is no longer valid.',
            'Enter New Key',
            'Remove Key'
          );
          if (action === 'Enter New Key') {
            vscode.commands.executeCommand('mdexport.enterLicense');
          } else if (action === 'Remove Key') {
            await deleteLicenseKey(context);
            vscode.window.showInformationMessage('MDExport: License key removed.');
          }
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`MDExport: Could not check license — ${err.message}`);
      }
    })
  );
}

export function deactivate() {}
