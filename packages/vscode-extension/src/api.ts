import * as vscode from 'vscode';

interface ExportOptions {
  format: 'pdf' | 'docx';
  theme: string;
  font: string;
  toc: boolean;
  cover: { enabled: boolean; title?: string; date?: boolean; logo_base64?: string | null };
  margins: string;
  line_spacing: number;
  header: string | null;
  footer: string | null;
  page_numbers: boolean;
  accent_color: string | null;
}

interface ValidateResult {
  valid: boolean;
  email?: string;
  status?: string;
  exports_count?: number;
}

function getApiUrl(): string {
  const config = vscode.workspace.getConfiguration('mdexport');
  return config.get('apiUrl', 'https://mdexport-worker.ravensgatedev.workers.dev');
}

export async function callExportAPI(
  markdown: string,
  options: ExportOptions,
  licenseKey: string | undefined
): Promise<ArrayBuffer> {
  const apiUrl = getApiUrl();

  const body = {
    markdown,
    format: options.format,
    license_key: licenseKey || null,
    options: {
      theme: options.theme,
      font: options.font,
      toc: options.toc,
      cover: options.cover,
      margins: options.margins,
      line_spacing: options.line_spacing,
      header: options.header,
      footer: options.footer,
      page_numbers: options.page_numbers,
      accent_color: options.accent_color,
    },
  };

  const res = await fetch(`${apiUrl}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg: string;
    try {
      const err = await res.json() as { error?: string; message?: string };
      errMsg = err.error || err.message || `HTTP ${res.status}`;
    } catch {
      errMsg = `HTTP ${res.status}`;
    }
    throw new Error(errMsg);
  }

  return await res.arrayBuffer();
}

export async function validateLicenseAPI(licenseKey: string): Promise<ValidateResult> {
  const apiUrl = getApiUrl();

  const res = await fetch(`${apiUrl}/validate-license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey }),
  });

  if (!res.ok) {
    throw new Error(`Validation failed (${res.status})`);
  }

  return (await res.json()) as ValidateResult;
}
