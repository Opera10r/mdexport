import * as vscode from 'vscode';
import * as path from 'path';
import { exportFile } from './commands';
import { getLicenseKey } from './auth';

export class ExportPanel {
  public static currentPanel: ExportPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ExportPanel.currentPanel) {
      ExportPanel.currentPanel._panel.reveal(column);
      ExportPanel.currentPanel._update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'mdexportPanel',
      'MDExport',
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
      }
    );

    ExportPanel.currentPanel = new ExportPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._context = context;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'export': {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.document.fileName.endsWith('.md')) {
              vscode.window.showErrorMessage('MDExport: No markdown file open.');
              this._panel.webview.postMessage({ command: 'exportError', message: 'No .md file open' });
              return;
            }
            this._panel.webview.postMessage({ command: 'exportStarted' });
            await exportFile(editor.document.fileName, message.format, this._context);
            this._panel.webview.postMessage({ command: 'exportComplete' });
            break;
          }
          case 'saveSettings': {
            const config = vscode.workspace.getConfiguration('mdexport');
            const s = message.settings;
            if (s.theme) { await config.update('defaultTheme', s.theme, true); }
            if (s.font) { await config.update('defaultFont', s.font, true); }
            if (s.margins) { await config.update('defaultMargins', s.margins, true); }
            if (s.lineSpacing) { await config.update('defaultLineSpacing', s.lineSpacing, true); }
            if (s.toc !== undefined) { await config.update('toc', s.toc, true); }
            if (s.pageNumbers !== undefined) { await config.update('pageNumbers', s.pageNumbers, true); }
            break;
          }
          case 'enterLicense': {
            vscode.commands.executeCommand('mdexport.enterLicense');
            break;
          }
          case 'getLicense': {
            vscode.env.openExternal(vscode.Uri.parse('https://mdexport.dev'));
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  private async _update() {
    const licenseKey = await getLicenseKey(this._context);
    const config = vscode.workspace.getConfiguration('mdexport');
    const activeFile = vscode.window.activeTextEditor?.document.fileName;
    const fileName = activeFile?.endsWith('.md') ? path.basename(activeFile) : null;

    this._panel.webview.html = this._getHTML({
      licensed: !!licenseKey,
      theme: config.get('defaultTheme', 'clean'),
      font: config.get('defaultFont', 'sans'),
      format: config.get('defaultFormat', 'pdf'),
      margins: config.get('defaultMargins', 'normal'),
      lineSpacing: config.get('defaultLineSpacing', 1.15),
      toc: config.get('toc', false),
      pageNumbers: config.get('pageNumbers', true),
      fileName,
    });
  }

  private _getHTML(state: {
    licensed: boolean;
    theme: string;
    font: string;
    format: string;
    margins: string;
    lineSpacing: number;
    toc: boolean;
    pageNumbers: boolean;
    fileName: string | null;
  }): string {
    const pro = (label: string) => !state.licensed ? `${label} <span class="pro">PRO</span>` : label;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --radius: 6px;
      --gap: 8px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      padding: 20px;
      line-height: 1.5;
    }

    /* ── Header ──────────────────────────────── */

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
    }
    .brand { font-weight: 700; font-size: 16px; }
    .brand span { font-weight: 400; color: var(--vscode-descriptionForeground); }

    .license-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .license-free {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      cursor: pointer;
    }
    .license-free:hover { opacity: 0.8; }
    .license-pro {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
    }

    /* ── Active File ─────────────────────────── */

    .active-file {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--radius);
      padding: 10px 14px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .file-icon {
      width: 18px;
      height: 18px;
      background: var(--vscode-badge-background);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: var(--vscode-badge-foreground);
      flex-shrink: 0;
    }
    .file-name { font-weight: 600; }
    .no-file { color: var(--vscode-descriptionForeground); font-style: italic; }

    /* ── Sections ────────────────────────────── */

    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
    }

    /* ── Theme Cards ─────────────────────────── */

    .theme-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
    }
    .theme-card {
      position: relative;
      padding: 10px 4px 8px;
      border: 2px solid var(--vscode-widget-border);
      border-radius: var(--radius);
      cursor: pointer;
      text-align: center;
      font-size: 10px;
      transition: all 0.15s ease;
      user-select: none;
    }
    .theme-card:hover { border-color: var(--vscode-focusBorder); transform: translateY(-1px); }
    .theme-card.active {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .theme-card .swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin: 0 auto 6px auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .theme-card .preview {
      height: 32px;
      border-radius: 3px;
      margin: 0 2px 6px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 4px 6px;
      font-size: 7px;
      text-align: left;
      line-height: 1.3;
    }
    .theme-card .preview .ph { border-radius: 1px; height: 2px; margin: 1px 0; opacity: 0.4; }
    .theme-card.locked { opacity: 0.4; }
    .theme-card.locked::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--radius);
      cursor: not-allowed;
    }

    /* ── Controls ─────────────────────────────── */

    .control-row {
      display: flex;
      align-items: center;
      margin: 6px 0;
      gap: 10px;
    }
    .control-row label {
      min-width: 90px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    select {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 5px 8px;
      border-radius: var(--radius);
      font-size: 12px;
      flex: 1;
      cursor: pointer;
      outline: none;
    }
    select:focus { border-color: var(--vscode-focusBorder); }
    select:disabled { opacity: 0.4; cursor: not-allowed; }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      padding: 6px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.1s;
    }
    .toggle-row:hover { background: var(--vscode-list-hoverBackground); }
    .toggle-row input[type="checkbox"] { cursor: pointer; accent-color: var(--accent); }
    .toggle-row label { cursor: pointer; font-size: 12px; flex: 1; }
    .toggle-row.disabled { opacity: 0.4; pointer-events: none; }

    .pro {
      display: inline-block;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      font-weight: 600;
      letter-spacing: 0.3px;
      vertical-align: middle;
      margin-left: 4px;
    }

    /* ── Buttons ──────────────────────────────── */

    .btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 24px;
    }
    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: var(--radius);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
      overflow: hidden;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
    }
    .btn-primary:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
    .btn.loading { pointer-events: none; }
    .btn.loading::after {
      content: '';
      position: absolute;
      inset: 0;
      background: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-full { grid-column: 1 / -1; }

    /* ── Upsell ──────────────────────────────── */

    .upsell {
      margin-top: 20px;
      padding: 14px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 8%, transparent), color-mix(in srgb, #8b5cf6 8%, transparent));
      border: 1px solid color-mix(in srgb, #3b82f6 20%, transparent);
      text-align: center;
    }
    .upsell-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .upsell-desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }
    .upsell-features {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      margin-bottom: 12px;
    }
    .upsell-feat {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .upsell-btn {
      display: inline-block;
      padding: 6px 20px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .upsell-btn:hover { opacity: 0.9; }
    .upsell-link {
      display: block;
      margin-top: 6px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      text-decoration: underline;
    }

    /* ── Status Bar ──────────────────────────── */

    .status {
      margin-top: 16px;
      padding: 8px 12px;
      border-radius: var(--radius);
      font-size: 11px;
      text-align: center;
      display: none;
    }
    .status.success {
      display: block;
      background: color-mix(in srgb, #22c55e 15%, transparent);
      color: #22c55e;
      border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
    }
    .status.error {
      display: block;
      background: color-mix(in srgb, #ef4444 15%, transparent);
      color: #ef4444;
      border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    }

    /* ── Footer ──────────────────────────────── */

    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border);
      text-align: center;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">M</div>
      <div class="brand">MDExport <span>v1.0</span></div>
    </div>
    ${state.licensed
      ? '<span class="license-badge license-pro">PRO</span>'
      : '<span class="license-badge license-free" id="upgradeBadge">FREE</span>'
    }
  </div>

  <!-- Active File -->
  <div class="active-file">
    <div class="file-icon">md</div>
    ${state.fileName
      ? `<span class="file-name">${state.fileName}</span>`
      : '<span class="no-file">Open a .md file to export</span>'
    }
  </div>

  <!-- Theme -->
  <div class="section">
    <div class="section-title">Theme</div>
    <div class="theme-grid">
      <div class="theme-card ${state.theme === 'clean' ? 'active' : ''}" data-theme="clean">
        <div class="preview" style="background:#fff;">
          <div class="ph" style="background:#000;width:60%"></div>
          <div class="ph" style="background:#666;width:100%"></div>
          <div class="ph" style="background:#666;width:80%"></div>
        </div>
        Clean
      </div>
      <div class="theme-card ${state.theme === 'dark' ? 'active' : ''} ${!state.licensed ? 'locked' : ''}" data-theme="dark">
        <div class="preview" style="background:#18181b;">
          <div class="ph" style="background:#a78bfa;width:60%"></div>
          <div class="ph" style="background:#71717a;width:100%"></div>
          <div class="ph" style="background:#71717a;width:80%"></div>
        </div>
        Dark
      </div>
      <div class="theme-card ${state.theme === 'editorial' ? 'active' : ''} ${!state.licensed ? 'locked' : ''}" data-theme="editorial">
        <div class="preview" style="background:#fffbf5;">
          <div class="ph" style="background:#b45309;width:60%"></div>
          <div class="ph" style="background:#78350f;width:100%"></div>
          <div class="ph" style="background:#78350f;width:80%"></div>
        </div>
        Editorial
      </div>
      <div class="theme-card ${state.theme === 'technical' ? 'active' : ''} ${!state.licensed ? 'locked' : ''}" data-theme="technical">
        <div class="preview" style="background:#fff;">
          <div class="ph" style="background:#0369a1;width:60%"></div>
          <div class="ph" style="background:#334155;width:100%"></div>
          <div class="ph" style="background:#334155;width:80%"></div>
        </div>
        Technical
      </div>
      <div class="theme-card ${state.theme === 'warm' ? 'active' : ''} ${!state.licensed ? 'locked' : ''}" data-theme="warm">
        <div class="preview" style="background:#faf8f5;">
          <div class="ph" style="background:#92400e;width:60%"></div>
          <div class="ph" style="background:#57534e;width:100%"></div>
          <div class="ph" style="background:#57534e;width:80%"></div>
        </div>
        Warm
      </div>
    </div>
  </div>

  <!-- Typography -->
  <div class="section">
    <div class="section-title">Typography</div>
    <div class="control-row">
      <label>Font</label>
      <select id="font" ${!state.licensed ? 'disabled' : ''}>
        <option value="sans" ${state.font === 'sans' ? 'selected' : ''}>Inter (Sans)</option>
        <option value="serif" ${state.font === 'serif' ? 'selected' : ''}>Lora (Serif)</option>
        <option value="mono" ${state.font === 'mono' ? 'selected' : ''}>JetBrains Mono</option>
        <option value="humanist" ${state.font === 'humanist' ? 'selected' : ''}>Nunito (Humanist)</option>
        <option value="slab" ${state.font === 'slab' ? 'selected' : ''}>Roboto Slab</option>
      </select>
    </div>
    <div class="control-row">
      <label>Spacing</label>
      <select id="lineSpacing" ${!state.licensed ? 'disabled' : ''}>
        <option value="1" ${state.lineSpacing === 1.0 ? 'selected' : ''}>Tight (1.0)</option>
        <option value="1.15" ${state.lineSpacing === 1.15 ? 'selected' : ''}>Default (1.15)</option>
        <option value="1.5" ${state.lineSpacing === 1.5 ? 'selected' : ''}>Relaxed (1.5)</option>
        <option value="2" ${state.lineSpacing === 2.0 ? 'selected' : ''}>Double (2.0)</option>
      </select>
    </div>
  </div>

  <!-- Layout -->
  <div class="section">
    <div class="section-title">Layout</div>
    <div class="control-row">
      <label>Margins</label>
      <select id="margins" ${!state.licensed ? 'disabled' : ''}>
        <option value="narrow" ${state.margins === 'narrow' ? 'selected' : ''}>Narrow (0.5in)</option>
        <option value="normal" ${state.margins === 'normal' ? 'selected' : ''}>Normal (0.75in)</option>
        <option value="wide" ${state.margins === 'wide' ? 'selected' : ''}>Wide (1.25in)</option>
      </select>
    </div>
  </div>

  <!-- Options -->
  <div class="section">
    <div class="section-title">Options</div>
    <div class="toggle-row" onclick="document.getElementById('toc').click()">
      <input type="checkbox" id="toc" ${state.toc ? 'checked' : ''} onclick="event.stopPropagation()" />
      <label for="toc">Table of Contents</label>
    </div>
    <div class="toggle-row ${!state.licensed ? 'disabled' : ''}" onclick="document.getElementById('pageNumbers').click()">
      <input type="checkbox" id="pageNumbers" ${state.pageNumbers ? 'checked' : ''} ${!state.licensed ? 'disabled' : ''} onclick="event.stopPropagation()" />
      <label for="pageNumbers">${pro('Page Numbers')}</label>
    </div>
  </div>

  <!-- Export Buttons -->
  <div class="btn-group">
    <button class="btn btn-primary" id="exportPdfBtn" ${!state.fileName ? 'disabled' : ''}>
      Export PDF
    </button>
    <button class="btn btn-secondary" id="exportDocxBtn" ${!state.fileName || !state.licensed ? 'disabled' : ''}>
      ${pro('Export DOCX')}
    </button>
  </div>

  <!-- Status -->
  <div class="status" id="status"></div>

  <!-- Upsell (free tier only) -->
  ${!state.licensed ? `
  <div class="upsell">
    <div class="upsell-title">Unlock MDExport Pro</div>
    <div class="upsell-desc">$5/month &middot; Cancel anytime</div>
    <div class="upsell-features">
      <span class="upsell-feat">4 Themes</span>
      <span class="upsell-feat">5 Fonts</span>
      <span class="upsell-feat">DOCX</span>
      <span class="upsell-feat">Cover Pages</span>
      <span class="upsell-feat">Headers</span>
    </div>
    <button class="upsell-btn" id="getProBtn">Get MDExport Pro</button>
    <span class="upsell-link" id="hasKeyLink">I already have a key</span>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    Built by Raven's Gate Dev Tools
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const statusEl = document.getElementById('status');

    // ── Theme selection ──────────────────────
    document.querySelectorAll('.theme-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        saveSettings();
      });
    });

    // ── Export buttons ───────────────────────
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      saveSettings();
      vscode.postMessage({ command: 'export', format: 'pdf' });
    });
    document.getElementById('exportDocxBtn')?.addEventListener('click', () => {
      saveSettings();
      vscode.postMessage({ command: 'export', format: 'docx' });
    });

    // ── Upsell buttons ──────────────────────
    document.getElementById('getProBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'getLicense' });
    });
    document.getElementById('hasKeyLink')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'enterLicense' });
    });
    document.getElementById('upgradeBadge')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'getLicense' });
    });

    // ── Save settings on any change ─────────
    ['font', 'margins', 'lineSpacing'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', saveSettings);
    });
    ['toc', 'pageNumbers'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', saveSettings);
    });

    function saveSettings() {
      const activeTheme = document.querySelector('.theme-card.active');
      vscode.postMessage({
        command: 'saveSettings',
        settings: {
          theme: activeTheme ? activeTheme.dataset.theme : 'clean',
          font: document.getElementById('font').value,
          margins: document.getElementById('margins').value,
          lineSpacing: parseFloat(document.getElementById('lineSpacing').value),
          toc: document.getElementById('toc').checked,
          pageNumbers: document.getElementById('pageNumbers').checked,
        }
      });
    }

    // ── Status messages from extension ───────
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'exportStarted') {
        statusEl.className = 'status';
        statusEl.style.display = 'none';
        document.getElementById('exportPdfBtn').classList.add('loading');
        document.getElementById('exportDocxBtn')?.classList.add('loading');
      }
      if (msg.command === 'exportComplete') {
        document.getElementById('exportPdfBtn').classList.remove('loading');
        document.getElementById('exportDocxBtn')?.classList.remove('loading');
        showStatus('Exported successfully', 'success');
      }
      if (msg.command === 'exportError') {
        document.getElementById('exportPdfBtn').classList.remove('loading');
        document.getElementById('exportDocxBtn')?.classList.remove('loading');
        showStatus(msg.message || 'Export failed', 'error');
      }
    });

    function showStatus(text, type) {
      statusEl.textContent = text;
      statusEl.className = 'status ' + type;
      setTimeout(() => {
        statusEl.className = 'status';
        statusEl.style.display = 'none';
      }, 4000);
    }
  </script>
</body>
</html>`;
  }

  public dispose() {
    ExportPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
