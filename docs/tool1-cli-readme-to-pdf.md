# BMAD Project Brief: README → Gorgeous Branded PDF
## Format: CLI Tool (npm)
## Tool 1 of 5 | CLI Version

---

## Product Identity
- **Package Name:** `readme-pdf`
- **Install:** `npm install -g readme-pdf`
- **Usage:** `readme-pdf export README.md --theme dark --cover`
- **Price:** $5/month (license key model)
- **Target User:** Developers who live in the terminal, OSS maintainers, devs in CI/CD pipelines

---

## Problem Statement
Developers don't want to open a browser to export a PDF. They want to type one command in the terminal and have a PDF appear next to their file. No GUI. No upload. No account dashboard. Just `readme-pdf export README.md` and done.

---

## Product Overview
A Node.js CLI tool installed globally via npm. Runs locally. Sends Markdown to a hosted rendering API. Returns a PDF file.

```bash
# Basic usage
readme-pdf export README.md

# With options
readme-pdf export README.md --theme corporate --cover --toc --output docs/readme.pdf

# Authenticate
readme-pdf auth login
readme-pdf auth status

# Watch mode (re-exports on save)
readme-pdf watch README.md --theme clean
```

---

## Tech Stack
- **Runtime:** Node.js 18+
- **Package:** npm (published to npmjs.com)
- **CLI Framework:** `commander.js` (argument parsing)
- **HTTP Client:** native `fetch` (Node 18+)
- **Config Storage:** `~/.readme-pdf/config.json` (license key + preferences)
- **PDF Rendering:** Calls hosted ReadmePDF API (same Cloudflare Worker as web app)
- **Auth Model:** License key (not OAuth — simpler for CLI)
- **Payment:** Stripe Payment Links ($5/month subscription → delivers license key via email)

---

## Architecture

```
[Terminal]
  readme-pdf export README.md --theme dark
     |
     | 1. Read ~/.readme-pdf/config.json for license key
     | 2. Read README.md from disk
     | 3. POST to https://api.readmepdf.com/export
     |    { markdown, theme, options, license_key }
     v
[ReadmePDF Cloudflare Worker API]
     |-- Validate license key against KV
     |-- Render PDF via Browser Rendering
     |-- Return PDF binary
     v
[CLI writes PDF to disk]
  ✓ Exported: README.pdf (47KB) in 2.3s
```

---

## File Structure (npm package)
```
readme-pdf/
├── bin/
│   └── readme-pdf.js        # Entry point (#!/usr/bin/env node)
├── src/
│   ├── commands/
│   │   ├── export.js        # Export command logic
│   │   ├── watch.js         # Watch mode
│   │   └── auth.js          # Login/status/logout
│   ├── api.js               # API client (calls Worker)
│   ├── config.js            # Read/write ~/.readme-pdf/config.json
│   └── themes.js            # Theme name validation + defaults
├── package.json
├── README.md
└── .npmignore
```

---

## CLI Commands

### `readme-pdf export <file>`
```
Options:
  --theme <name>        Theme: clean, dark, corporate, github (default: clean)
  --output <path>       Output file path (default: same dir as input, .pdf extension)
  --cover               Add cover page
  --cover-title <text>  Cover page title (default: filename)
  --toc                 Add table of contents
  --page-numbers        Add page numbers
  --header <text>       Header text
  --footer <text>       Footer text
  --open                Open PDF after export
```

### `readme-pdf watch <file>`
```
Options:
  --theme <name>        Theme (same as export)
  --output <path>       Output path
  --delay <ms>          Debounce delay in ms (default: 500)
```

### `readme-pdf auth login`
Prompts for license key. Validates against API. Saves to config.

### `readme-pdf auth status`
Shows current license key (masked), subscription status, export count.

### `readme-pdf auth logout`
Removes license key from config.

### `readme-pdf themes`
Lists available themes with descriptions.

---

## Config File (`~/.readme-pdf/config.json`)
```json
{
  "license_key": "rmpdf_xxxxxxxxxxxxxxxxxxxx",
  "default_theme": "clean",
  "default_toc": false,
  "default_page_numbers": true,
  "api_url": "https://api.readmepdf.com"
}
```

---

## API Changes for CLI Support

The existing ReadmePDF Cloudflare Worker needs one additional auth method:

### License Key Auth (new, parallel to cookie auth)
```javascript
// In Worker /export handler
async function validateRequest(request, env) {
  // Method 1: Cookie (web app users)
  const cookie = getCookie(request, 'session');
  if (cookie) return validateCookie(cookie, env);
  
  // Method 2: License key (CLI users)
  const licenseKey = request.headers.get('X-License-Key');
  if (licenseKey) return validateLicenseKey(licenseKey, env);
  
  return { valid: false };
}
```

### KV Schema Addition
```json
{
  "license_key": "rmpdf_xxxxxxxxxxxxxxxxxxxx",
  "status": "active|inactive",
  "customer_id": "cus_xxx",
  "subscription_id": "sub_xxx",
  "exports_count": 0
}
```
KV key: `license:{license_key}` → maps to user email
KV key: `user:{email}` → main user record

### License Key Generation
On Stripe `checkout.session.completed`:
```javascript
const licenseKey = `rmpdf_${crypto.randomUUID().replace(/-/g, '')}`;
// Write to KV: license:{key} = { email, status: 'active' }
// Email license key to customer via... (see below)
```

### License Key Delivery
Options (pick one for MVP):
1. **Redirect page** — after Stripe checkout, show license key on success page + "copy this key"
2. **Email via Resend.com** — free tier (3000 emails/month), send license key in email
Recommended: Resend.com (professional, costs nothing at this scale)

---

## package.json
```json
{
  "name": "readme-pdf",
  "version": "1.0.0",
  "description": "Export beautiful PDFs from Markdown files",
  "bin": {
    "readme-pdf": "./bin/readme-pdf.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "chokidar": "^3.5.3"
  },
  "keywords": ["markdown", "pdf", "readme", "export", "cli"],
  "license": "MIT"
}
```

---

## CLI UX Details

### Export Success
```
$ readme-pdf export README.md --theme dark --toc

  ✓ Reading README.md (4.2KB)
  ✓ Validating license...
  ⠋ Rendering PDF...
  ✓ Exported: README.pdf (127KB) in 2.1s

  Open with: open README.pdf
```

### Export Error (no license)
```
$ readme-pdf export README.md

  ✗ No license key found.

  Get started at https://readmepdf.com
  Then run: readme-pdf auth login
```

### Watch Mode
```
$ readme-pdf watch README.md

  Watching README.md for changes...
  Press Ctrl+C to stop.

  [10:42:33] ✓ Exported README.pdf (2.1s)
  [10:43:01] ✓ Exported README.pdf (1.9s)
```

---

## Publishing to npm

```bash
# First time
npm login
npm publish

# Updates
npm version patch
npm publish
```

Version strategy: Semantic versioning. CLI is public (MIT). API is the paid part.

---

## Pricing Model for CLI

Same $5/month via Stripe. Two entry points:
1. Web app at readmepdf.com (cookie auth)
2. CLI tool (license key auth)

One subscription covers both. Users who subscribe via web can also use CLI by going to account page and copying their license key.

---

## MVP Scope
- [ ] `export` command fully working
- [ ] `auth login/status/logout` commands
- [ ] Config file read/write
- [ ] API client with license key header
- [ ] Worker updated to support license key auth
- [ ] License key generation + delivery via success page
- [ ] Published to npm
- [ ] README with install + usage instructions

## Post-MVP
- `watch` mode
- `themes` command
- `--open` flag (auto-open PDF)
- Config command (`readme-pdf config set default-theme dark`)
- Batch export (`readme-pdf export docs/*.md`)

---

## BMAD Build Instructions for Claude Code

**Session 1:** Scaffold npm package, `package.json`, `bin/readme-pdf.js` entry point, commander.js setup with all commands stubbed, config read/write helpers.

**Session 2:** Build `auth` commands (login prompts for key, validates via API, saves to config). Build API client module.

**Session 3:** Build `export` command — read file, call API, write PDF to disk, ora spinner, chalk output formatting.

**Session 4:** Update Cloudflare Worker to support license key auth header + KV schema for license keys + license key generation on Stripe webhook.

**Session 5:** Test full flow end-to-end, publish to npm, write README with install instructions and usage examples.
