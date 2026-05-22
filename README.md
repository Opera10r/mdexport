# MDExport

**Your markdown. Publication-ready in seconds.**

Export beautiful PDFs and DOCX files from Markdown with themes, fonts, cover pages, and more.

## Products

| Product | Distribution | Price |
|---|---|---|
| `mdexport` CLI | [npm](https://www.npmjs.com/package/mdexport) | Free (MIT) |
| MDExport for VS Code | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ravensgatedev.mdexport) | $1/month |

## Monorepo Structure

```
mdexport/
├── packages/
│   ├── cli/                    # Free npm CLI
│   └── vscode-extension/       # Paid VS Code extension
├── worker/                     # Cloudflare Worker (shared backend)
├── landing/                    # mdexport.dev landing page
└── README.md
```

## Quick Start

### CLI (free)

```bash
npm install -g mdexport
mdexport export README.md
```

### VS Code Extension

1. Install from VS Code Marketplace
2. Right-click any `.md` file → Export as PDF
3. Open command palette → `MDExport: Enter License Key` to unlock Pro

## Development

```bash
# Worker
cd worker && npm install && npm run dev

# CLI
cd packages/cli && npm install && node bin/mdexport.js

# VS Code Extension
cd packages/vscode-extension && npm install && npm run build
# Then press F5 in VS Code to launch Extension Development Host
```

## Architecture

- **CLI** — Fully local. Renders PDF/DOCX on your machine using Puppeteer. No API calls, no license needed.
- **VS Code Extension** — Also renders locally. Calls the Cloudflare Worker only for license validation.
- **Worker** — Handles license key validation (via Cloudflare KV), Stripe webhook processing, and license key delivery via Resend email.

## License

CLI: MIT
VS Code Extension: Proprietary (subscription)

---

Built by Raven's Gate Dev Tools
