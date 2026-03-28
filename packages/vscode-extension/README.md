# MDExport — Markdown to PDF & DOCX

**Your markdown. Publication-ready in seconds.**

Right-click any `.md` file in VS Code. Pick a theme. Pick a font. Export a beautiful PDF or DOCX. Done.

No Pandoc. No LaTeX. No browser exports. No copy-pasting into Word.

## How It Works

1. Open a Markdown file
2. Right-click → **MDExport: Export as PDF**
3. Get a publication-quality document in ~2 seconds

That's it.

## Features

| Feature | Free | Pro ($5/mo) |
|---|:---:|:---:|
| PDF export | Yes | Yes |
| DOCX export | — | Yes |
| Clean theme | Yes | Yes |
| Dark, Editorial, Technical, Warm themes | — | Yes |
| Inter (Sans) font | Yes | Yes |
| Lora, JetBrains Mono, Nunito, Roboto Slab | — | Yes |
| Table of Contents | Yes | Yes |
| Cover page with logo | — | Yes |
| Custom margins | — | Yes |
| Line spacing control | — | Yes |
| Headers & footers | — | Yes |
| Page numbers | — | Yes |
| Export settings panel | — | Yes |

## Themes

**Clean** — Minimal, white, timeless. The default.

**Dark** — Code-first. Dark background, purple accents. Great for technical docs.

**Editorial** — Magazine-feel. Warm tones, italic headings, elegant.

**Technical** — Dense, structured. Blue accents, bordered headings. Built for API docs.

**Warm** — Off-white background. Amber tones. Inviting and readable.

## Fonts

- **Sans** — Inter. Clean and modern.
- **Serif** — Lora. Elegant, readable long-form.
- **Mono** — JetBrains Mono. Technical, code-heavy.
- **Humanist** — Nunito. Warm and approachable.
- **Slab** — Roboto Slab. Strong and confident.

## Commands

| Command | Description |
|---|---|
| `MDExport: Export as PDF` | Export active file to PDF |
| `MDExport: Export as DOCX` | Export active file to DOCX (Pro) |
| `MDExport: Open Export Panel` | Open the formatting panel |
| `MDExport: Enter License Key` | Activate your Pro license |
| `MDExport: License Status` | Check license status |

## Settings

All defaults are configurable in VS Code Settings → MDExport:

- `mdexport.defaultTheme` — Theme (clean, dark, editorial, technical, warm)
- `mdexport.defaultFont` — Font family (sans, serif, mono, humanist, slab)
- `mdexport.defaultFormat` — Output format (pdf, docx)
- `mdexport.defaultMargins` — Page margins (narrow, normal, wide)
- `mdexport.defaultLineSpacing` — Line spacing (1.0, 1.15, 1.5, 2.0)
- `mdexport.toc` — Include table of contents
- `mdexport.pageNumbers` — Include page numbers

## Free CLI

MDExport also ships as a free, open-source CLI:

```bash
npm install -g mdexport
mdexport export README.md
```

The CLI exports basic PDFs with the Clean theme. Upgrade to Pro in VS Code for the full feature set.

## Get Pro

**$5/month** — unlock all themes, fonts, DOCX, cover pages, and more.

Visit [mdexport.dev](https://mdexport.dev) to subscribe.

---

Built by [Raven's Gate Dev Tools](https://github.com/ravensgatedev)
