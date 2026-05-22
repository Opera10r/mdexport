# BMAD Project Brief: README → Gorgeous Branded PDF
## Format: GitHub Action
## Tool 1 of 5 | GitHub Action Version

---

## Product Identity
- **Action Name:** `readme-pdf-action`
- **Marketplace:** GitHub Actions Marketplace
- **Usage:** Runs automatically on push, PR, or release
- **Price:** $5/month (license key stored as GitHub Secret)
- **Target User:** OSS maintainers who want PDF docs auto-generated in CI/CD, dev teams who ship PDF release docs automatically

---

## Problem Statement
Every time a developer updates their README or docs, they have to manually re-export the PDF. Nobody does this. So the PDF version is always stale. A GitHub Action that auto-generates a fresh PDF on every push to main — and commits it back to the repo or attaches it to a release — means zero manual work forever.

---

## Product Overview
A GitHub Action that runs in any workflow. On trigger (push, release, schedule), it reads one or more `.md` files, calls the ReadmePDF API, and either:
- Commits the PDF back to the repository
- Attaches the PDF to a GitHub Release
- Uploads the PDF as a workflow artifact

```yaml
# .github/workflows/export-docs.yml
name: Export README as PDF

on:
  push:
    branches: [main]
    paths: ['README.md', 'docs/**/*.md']

jobs:
  export-pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: ravensgatedev/readme-pdf-action@v1
        with:
          input: README.md
          output: docs/README.pdf
          theme: corporate
          toc: true
          cover: true
          cover-title: ${{ github.event.repository.name }}
          license-key: ${{ secrets.README_PDF_KEY }}
          
      - uses: actions/upload-artifact@v4
        with:
          name: readme-pdf
          path: docs/README.pdf
```

---

## Tech Stack
- **Action Runtime:** Node.js 20 (GitHub-hosted runners)
- **Action Type:** JavaScript action (not Docker — faster startup)
- **Entry Point:** `action.yml` + `dist/index.js`
- **Bundler:** `@vercel/ncc` (bundles everything into one file, no node_modules needed)
- **API:** Calls ReadmePDF Cloudflare Worker API (same backend)
- **GitHub API:** `@actions/github` for release attachment, commit-back
- **Core Toolkit:** `@actions/core`, `@actions/exec`, `@actions/io`

---

## Architecture

```
[GitHub Actions Runner]
     |
     | Trigger: push to main
     v
[readme-pdf-action runs]
     |-- Read input file(s) from workspace
     |-- POST to https://api.readmepdf.com/export
     |    { markdown, theme, options, license_key }
     v
[ReadmePDF API returns PDF binary]
     |
     | Action writes PDF to output path
     v
[Depending on mode:]
  commit-back: git commit + push PDF to repo
  release: attach PDF to GitHub Release
  artifact: upload as workflow artifact (default)
```

---

## File Structure (Action Repo)
```
readme-pdf-action/
├── action.yml           # Action metadata + input/output definitions
├── src/
│   └── index.js         # Main action logic
├── dist/
│   └── index.js         # Bundled output (committed to repo)
├── package.json
└── README.md            # Action documentation (shown on Marketplace)
```

---

## action.yml
```yaml
name: 'README PDF Exporter'
description: 'Export Markdown files as beautiful, themed PDFs automatically in CI/CD'
author: 'Raven Gate Dev'

branding:
  icon: 'file-text'
  color: 'purple'

inputs:
  input:
    description: 'Path to input Markdown file (or glob pattern)'
    required: true
    default: 'README.md'
  output:
    description: 'Output PDF path'
    required: false
    default: 'readme.pdf'
  theme:
    description: 'PDF theme: clean, dark, corporate, github'
    required: false
    default: 'clean'
  toc:
    description: 'Include table of contents'
    required: false
    default: 'false'
  cover:
    description: 'Include cover page'
    required: false
    default: 'false'
  cover-title:
    description: 'Cover page title'
    required: false
    default: ''
  page-numbers:
    description: 'Include page numbers'
    required: false
    default: 'true'
  license-key:
    description: 'ReadmePDF license key (store as GitHub Secret)'
    required: true
  mode:
    description: 'Output mode: artifact, commit, release'
    required: false
    default: 'artifact'
  commit-message:
    description: 'Commit message when mode=commit'
    required: false
    default: 'docs: update PDF export [skip ci]'

outputs:
  pdf-path:
    description: 'Path to the generated PDF file'
  pdf-size:
    description: 'Size of the generated PDF in bytes'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

---

## Main Action Logic (`src/index.js`)

```javascript
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // 1. Read inputs
    const inputFile = core.getInput('input', { required: true });
    const outputFile = core.getInput('output') || 'readme.pdf';
    const theme = core.getInput('theme') || 'clean';
    const licenseKey = core.getInput('license-key', { required: true });
    const mode = core.getInput('mode') || 'artifact';
    const toc = core.getInput('toc') === 'true';
    const cover = core.getInput('cover') === 'true';
    const coverTitle = core.getInput('cover-title') || '';
    const pageNumbers = core.getInput('page-numbers') !== 'false';

    // 2. Read markdown file
    core.info(`Reading ${inputFile}...`);
    if (!fs.existsSync(inputFile)) {
      core.setFailed(`Input file not found: ${inputFile}`);
      return;
    }
    const markdown = fs.readFileSync(inputFile, 'utf8');

    // 3. Call ReadmePDF API
    core.info(`Exporting PDF with theme: ${theme}...`);
    const response = await fetch('https://api.readmepdf.com/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-License-Key': licenseKey
      },
      body: JSON.stringify({
        markdown,
        theme,
        options: { toc, cover, cover_title: coverTitle, page_numbers: pageNumbers }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      core.setFailed(`API error: ${response.status} - ${error}`);
      return;
    }

    // 4. Write PDF to disk
    const pdfBuffer = await response.arrayBuffer();
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, Buffer.from(pdfBuffer));
    const pdfSize = fs.statSync(outputFile).size;
    
    core.info(`✓ PDF exported: ${outputFile} (${(pdfSize / 1024).toFixed(1)}KB)`);
    core.setOutput('pdf-path', outputFile);
    core.setOutput('pdf-size', pdfSize.toString());

    // 5. Handle output mode
    if (mode === 'commit') {
      await commitPDF(outputFile, core.getInput('commit-message'));
    } else if (mode === 'release') {
      await attachToRelease(outputFile, pdfBuffer);
    }
    // mode === 'artifact': handled by user's workflow with upload-artifact step

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function commitPDF(filePath, message) {
  const { execSync } = require('child_process');
  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
  execSync(`git add ${filePath}`);
  execSync(`git commit -m "${message}" || echo "No changes to commit"`);
  execSync('git push');
  core.info('✓ PDF committed to repository');
}

async function attachToRelease(filePath, pdfBuffer) {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const context = github.context;
  
  if (!context.payload.release) {
    core.warning('No release found in context — skipping release attachment');
    return;
  }
  
  await octokit.rest.repos.uploadReleaseAsset({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id: context.payload.release.id,
    name: path.basename(filePath),
    data: Buffer.from(pdfBuffer)
  });
  
  core.info('✓ PDF attached to release');
}

run();
```

---

## Example Workflows

### Auto-commit PDF on push
```yaml
name: Export Docs
on:
  push:
    branches: [main]
    paths: ['README.md']

jobs:
  export:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: ravensgatedev/readme-pdf-action@v1
        with:
          input: README.md
          output: docs/README.pdf
          theme: github
          toc: true
          mode: commit
          license-key: ${{ secrets.README_PDF_KEY }}
```

### Attach PDF to every GitHub Release
```yaml
name: Release Docs
on:
  release:
    types: [published]

jobs:
  attach-pdf:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: ravensgatedev/readme-pdf-action@v1
        with:
          input: README.md
          theme: corporate
          cover: true
          cover-title: ${{ github.event.release.name }}
          mode: release
          license-key: ${{ secrets.README_PDF_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Export multiple docs files
```yaml
- uses: ravensgatedev/readme-pdf-action@v1
  with:
    input: README.md
    output: exports/readme.pdf
    theme: clean
    license-key: ${{ secrets.README_PDF_KEY }}

- uses: ravensgatedev/readme-pdf-action@v1
  with:
    input: CONTRIBUTING.md
    output: exports/contributing.pdf
    theme: clean
    license-key: ${{ secrets.README_PDF_KEY }}
```

---

## Publishing to GitHub Marketplace

1. Create public repo: `ravensgatedev/readme-pdf-action`
2. Add `action.yml` to root
3. Bundle with ncc: `npx @vercel/ncc build src/index.js -o dist`
4. Commit `dist/index.js` to repo
5. Create a release tagged `v1.0.0`
6. In release settings: check "Publish this Action to the GitHub Marketplace"
7. Choose category: "Utilities"
8. Submit for review (GitHub reviews within 1-3 days)

---

## Versioning Strategy
- Users pin to `@v1` (major) not `@v1.0.0` (patch)
- Maintain a `v1` branch/tag that always points to latest v1.x
- Breaking changes → `@v2`

---

## Environment Variables in Action
```
README_PDF_KEY    # User's license key (stored as GitHub Secret)
GITHUB_TOKEN      # Auto-provided by GitHub (needed for commit/release modes)
```

---

## MVP Scope
- [ ] `action.yml` with all inputs defined
- [ ] `src/index.js` with export + artifact mode
- [ ] commit mode working
- [ ] release mode working
- [ ] Bundled with ncc into `dist/index.js`
- [ ] Published to GitHub Marketplace
- [ ] README with all three example workflows

## Post-MVP
- Glob pattern support (`docs/**/*.md` → multiple PDFs)
- PR comment mode (post PDF preview link as PR comment)
- Slack/Discord notification on export
- Custom CSS input support

---

## BMAD Build Instructions for Claude Code

**Session 1:** Scaffold action repo, `action.yml`, `package.json`, basic `src/index.js` that reads inputs and logs them. Set up ncc bundling.

**Session 2:** Implement API call, file read/write, output setting. Test against ReadmePDF API with a real license key.

**Session 3:** Implement commit mode (git commands via execSync). Implement release mode (Octokit upload).

**Session 4:** Bundle with ncc, create test workflow in a sample repo, verify all three modes work end-to-end.

**Session 5:** Write marketplace README, publish to GitHub Marketplace, verify listing appears correctly.
