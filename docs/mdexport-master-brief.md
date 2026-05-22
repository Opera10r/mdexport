# BMAD Project Brief: MDExport
## Markdown → Beautiful PDF + DOCX
## CLI (free) + VS Code Extension ($5/month)

---

## Product Identity
- **Product Name:** MDExport
- **CLI Package:** `mdexport` (npm, free, open source)
- **VS Code Extension:** "MDExport" (VS Code Marketplace, $5/month)
- **Tagline:** Your markdown. Publication-ready in seconds.
- **GitHub Repo:** `ravensgatedev/mdexport` (monorepo)

---

## The Core Idea
You have a `.md` file open in VS Code. You want a beautiful PDF or DOCX — not a browser export, not a Pandoc config nightmare, not a Word copy-paste job. You right-click the file. You pick your font, your theme, your options. You click Export. It's done.

That's the whole product.

---

## Two Products, One Backend

```
mdexport (CLI — free, npm)
     |
     └── Basic PDF export, default theme, TOC
     └── Upsell message on every export → extension

MDExport (VS Code Extension — $5/month)
     |
     └── Full formatting suite
     └── PDF + DOCX both
     └── All 7 formatting options
     └── Right-click context menu
     └── Settings panel in VS Code sidebar
     └── License key auth (stored in VS Code secrets)
```

Both call the **same hosted API** (Cloudflare Worker) for rendering.
The API checks whether the request comes with a license key.
No key = basic PDF only.
Valid key = full feature set unlocked.

---

## Feature Matrix

| Feature | CLI (free) | Extension ($5/month) |
|---|---|---|
| PDF export | ✅ | ✅ |
| DOCX export | ❌ | ✅ |
| Font family picker | ❌ (default: Inter) | ✅ (5 families) |
| Color accent/theme | ❌ (default: clean) | ✅ (5 themes) |
| Cover page | ❌ | ✅ |
| Table of contents | ✅ basic | ✅ styled |
| Custom margins | ❌ | ✅ |
| Line spacing | ❌ | ✅ |
| Header/footer + page numbers | ❌ | ✅ |
| Logo upload | ❌ | ✅ |
| Syntax highlighting | ✅ default | ✅ theme-matched |
| Right-click export | ❌ | ✅ |
| VS Code settings panel | ❌ | ✅ |

---

## Tech Stack

### CLI
- **Runtime:** Node.js 18+
- **Framework:** commander.js
- **UX:** chalk + ora (spinner)
- **HTTP:** native fetch
- **Config:** `~/.mdexport/config.json`
- **Distribution:** npm (free, MIT license)

### VS Code Extension
- **Runtime:** VS Code Extension API (TypeScript)
- **Webview:** HTML/CSS/JS panel for settings UI
- **Auth:** VS Code SecretStorage API (secure license key storage)
- **HTTP:** node fetch from extension host
- **Distribution:** VS Code Marketplace
- **Pricing:** Stripe Payment Links → license key delivery

### Shared Backend (Cloudflare)
- **Worker:** Handles all render requests
- **PDF:** Cloudflare Browser Rendering (Puppeteer)
- **DOCX:** `docx` npm package (run in Worker)
- **Auth:** License key validation via Cloudflare KV
- **Hosting:** Cloudflare Workers (paid plan, $5/month flat)

---

## Repository Structure (Monorepo)

```
mdexport/
├── packages/
│   ├── cli/                    # Free npm package
│   │   ├── bin/
│   │   │   └── mdexport.js     # Entry point
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── export.js   # Export command
│   │   │   │   └── auth.js     # License key commands
│   │   │   ├── api.js          # API client
│   │   │   └── config.js       # Config file helpers
│   │   └── package.json
│   │
│   └── vscode-extension/       # Paid VS Code extension
│       ├── src/
│       │   ├── extension.ts    # Extension entry point
│       │   ├── exportPanel.ts  # Webview settings panel
│       │   ├── commands.ts     # Command registrations
│       │   ├── auth.ts         # License key + SecretStorage
│       │   └── api.ts          # API client (TypeScript)
│       ├── media/
│       │   ├── panel.html      # Settings panel UI
│       │   ├── panel.css
│       │   └── panel.js
│       ├── package.json        # Extension manifest
│       └── tsconfig.json
│
├── worker/                     # Shared Cloudflare Worker
│   ├── src/
│   │   ├── index.js            # Worker entry point
│   │   ├── render/
│   │   │   ├── pdf.js          # PDF generation pipeline
│   │   │   ├── docx.js         # DOCX generation pipeline
│   │   │   └── markdown.js     # Markdown → HTML parser
│   │   ├── themes/
│   │   │   ├── clean.css
│   │   │   ├── dark.css
│   │   │   ├── editorial.css
│   │   │   ├── technical.css
│   │   │   └── warm.css
│   │   ├── auth.js             # License key validation
│   │   └── kv.js               # KV helpers
│   └── wrangler.toml
│
├── landing/                    # Simple landing page
│   └── index.html              # mdexport.dev
│
└── README.md
```

---

## CLI Specification

### Install
```bash
npm install -g mdexport
```

### Commands

#### `mdexport export <file>`
```bash
# Basic usage (free)
mdexport export README.md

# With options (free tier respects --toc only)
mdexport export README.md --toc --output docs/readme.pdf

# With license key (unlocks all options)
mdexport export README.md \
  --format pdf \
  --theme editorial \
  --font serif \
  --toc \
  --cover \
  --cover-title "Project Documentation" \
  --margins normal \
  --line-spacing 1.5 \
  --header "My Project" \
  --footer "Confidential" \
  --page-numbers \
  --output docs/readme.pdf
```

#### `mdexport export <file> --format docx` (license required)
```bash
mdexport export README.md --format docx --theme clean --font sans
```

#### `mdexport auth login`
Prompts for license key. Validates. Saves to `~/.mdexport/config.json`.

#### `mdexport auth status`
Shows license status + feature tier.

#### `mdexport auth logout`
Removes license key.

### CLI Options Reference

```
--format <type>         pdf | docx (default: pdf; docx requires license)
--theme <name>          clean | dark | editorial | technical | warm
                        (free tier: clean only)
--font <family>         serif | sans | mono | humanist | slab
                        (free tier: sans only)
--toc                   Include table of contents
--cover                 Include cover page (license required)
--cover-title <text>    Cover page title (default: filename)
--cover-date            Include date on cover (default: true)
--logo <path>           Path to logo image for cover (license required)
--margins <size>        narrow | normal | wide (license required)
--line-spacing <n>      1.0 | 1.15 | 1.5 | 2.0 (license required)
--header <text>         Header text (license required)
--footer <text>         Footer text (license required)
--page-numbers          Include page numbers (license required)
--accent <color>        Hex color for accent (license required)
--output <path>         Output file path (default: input + .pdf/.docx)
--open                  Open file after export
```

### CLI Terminal UX

#### Free tier export
```
$ mdexport export README.md

  ✓ Reading README.md (3.8KB)
  ⠋ Rendering PDF...
  ✓ Exported: README.pdf (124KB) in 2.1s

  ─────────────────────────────────────────
  Want beautiful fonts, themes, DOCX export,
  cover pages + more?

  MDExport for VS Code — $5/month
  https://mdexport.dev
  ─────────────────────────────────────────
```

#### Licensed export
```
$ mdexport export README.md --theme editorial --font serif --cover --toc --format docx

  ✓ Reading README.md (3.8KB)
  ✓ License verified
  ⠋ Rendering DOCX with editorial theme...
  ✓ Exported: README.docx (89KB) in 2.8s
```

#### Watch mode
```
$ mdexport watch README.md --theme clean

  Watching README.md — press Ctrl+C to stop
  [14:22:01] ✓ README.pdf exported (1.9s)
  [14:23:44] ✓ README.pdf exported (2.1s)
```

---

## VS Code Extension Specification

### Extension Manifest (`package.json`) Key Sections

```json
{
  "name": "mdexport",
  "displayName": "MDExport — Markdown to PDF & DOCX",
  "description": "Export beautiful PDFs and DOCX files from Markdown with fonts, themes, cover pages and more.",
  "version": "1.0.0",
  "publisher": "ravensgatedev",
  "categories": ["Other", "Formatters"],
  "activationEvents": ["onLanguage:markdown"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "mdexport.exportPDF",
        "title": "MDExport: Export as PDF"
      },
      {
        "command": "mdexport.exportDOCX",
        "title": "MDExport: Export as DOCX"
      },
      {
        "command": "mdexport.openPanel",
        "title": "MDExport: Open Settings Panel"
      },
      {
        "command": "mdexport.enterLicense",
        "title": "MDExport: Enter License Key"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "when": "resourceExtname == .md",
          "command": "mdexport.exportPDF",
          "group": "navigation"
        },
        {
          "when": "resourceExtname == .md",
          "command": "mdexport.exportDOCX",
          "group": "navigation"
        }
      ],
      "editor/context": [
        {
          "when": "resourceExtname == .md",
          "command": "mdexport.exportPDF"
        },
        {
          "when": "resourceExtname == .md",
          "command": "mdexport.exportDOCX"
        }
      ]
    },
    "configuration": {
      "title": "MDExport",
      "properties": {
        "mdexport.defaultTheme": {
          "type": "string",
          "default": "clean",
          "enum": ["clean", "dark", "editorial", "technical", "warm"]
        },
        "mdexport.defaultFont": {
          "type": "string",
          "default": "sans",
          "enum": ["serif", "sans", "mono", "humanist", "slab"]
        },
        "mdexport.defaultFormat": {
          "type": "string",
          "default": "pdf",
          "enum": ["pdf", "docx"]
        },
        "mdexport.defaultMargins": {
          "type": "string",
          "default": "normal",
          "enum": ["narrow", "normal", "wide"]
        },
        "mdexport.defaultLineSpacing": {
          "type": "number",
          "default": 1.15
        },
        "mdexport.pageNumbers": {
          "type": "boolean",
          "default": true
        },
        "mdexport.toc": {
          "type": "boolean",
          "default": false
        }
      }
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "mdexport",
          "title": "MDExport",
          "icon": "media/icon.svg"
        }
      ]
    }
  }
}
```

### Extension Entry Point (`extension.ts`)

```typescript
import * as vscode from 'vscode';
import { ExportPanel } from './exportPanel';
import { exportFile } from './commands';
import { getLicenseKey, saveLicenseKey } from './auth';

export function activate(context: vscode.ExtensionContext) {

  // Register: Export as PDF (right-click)
  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.exportPDF', async (uri?: vscode.Uri) => {
      const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
      if (!filePath?.endsWith('.md')) {
        vscode.window.showErrorMessage('MDExport: Please open or select a Markdown file.');
        return;
      }
      await exportFile(filePath, 'pdf', context);
    })
  );

  // Register: Export as DOCX (right-click)
  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.exportDOCX', async (uri?: vscode.Uri) => {
      const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
      if (!filePath?.endsWith('.md')) {
        vscode.window.showErrorMessage('MDExport: Please open or select a Markdown file.');
        return;
      }
      await exportFile(filePath, 'docx', context);
    })
  );

  // Register: Open settings panel
  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.openPanel', () => {
      ExportPanel.createOrShow(context);
    })
  );

  // Register: Enter license key
  context.subscriptions.push(
    vscode.commands.registerCommand('mdexport.enterLicense', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your MDExport license key',
        password: true,
        placeHolder: 'mdexp_xxxxxxxxxxxxxxxxxxxxxxxx'
      });
      if (key) {
        await saveLicenseKey(key, context);
        vscode.window.showInformationMessage('✓ MDExport license activated! All features unlocked.');
      }
    })
  );
}

export function deactivate() {}
```

### Export Command (`commands.ts`)

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { callExportAPI } from './api';
import { getLicenseKey } from './auth';

export async function exportFile(
  filePath: string,
  format: 'pdf' | 'docx',
  context: vscode.ExtensionContext
) {
  const config = vscode.workspace.getConfiguration('mdexport');
  const licenseKey = await getLicenseKey(context);

  // Read markdown
  const markdown = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, '.md');

  // Build options from VS Code settings
  const options = {
    format,
    theme: config.get('defaultTheme', 'clean'),
    font: config.get('defaultFont', 'sans'),
    margins: config.get('defaultMargins', 'normal'),
    lineSpacing: config.get('defaultLineSpacing', 1.15),
    toc: config.get('toc', false),
    pageNumbers: config.get('pageNumbers', true),
  };

  // Show progress
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `MDExport: Rendering ${fileName}.${format}...`,
    cancellable: false
  }, async () => {
    try {
      const result = await callExportAPI(markdown, options, licenseKey);
      
      // Save file next to the source .md
      const outputPath = filePath.replace('.md', `.${format}`);
      fs.writeFileSync(outputPath, Buffer.from(result));

      // Notify + offer to open
      const action = await vscode.window.showInformationMessage(
        `✓ Exported: ${path.basename(outputPath)}`,
        'Open File',
        'Show in Explorer'
      );

      if (action === 'Open File') {
        vscode.env.openExternal(vscode.Uri.file(outputPath));
      } else if (action === 'Show in Explorer') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
      }

    } catch (error: any) {
      if (error.message === 'LICENSE_REQUIRED') {
        const action = await vscode.window.showErrorMessage(
          'MDExport: This feature requires a license.',
          'Enter License Key',
          'Get License ($5/month)'
        );
        if (action === 'Enter License Key') {
          vscode.commands.executeCommand('mdexport.enterLicense');
        } else if (action === 'Get License ($5/month)') {
          vscode.env.openExternal(vscode.Uri.parse('https://mdexport.dev'));
        }
      } else {
        vscode.window.showErrorMessage(`MDExport error: ${error.message}`);
      }
    }
  });
}
```

### Auth (`auth.ts`)

```typescript
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
```

### Settings Panel (`exportPanel.ts`)

The ExportPanel is a Webview that opens in the VS Code sidebar. It shows:
- Current file being exported
- Format toggle (PDF / DOCX)
- Theme picker (5 visual cards)
- Font family picker (5 options with preview text)
- Cover page section (toggle + title field + date toggle + logo upload)
- TOC toggle
- Margins selector (narrow/normal/wide)
- Line spacing slider
- Header/footer text fields
- Page numbers toggle
- Accent color picker
- Export button

The panel communicates with the extension via `vscode.postMessage`:
```javascript
// Panel → Extension
vscode.postMessage({ command: 'export', options: { format, theme, font, ... } });

// Extension → Panel
panel.webview.postMessage({ command: 'exportComplete', filePath });
panel.webview.postMessage({ command: 'exportError', message });
panel.webview.postMessage({ command: 'licenseStatus', licensed: true });
```

---

## Cloudflare Worker API

### Endpoints

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/export` | POST | License key (optional) | Main export endpoint |
| `/validate-license` | POST | License key | Validate + return tier |
| `/webhook` | POST | Stripe signature | Handle Stripe events |

### `/export` Request Schema

```json
{
  "markdown": "string",
  "format": "pdf | docx",
  "license_key": "string | null",
  "options": {
    "theme": "clean | dark | editorial | technical | warm",
    "font": "serif | sans | mono | humanist | slab",
    "toc": true,
    "cover": {
      "enabled": true,
      "title": "string",
      "date": true,
      "logo_base64": "string | null"
    },
    "margins": "narrow | normal | wide",
    "line_spacing": 1.15,
    "header": "string | null",
    "footer": "string | null",
    "page_numbers": true,
    "accent_color": "#hex | null"
  }
}
```

### Feature Gating in Worker

```javascript
async function handleExport(request, env) {
  const body = await request.json();
  const { markdown, format, license_key, options } = body;

  // Validate license (if provided)
  const licensed = license_key
    ? await validateLicense(license_key, env)
    : false;

  // Gate premium features
  if (!licensed) {
    if (format === 'docx') throw new Error('LICENSE_REQUIRED');
    // Override premium options to defaults
    options.theme = 'clean';
    options.font = 'sans';
    options.cover = { enabled: false };
    options.margins = 'normal';
    options.line_spacing = 1.15;
    options.header = null;
    options.footer = null;
    options.page_numbers = false;
    options.accent_color = null;
    // TOC still works in free tier
  }

  if (format === 'pdf') {
    return await renderPDF(markdown, options, env);
  } else {
    return await renderDOCX(markdown, options, env);
  }
}
```

### PDF Render Pipeline

```javascript
async function renderPDF(markdown, options, env) {
  // 1. Parse markdown → HTML
  const html = await parseMarkdown(markdown, options);

  // 2. Load theme + font CSS
  const css = buildCSS(options);

  // 3. Build full HTML document
  const fullHTML = buildHTMLDocument(html, css, options);

  // 4. Launch Cloudflare Browser Rendering
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: getMargins(options.margins),
    displayHeaderFooter: !!(options.header || options.footer || options.page_numbers),
    headerTemplate: buildHeaderTemplate(options),
    footerTemplate: buildFooterTemplate(options)
  });

  await browser.close();

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="export.pdf"'
    }
  });
}
```

### DOCX Render Pipeline

```javascript
import { Document, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';

async function renderDOCX(markdown, options, env) {
  // 1. Parse markdown to AST
  const ast = parseMarkdownToAST(markdown);

  // 2. Map AST nodes → docx elements
  const children = astToDocxElements(ast, options);

  // 3. Build document with styles
  const doc = new Document({
    styles: buildDocxStyles(options),  // fonts, heading sizes, spacing
    sections: [{
      properties: {
        page: {
          margin: getDocxMargins(options.margins)
        }
      },
      children: [
        ...buildCoverPage(options),    // if enabled
        ...buildTOC(ast, options),     // if enabled
        ...children
      ]
    }]
  });

  // 4. Generate buffer
  const buffer = await Packer.toBuffer(doc);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="export.docx"'
    }
  });
}
```

---

## Themes

| Theme | Vibe | Font Default | Accent |
|---|---|---|---|
| **Clean** | Minimal, white, timeless | Sans | #000000 |
| **Dark** | Code-first, dark bg | Mono | #7C3AED |
| **Editorial** | Magazine-feel, elegant | Serif | #B45309 |
| **Technical** | Dense, structured, docs | Sans | #0369A1 |
| **Warm** | Inviting, slightly off-white | Humanist | #92400E |

---

## Font Families

| Name | Fonts Used | Character |
|---|---|---|
| **Sans** | Inter / system-ui | Clean, modern, default |
| **Serif** | Lora / Georgia | Elegant, readable long-form |
| **Mono** | JetBrains Mono / Courier | Technical, code-heavy docs |
| **Humanist** | Nunito / Trebuchet | Warm, approachable |
| **Slab** | Roboto Slab / Rockwell | Strong, confident |

All fonts loaded via Google Fonts in the HTML document — no local font installation required.

---

## KV Schema

```
license:{key}  →  { email, status: "active|inactive", customer_id, subscription_id, created_at, exports_count }
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=      # Not needed for this tool — no AI involved
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=        # $5/month VS Code extension subscription
COOKIE_SECRET=
BROWSER=                # Cloudflare Browser Rendering binding
RESEND_API_KEY=         # For license key delivery emails
```

---

## License Key Delivery Flow

1. User buys at mdexport.dev → Stripe Checkout
2. Stripe fires `checkout.session.completed`
3. Worker generates license key: `mdexp_${randomUUID()}`
4. Worker writes to KV: `license:{key}` → user record
5. Worker sends email via Resend with license key
6. Success page also shows key (copy button)
7. User enters key in VS Code: `MDExport: Enter License Key`
8. Or enters in CLI: `mdexport auth login`

---

## MVP Scope

### Worker (build first)
- [ ] `/export` endpoint — PDF pipeline (Cloudflare Browser Rendering)
- [ ] `/export` endpoint — DOCX pipeline (docx npm package)
- [ ] Feature gating (licensed vs free)
- [ ] License key validation via KV
- [ ] Stripe webhook handler
- [ ] License key generation + Resend email delivery
- [ ] All 5 theme CSS files
- [ ] Font loading via Google Fonts

### CLI (build second)
- [ ] `export` command — basic PDF (free tier)
- [ ] `auth login/status/logout` commands
- [ ] Config file helpers
- [ ] API client
- [ ] Terminal UX (chalk + ora)
- [ ] Upsell message on free exports
- [ ] Published to npm

### VS Code Extension (build third)
- [ ] Right-click context menu (Export PDF, Export DOCX)
- [ ] `mdexport.enterLicense` command
- [ ] License key storage via SecretStorage
- [ ] Progress notification during export
- [ ] Success notification with Open File action
- [ ] License-required error with upsell action
- [ ] VS Code settings for defaults
- [ ] Published to VS Code Marketplace

### Post-MVP Extension
- [ ] Settings panel webview (full formatting UI)
- [ ] Watch mode (auto re-export on save)
- [ ] Batch export (select multiple .md files)
- [ ] Per-file export config (`.mdexportrc` in project root)
- [ ] Preview pane (show styled HTML before export)

---

## Launch Strategy

### Distribution
- **CLI:** npm — surfaces in searches, developers share it organically
- **Extension:** VS Code Marketplace — 35M+ users, searchable, featured sections
- **Landing:** mdexport.dev — clean page, demo GIF, subscribe button

### Marketing
- "Show HN: I built a Markdown → beautiful PDF/DOCX exporter for VS Code"
- Dev.to post: "Stop fighting Pandoc — export gorgeous PDFs from Markdown in one command"
- Twitter/X demo video: screen record the right-click → beautiful PDF appearing in 2 seconds
- Reddit: r/vscode, r/webdev, r/programming
- VS Code Marketplace listing optimization (keywords: markdown pdf, markdown export, md to pdf)

### The Hook
Every free CLI export shows the upsell. Every person who installs the free CLI is warm. The VS Code Marketplace listing is the closer.

---

## BMAD Build Instructions for Claude Code

### Session 1 — Worker Foundation
Scaffold monorepo structure. Set up `wrangler.toml` with Browser Rendering binding. Build Worker skeleton with all endpoints. Implement KV helpers. Implement license key generation. Implement Stripe webhook handler. Implement Resend email sender.

### Session 2 — PDF Pipeline
Build markdown → HTML parser in Worker. Build all 5 theme CSS files. Build font loading logic (Google Fonts URLs). Build `buildHTMLDocument()` function with all options (margins, header/footer, cover page, TOC). Integrate Cloudflare Browser Rendering. Test PDF output with 5 sample markdown files across all themes.

### Session 3 — DOCX Pipeline
Install `docx` npm package in Worker. Build `parseMarkdownToAST()`. Build `astToDocxElements()` — handle: paragraphs, headings (H1-H4), bold, italic, inline code, code blocks, blockquotes, ordered/unordered lists, images, tables, horizontal rules. Build `buildDocxStyles()` for all 5 font families. Build cover page + TOC for DOCX. Test output in Word and Google Docs.

### Session 4 — CLI Package
Scaffold `packages/cli`. Set up commander.js with all commands. Build config file helpers. Build API client (sends markdown + options + license key to Worker). Build `export` command with chalk + ora UX. Build `auth` commands. Add upsell message to free tier exports. Test full flow: free export, licensed export, auth commands. Publish to npm.

### Session 5 — VS Code Extension (Core)
Scaffold `packages/vscode-extension`. Set up `package.json` manifest with commands, menus, configuration. Build `extension.ts` entry point. Build `commands.ts` export handler. Build `auth.ts` with SecretStorage. Build `api.ts` API client. Register right-click context menu items. Implement progress notification + success/error messages. Implement license-required error with upsell. Test in VS Code Extension Development Host. Publish to VS Code Marketplace.

### Session 6 — Settings Panel (Post-MVP but worth doing)
Build `exportPanel.ts` Webview panel. Build `media/panel.html` with full formatting UI — theme cards, font picker, cover page fields, logo upload, all toggles. Wire postMessage communication between panel and extension. Persist panel settings to VS Code config. Add "Open Export Panel" to activity bar.

---

*MDExport | Raven's Gate Dev Tools | Built with Claude Code + BMAD*
