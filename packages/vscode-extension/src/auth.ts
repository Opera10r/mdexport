import * as vscode from 'vscode';

const SECRET_KEY = 'mdexport.licenseKey';

export async function getLicenseKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return await context.secrets.get(SECRET_KEY);
}

export async function saveLicenseKey(key: string, context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.store(SECRET_KEY, key);
}

export async function deleteLicenseKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
}
