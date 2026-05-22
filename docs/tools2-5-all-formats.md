# BMAD Project Briefs: Tools 2–5
## All Three Formats Per Tool
## Pandoc-Killer | Changelog PDF | Multi-MD Bundler | Portfolio Resume PDF

---
---

# TOOL 2: Pandoc-Killer (MD → Clean PDF Without Config Hell)

---

## 2A — Web App

### Product Identity
- **Name:** MarkPDF
- **Tagline:** Pandoc power. Zero config. One click.
- **Price:** $5/month
- **Target:** Technical writers, devs who write docs, anyone who's ever Googled "pandoc latex error"

### Problem
Pandoc is powerful and absolutely brutal to configure. Getting a clean PDF out of it requires installing LaTeX, fighting template syntax, and Googling cryptic errors for 2 hours. MarkPDF gives you 90% of Pandoc's output quality with 0% of the configuration pain.

### Product Overview
Drag in any `.md` file. Set basic options (font size, margins, code theme, page size). Click Export. Get a clean, professional PDF back. No LaTeX. No config files. No terminal.

**Key differentiator from ReadmePDF:** MarkPDF is for *general Markdown documents* — long-form technical writing, spec docs, proposals, white papers. ReadmePDF is specifically for READMEs. MarkPDF handles longer, denser content with better typography control.

### Output Features
- Professional body text (choose from 5 font pairs)
- Proper heading hierarchy with numbering option
- Footnote support
- Math equation rendering (KaTeX)
- Diagram rendering (Mermaid.js blocks → SVG → PDF)
- Custom page size (A4, Letter, Legal)
- Margin control (narrow/normal/wide)
- Line spacing control

### Stack
- Frontend: Single HTML file
- Backend: Cloudflare Worker + Browser Rendering
- Markdown: marked.js + extensions
- Math: KaTeX (CDN)
- Diagrams: Mermaid.js (CDN, render client-side to SVG before sending)
- Payments: Stripe $5/month
- Auth: Cloudflare KV + signed cookie

### Key Differentiating Prompt/Render Config
```javascript
// Mermaid preprocessing (client-side before export)
async function renderMermaidBlocks(markdown) {
  // Find ```mermaid blocks
  // Render each to SVG using mermaid.js
  // Replace code block with <img src="data:image/svg+xml...">
  // Return modified markdown
}

// KaTeX preprocessing
function renderMathBlocks(html) {
  // Find $...$ and $$...$$ patterns
  // Replace with KaTeX-rendered HTML
  return html;
}
```

### UI
- Single column, clean
- File drop zone (large, center) + paste textarea toggle
- Right sidebar: Font pair selector, page size, margins, line spacing, math toggle, diagram toggle, numbering toggle
- Live preview pane (scrollable)
- Export button

### BMAD Sessions
1. Scaffold + Worker + KV + Stripe webhook
2. Mermaid preprocessing pipeline + KaTeX integration
3. PDF render pipeline via Browser Rendering + font pair CSS (5 pairs)
4. HTML UI — file drop, options sidebar, preview pane
5. Stripe checkout, KV auth, deploy

---

## 2B — CLI Tool

### Package: `markpdf`
```bash
npm install -g markpdf
markpdf export document.md
markpdf export document.md --font-pair sans --page-size letter --line-spacing 1.5
markpdf export document.md --math --diagrams --numbered-headings
```

### Stack
- Node.js 18+, commander.js, ora, chalk
- Calls MarkPDF API (same Worker as web app)
- License key auth via `~/.markpdf/config.json`
- Stripe Payment Links for purchase → license key on success page

### Key CLI Options
```
--font-pair <n>         serif, sans, mono-serif, technical, academic
--page-size <size>        a4, letter, legal (default: a4)
--margins <size>          narrow, normal, wide (default: normal)
--line-spacing <n>      1.0, 1.15, 1.5, 2.0 (default: 1.15)
--math                    Enable KaTeX math rendering
--diagrams                Enable Mermaid diagram rendering
--numbered-headings       Auto-number H1/H2/H3
--output <path>           Output file (default: input filename + .pdf)
--open                    Open after export
```

### BMAD Sessions
1. Scaffold package, commander.js, config helpers, auth commands
2. Export command — read file, call API, write PDF, spinner UX
3. Watch mode — chokidar file watcher, debounced re-export
4. Update Worker to support license key auth for MarkPDF
5. Publish to npm, write docs

---

## 2C — GitHub Action

### Action: `markpdf-action`
```yaml
- uses: ravensgatedev/markpdf-action@v1
  with:
    input: docs/spec.md
    output: exports/spec.pdf
    font-pair: technical
    math: true
    diagrams: true
    numbered-headings: true
    mode: commit
    license-key: ${{ secrets.MARKPDF_KEY }}
```

### Use Cases
- Auto-export technical specs to PDF on merge to main
- Generate proposal PDFs from markdown templates
- Attach white papers to GitHub Releases
- Auto-update docs/ folder with fresh PDFs

### action.yml Inputs
```yaml
inputs:
  input: { required: true }
  output: { default: 'output.pdf' }
  font-pair: { default: 'sans' }
  page-size: { default: 'a4' }
  math: { default: 'false' }
  diagrams: { default: 'false' }
  numbered-headings: { default: 'false' }
  mode: { default: 'artifact' }   # artifact | commit | release
  license-key: { required: true }
```

### BMAD Sessions
1. Scaffold action repo, action.yml, src/index.js skeleton, ncc setup
2. API call implementation, file I/O, output setting
3. Commit + release modes
4. Bundle, test in sample repo, all modes verified
5. Publish to GitHub Marketplace

---
---

# TOOL 3: CHANGELOG → Stakeholder Release Notes PDF

---

## 3A — Web App

### Product Identity
- **Name:** ReleaseDoc
- **Tagline:** Your CHANGELOG. Their language.
- **Price:** $5/month
- **Target:** Dev team leads, PMs, OSS maintainers, anyone who ships software and has to report on it

### Problem
`CHANGELOG.md` is written for developers. Stakeholders, clients, and executives need release notes that explain what changed in plain language, formatted professionally, with the right level of detail. Nobody wants to manually reformat a changelog every release.

### Product Overview
User pastes `CHANGELOG.md` content (or a specific version block). Selects output mode. Clicks Generate. Gets:

1. **Executive Summary PDF** — 1-pager, plain English, highlights only, your logo
2. **Full Release Notes PDF** — all versions, properly formatted, table of contents
3. **Single Version PDF** — just one release, clean format, ready to email

**AI Layer:** Claude reads the technical changelog entries and rewrites them in plain English appropriate for the selected audience (executive, client, technical non-dev).

### Stack
- Frontend: Single HTML file
- Backend: Cloudflare Worker
- AI: Anthropic Claude API (rewrites technical entries into plain English)
- PDF: Cloudflare Browser Rendering
- Auth: Stripe $5/month + KV

### Prompt Design
```
SYSTEM: You are a technical writer who specializes in translating developer 
changelog entries into clear, professional release notes for non-technical 
stakeholders. Be specific but accessible. No jargon. Focus on user impact.
Return valid JSON only.

USER: Rewrite these changelog entries for a {{AUDIENCE}} audience.

CHANGELOG:
{{CHANGELOG_CONTENT}}

Return JSON:
{
  "version": "string",
  "release_date": "string",
  "executive_summary": "string (2-3 sentences, highest-level impact only)",
  "sections": [
    { "title": "New Features", "items": ["plain English description"...] },
    { "title": "Improvements", "items": [...] },
    { "title": "Bug Fixes", "items": [...] }
  ],
  "breaking_changes": ["string"...] | [],
  "upgrade_notes": "string | null"
}
```

### UI
- Input: Paste CHANGELOG.md or a single version block
- Version parser: auto-detects version numbers + dates from standard CHANGELOG format
- Audience selector: Executive | Client | Technical Non-Dev
- Output mode: Executive Summary | Full Notes | Single Version
- Logo upload (appears on PDF cover)
- Preview → Download

### BMAD Sessions
1. Scaffold, Worker, KV, Stripe webhook
2. CHANGELOG parser (extract version blocks from standard format), Claude API rewriter
3. PDF render pipeline — 3 output modes with distinct layouts
4. HTML UI — input, version selector, audience picker, output mode tabs
5. Stripe, KV auth, deploy

---

## 3B — CLI Tool

### Package: `releasedoc`
```bash
npm install -g releasedoc
releasedoc export CHANGELOG.md
releasedoc export CHANGELOG.md --version 2.1.0 --audience executive
releasedoc export CHANGELOG.md --mode full --output releases/notes.pdf
```

### Key Options
```
--version <ver>       Export specific version only (default: latest)
--audience <type>     executive, client, technical (default: client)
--mode <type>         summary, full, single (default: single)
--output <path>       Output path
--all-versions        Export all versions as separate PDFs into a directory
```

### BMAD Sessions
1. Scaffold, commander.js, config, auth commands
2. CHANGELOG file parser (extract version blocks)
3. Export command — call API, write PDF(s)
4. --all-versions mode (batch export into directory)
5. npm publish, docs

---

## 3C — GitHub Action

### Action: `releasedoc-action`

**Primary use case:** Automatically generate stakeholder release notes PDF and attach to every GitHub Release.

```yaml
name: Release Notes
on:
  release:
    types: [published]

jobs:
  release-notes:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: ravensgatedev/releasedoc-action@v1
        with:
          changelog: CHANGELOG.md
          version: ${{ github.event.release.tag_name }}
          audience: client
          mode: single
          mode: release
          license-key: ${{ secrets.RELEASEDOC_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### action.yml Inputs
```yaml
inputs:
  changelog: { required: true, default: 'CHANGELOG.md' }
  version: { description: 'Version to export (default: latest in file)' }
  audience: { default: 'client' }
  mode: { default: 'single' }
  output: { default: 'release-notes.pdf' }
  output-mode: { default: 'artifact' }  # artifact | commit | release
  license-key: { required: true }
```

### BMAD Sessions
1. Scaffold action, action.yml, src/index.js, ncc setup
2. Read + parse CHANGELOG.md, extract correct version block, call API
3. Commit + release attachment modes
4. Bundle + test in sample repo
5. Publish to Marketplace

---
---

# TOOL 4: Multi-MD Bundler (Many Files → One Doc with TOC)

---

## 4A — Web App

### Product Identity
- **Name:** DocBundle
- **Tagline:** Your docs, assembled. Finally.
- **Price:** $5/month
- **Target:** Technical writers, devs maintaining wiki-style docs, teams with docs spread across multiple .md files

### Problem
Documentation lives in 15 different `.md` files. Sometimes you need to ship it as one clean PDF — for a client, for a proposal, for an internal handbook. Assembling it manually is copy-paste hell. DocBundle lets you upload multiple files, drag to reorder them, and export as one beautifully structured PDF with auto-generated table of contents.

### Product Overview
User uploads multiple `.md` files (or pastes a GitHub repo URL). Drags to reorder. Sets options. Exports one unified PDF with:
- Auto-generated Table of Contents from all H1/H2 headings across all files
- Chapter breaks between files
- Consistent page numbering
- Optional cover page
- File names as chapter titles (or custom titles)

### Stack
- Frontend: Single HTML file (drag-and-drop file reorder UI)
- Backend: Cloudflare Worker
- PDF: Cloudflare Browser Rendering
- No AI needed — pure assembly + render
- Auth: Stripe $5/month + KV

### UI Highlights
- Multi-file upload drop zone
- Drag-to-reorder list (each file = one row with handle, title field, remove button)
- Chapter title override per file
- Options: Cover page, TOC, page numbers, theme, chapter break style
- Preview: Shows TOC structure before export
- Export button

### File Processing Pipeline
```javascript
async function bundleMarkdown(files) {
  // files = [{ title, markdown }, ...] in order
  
  let bundled = '';
  const tocEntries = [];
  
  for (const file of files) {
    // Add chapter break
    bundled += `\n\n<div class="chapter-break"></div>\n\n`;
    bundled += `# ${file.title}\n\n`;
    bundled += file.markdown;
    
    // Extract headings for TOC
    const headings = extractHeadings(file.markdown, file.title);
    tocEntries.push(...headings);
  }
  
  // Prepend TOC
  const toc = buildTOC(tocEntries);
  return toc + bundled;
}
```

### BMAD Sessions
1. Scaffold, Worker, KV, Stripe webhook
2. Multi-file assembly pipeline, TOC generator, chapter break CSS
3. PDF render pipeline with chapter breaks + unified page numbers
4. HTML UI — multi-file drop zone, drag-to-reorder (Sortable.js via CDN), title overrides
5. Stripe, KV auth, deploy

---

## 4B — CLI Tool

### Package: `docbundle`
```bash
npm install -g docbundle
docbundle export docs/intro.md docs/setup.md docs/api.md
docbundle export docs/*.md --order-file bundle.yml --output handbook.pdf
docbundle export --config bundle.yml
```

### bundle.yml Config Format
```yaml
title: "Project Handbook"
theme: clean
toc: true
cover: true
files:
  - path: docs/intro.md
    title: "Introduction"
  - path: docs/setup.md
    title: "Getting Started"
  - path: docs/api.md
    title: "API Reference"
  - path: CONTRIBUTING.md
    title: "Contributing"
```

### Key Options
```
--order-file <path>    YAML file defining file order + titles
--output <path>        Output PDF path (default: bundle.pdf)
--theme <n>          clean, dark, corporate, github
--toc                  Include table of contents
--cover                Include cover page
--cover-title <text>   Cover title
--config <path>        Full config YAML (replaces all other options)
```

### BMAD Sessions
1. Scaffold, commander.js, config, auth
2. YAML config parsing + glob expansion for file ordering
3. Export command — assemble files, call API, write PDF
4. Config file generation command (`docbundle init` → creates bundle.yml)
5. npm publish, docs

---

## 4C — GitHub Action

### Action: `docbundle-action`

**Primary use case:** Auto-build a unified documentation PDF from a docs/ folder on every push.

```yaml
name: Build Docs PDF
on:
  push:
    branches: [main]
    paths: ['docs/**']

jobs:
  build-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: ravensgatedev/docbundle-action@v1
        with:
          config: bundle.yml          # Use config file for ordering
          output: dist/handbook.pdf
          mode: commit
          commit-message: "docs: rebuild handbook PDF [skip ci]"
          license-key: ${{ secrets.DOCBUNDLE_KEY }}
```

### action.yml Inputs
```yaml
inputs:
  files: { description: 'Space-separated list of .md files (alternative to config)' }
  config: { description: 'Path to bundle.yml config file' }
  output: { default: 'bundle.pdf' }
  theme: { default: 'clean' }
  toc: { default: 'true' }
  cover: { default: 'false' }
  mode: { default: 'artifact' }
  license-key: { required: true }
```

### BMAD Sessions
1. Scaffold, action.yml, src/index.js, ncc setup
2. Config file parsing + files input parsing, API call
3. Commit + release modes
4. Bundle + test
5. Marketplace publish

---
---

# TOOL 5: Portfolio README → PDF Resume Supplement

---

## 5A — Web App

### Product Identity
- **Name:** PortfolioPDF
- **Tagline:** Your GitHub profile. Hiring-manager ready.
- **Price:** $5/month
- **Target:** Junior-to-mid developers job hunting, bootcamp grads, developers updating their portfolio

### Problem
Junior developers have great GitHub profiles and READMEs but show up to interviews with nothing tangible to hand over. A polished PDF version of their profile README — formatted as a professional document — gives them a leave-behind that stands out. Senior devs use it too for consulting proposals.

### Product Overview
User pastes their GitHub profile README URL or raw markdown. Selects a professional template. Optionally adds contact info (email, LinkedIn, website) that gets placed in the header. Exports a clean, hiring-manager-ready PDF.

**AI Enhancement Layer:** Claude restructures and lightly rewrites the README to follow resume document conventions — moving the best content forward, tightening language, adding professional framing where needed.

**Templates (MVP):**
- **Developer Classic** — clean two-column, GitHub green accent
- **Minimal** — pure white, strong typography, no color
- **Technical** — emphasizes stack, projects, GitHub stats
- **Creative** — slightly more personality, card-based layout

### Stack
- Frontend: Single HTML file
- Backend: Cloudflare Worker
- AI: Claude API (restructuring + light rewrite)
- PDF: Cloudflare Browser Rendering
- Auth: Stripe $5/month + KV

### AI Prompt
```
SYSTEM: You are a professional resume writer who specializes in developer portfolios.
You take GitHub profile READMEs and restructure them into professional PDF documents.
Preserve all technical content exactly. Improve structure and professional tone.
Return valid JSON only.

USER: Restructure this GitHub profile README as a professional developer document.

README:
{{README_CONTENT}}

CONTACT INFO:
{{CONTACT_INFO}}

Return JSON:
{
  "name": "string (extracted or inferred)",
  "tagline": "string (1 sentence professional summary)",
  "about": "string (2-3 sentences, professional tone)",
  "skills": { "languages": [], "frameworks": [], "tools": [], "other": [] },
  "projects": [{ "name", "description", "tech_stack": [], "url" }],
  "github_stats_section": "string | null",
  "contact": { "email", "linkedin", "website", "github" },
  "additional_sections": [{ "title": "string", "content": "string" }]
}
```

### UI
- Input: GitHub username field (auto-fetches README) OR paste raw markdown
- GitHub username fetch: `https://raw.githubusercontent.com/{username}/{username}/main/README.md`
- Contact info fields (email, LinkedIn, website — optional)
- Template selector (4 cards with visual thumbnails)
- AI enhancement toggle (on by default)
- Preview → Export

### BMAD Sessions
1. Scaffold, Worker, KV, Stripe webhook
2. GitHub README fetcher, Claude restructuring pipeline, JSON → template mapping
3. PDF render pipeline — 4 template CSS files with distinct layouts
4. HTML UI — username field + fetch, contact fields, template picker, preview
5. Stripe, KV auth, deploy

---

## 5B — CLI Tool

### Package: `portfoliopdf`
```bash
npm install -g portfoliopdf
portfoliopdf export --github jamison-dev
portfoliopdf export README.md --template minimal --email hi@jamison.dev
portfoliopdf export --github jamison-dev --template technical --no-ai
```

### Key Options
```
--github <username>    Fetch README from GitHub profile
--template <n>       classic, minimal, technical, creative (default: classic)
--email <email>        Contact email for header
--linkedin <url>       LinkedIn URL for header
--website <url>        Personal website for header
--no-ai                Skip AI restructuring (use raw markdown)
--output <path>        Output path (default: portfolio.pdf)
```

### BMAD Sessions
1. Scaffold, commander.js, config, auth
2. GitHub README fetcher (https://raw.githubusercontent.com)
3. Export command — call API (passes markdown + contact + template), write PDF
4. --no-ai flag (bypasses Claude, direct render)
5. npm publish, docs

---

## 5C — GitHub Action

### Action: `portfoliopdf-action`

**Primary use case:** Auto-update a PDF version of your profile README whenever you push changes to it. Commit the PDF back to a `portfolio` branch or release it.

```yaml
name: Update Portfolio PDF
on:
  push:
    branches: [main]     # Your profile README repo

jobs:
  update-pdf:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - uses: ravensgatedev/portfoliopdf-action@v1
        with:
          input: README.md
          template: classic
          email: hi@yourdomain.com
          linkedin: https://linkedin.com/in/yourprofile
          website: https://yoursite.com
          ai-enhance: true
          mode: commit
          output: portfolio/resume-supplement.pdf
          license-key: ${{ secrets.PORTFOLIOPDF_KEY }}
```

### action.yml Inputs
```yaml
inputs:
  input: { default: 'README.md' }
  template: { default: 'classic' }
  email: { description: 'Contact email for PDF header' }
  linkedin: { description: 'LinkedIn URL' }
  website: { description: 'Personal website URL' }
  ai-enhance: { default: 'true' }
  output: { default: 'portfolio.pdf' }
  mode: { default: 'artifact' }
  license-key: { required: true }
```

### BMAD Sessions
1. Scaffold, action.yml, src/index.js, ncc setup
2. File read + API call with all options passed through
3. Commit mode (most common use case for this action)
4. Bundle + test in real profile README repo
5. Marketplace publish

---
---

# MASTER BUILD ORDER

Build in this sequence for maximum learning carryover:

| Order | Tool | Format | Why |
|---|---|---|---|
| 1 | ReadmePDF | Web | Establishes full stack pattern |
| 2 | ReadmePDF | CLI | Adds license key auth pattern |
| 3 | ReadmePDF | Action | Adds GitHub Action pattern |
| 4 | MarkPDF | Web | Adds math + diagram rendering |
| 5 | DocBundle | Web | Adds multi-file assembly |
| 6 | ReleaseDoc | Web | Adds Claude AI layer |
| 7 | PortfolioPDF | Web | Adds GitHub fetch + AI restructure |
| 8-15 | All CLI + Action versions | — | Mostly copy + adapt from Tool 1 |

---

# SHARED INFRASTRUCTURE

All 5 tools share:
- Same Cloudflare Worker auth pattern (cookie for web, license key for CLI/Action)
- Same KV schema (`user:{email}` record)
- Same Stripe webhook handler pattern
- Same Browser Rendering PDF pipeline
- Same license key delivery via success page

Build it once in Tool 1. Copy the pattern for Tools 2-5.

---

# REVENUE MATH (All 5 Tools)

| Subscribers/Tool | Revenue/Tool/Month | 5-Tool Total |
|---|---|---|
| 200 | $1,000 | $5,000 |
| 500 | $2,500 | $12,500 |
| 1,000 | $5,000 | $25,000 |

Infrastructure cost across all 5 tools at 1000 subscribers each:
- Cloudflare Workers Paid: $5/month × 5 = $25
- Browser Rendering: ~$0.002 × est. 10,000 exports = $20
- Anthropic API (Tools 3,4 only): ~$50
- Stripe fees: ~$1,450
- **Total overhead: ~$1,545/month**
- **Net at 5,000 total subscribers: ~$23,455/month**

---

*Built under Raven's Gate Publishing LLC | AI Consulting + Dev Tools Division*
