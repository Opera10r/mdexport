# BMAD Project Brief: README → Gorgeous Branded PDF
## Format: Web App
## Tool 1 of 5 | Web Version

---

## Product Identity
- **Product Name:** ReadmePDF
- **Tagline:** Your README deserves better than default.
- **Price:** $5/month
- **Target User:** Solo developers, open source maintainers, dev agencies presenting work to clients

---

## Problem Statement
GitHub renders Markdown beautifully. Export it to PDF and you get unstyled garbage — no syntax highlighting, broken layouts, ugly fonts, no cover page. Developers who want to send documentation, project overviews, or READMEs as professional PDFs are stuck fighting Pandoc config files or paying for overbuilt tools. ReadmePDF fixes this in 30 seconds.

---

## Product Overview
User pastes Markdown or uploads a `.md` file. Selects a theme. Clicks Export. Downloads a beautiful, professionally styled PDF immediately.

**Output features:**
- Syntax-highlighted code blocks
- Styled callout boxes (> blockquotes rendered as info/warning/tip cards)
- Professional typography (Inter or similar)
- Optional cover page (project name, date, logo upload)
- Optional header/footer with page numbers
- Table of contents auto-generated from H2/H3 headings
- Badge rendering (shields.io badges displayed properly)

**Themes (MVP):**
- **Clean** — white background, dark text, minimal
- **Dark** — dark background, light text, code-first feel
- **Corporate** — slightly formal, good for client delivery
- **GitHub** — mimics GitHub's own render style as closely as possible

---

## Tech Stack
- **Frontend:** Single HTML file, HTML/CSS/JS, no framework
- **Backend:** Cloudflare Worker
- **PDF Generation:** Puppeteer via Cloudflare Browser Rendering (paid add-on, ~$0.002/page) OR client-side using `jsPDF` + `html2canvas` (free, lower fidelity)
- **Markdown Parsing:** `marked.js` (CDN, client-side)
- **Syntax Highlighting:** `highlight.js` (CDN, client-side)
- **Auth/Payments:** Stripe ($5/month)
- **User State:** Cloudflare KV
- **Hosting:** Cloudflare Pages

### PDF Strategy Decision
**Recommended: Server-side Puppeteer via Cloudflare Browser Rendering**
- Highest fidelity output
- Consistent cross-platform rendering
- Costs ~$0.002 per export — negligible at $5/month pricing
- Requires Cloudflare Workers Paid plan ($5/month flat)

**Fallback: Client-side html2canvas + jsPDF**
- Free
- Lower quality (rasterized, not vector)
- Use only if keeping infrastructure cost at zero is critical

---

## Architecture

```
[User Browser]
     |
     | 1. User pastes/uploads Markdown
     | 2. marked.js renders preview in browser (instant, free)
     | 3. User selects theme + options
     | POST /export { markdown, theme, options }
     v
[Cloudflare Worker]
     |-- Validate subscription (KV)
     |-- Render HTML from Markdown (server-side marked)
     |-- Inject theme CSS
     |-- Launch Cloudflare Browser Rendering
     |-- Screenshot/print to PDF
     |-- Return PDF binary
     v
[Browser triggers download: project-readme.pdf]
```

---

## File Structure
```
/
├── index.html
├── worker/
│   └── index.js
├── themes/
│   ├── clean.css
│   ├── dark.css
│   ├── corporate.css
│   └── github.css
├── wrangler.toml
└── README.md
```

---

## Worker Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/create-checkout` | POST | Stripe session |
| `/webhook` | POST | Stripe events |
| `/verify-session` | POST | Subscription check |
| `/export` | POST | Generate + return PDF |
| `/preview` | POST | Return styled HTML (for live preview) |

---

## Prompt / Render Pipeline

No AI involved in this tool — pure rendering pipeline:

```javascript
// Worker /export handler
async function handleExport(request, env) {
  const { markdown, theme, options } = await request.json();
  
  // 1. Parse markdown to HTML
  const html = marked.parse(markdown);
  
  // 2. Load theme CSS
  const themeCSS = await env.ASSETS.fetch(`/themes/${theme}.css`).text();
  
  // 3. Build full HTML document
  const fullHTML = buildHTMLDocument(html, themeCSS, options);
  
  // 4. Launch browser, print to PDF
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1in', bottom: '1in', left: '0.75in', right: '0.75in' }
  });
  await browser.close();
  
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="readme.pdf"'
    }
  });
}
```

---

## Theme CSS Requirements

Each theme CSS must style:
- `body` — font, background, text color
- `h1, h2, h3, h4` — hierarchy, spacing, optional border-bottom on H2
- `code` — inline code styling
- `pre code` — code block with highlight.js classes
- `blockquote` — styled as callout card (left border + background tint)
- `table` — styled with alternating row colors
- `img` — max-width: 100%, border-radius
- `a` — color, no underline by default
- `.cover-page` — optional full-page cover (if user enabled)
- `.toc` — table of contents block
- `@page` — margins, page size
- `@media print` — ensure backgrounds print

---

## UI Specification

### Layout
- Two-pane: left = input/settings, right = live preview
- On mobile: stacked, preview below input

### Left Pane
- **Input:** Textarea (paste MD) + "Upload .md file" button
- **Theme selector:** 4 theme cards with visual thumbnails
- **Options panel** (collapsible):
  - Toggle: Cover page (shows fields: Project Name, Subtitle, Date, Logo upload)
  - Toggle: Table of Contents
  - Toggle: Page numbers
  - Toggle: Header (text field)
  - Toggle: Footer (text field)
- **Export button:** "Download PDF" (primary CTA)

### Right Pane
- Live HTML preview (rendered client-side with marked.js + selected theme CSS)
- Preview updates as user types (debounced 500ms)
- "This is a preview — your PDF will match this styling"

### States
- **Unauthenticated:** Preview works fully, Export button shows pricing modal
- **Generating PDF:** Button shows spinner + "Rendering your PDF..."
- **Download ready:** Auto-triggers download
- **Error:** "PDF generation failed — try a smaller document"

---

## Options Object Schema
```json
{
  "theme": "clean|dark|corporate|github",
  "cover_page": {
    "enabled": true,
    "title": "string",
    "subtitle": "string",
    "date": "string",
    "logo_base64": "string|null"
  },
  "toc": true,
  "page_numbers": true,
  "header_text": "string|null",
  "footer_text": "string|null"
}
```

---

## Environment Variables
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
COOKIE_SECRET=
BROWSER=          # Cloudflare Browser Rendering binding
```

---

## KV Namespace
- **Binding:** `USERS`
- **Key:** `user:{email}`
- **Value:** `{ "status": "active"|"inactive", "customer_id", "subscription_id", "exports_count": 0 }`

---

## MVP Scope
- [ ] Markdown input (paste + file upload)
- [ ] 4 themes with live preview
- [ ] Server-side PDF generation via Cloudflare Browser Rendering
- [ ] Cover page option
- [ ] TOC auto-generation
- [ ] Page numbers
- [ ] Stripe subscription flow
- [ ] KV auth gating
- [ ] Mobile responsive

## Post-MVP
- Custom theme builder (pick fonts, colors, accent)
- Logo/watermark on every page
- Batch export (upload multiple .md files → one ZIP of PDFs)
- GitHub integration (paste repo URL → auto-fetches README)
- White-label option for agencies ($19/month)

---

## Launch Checklist
- [ ] Cloudflare Pages + Worker + Browser Rendering deployed
- [ ] All 4 themes tested across complex READMEs
- [ ] Stripe flow tested end-to-end
- [ ] KV auth verified
- [ ] File upload tested (various .md sizes)
- [ ] PDF download tested across browsers
- [ ] Mobile layout verified
- [ ] Custom domain live

---

## BMAD Build Instructions for Claude Code

**Session 1:** Scaffold project, wrangler.toml with Browser Rendering binding, Worker skeleton, KV helpers, Stripe webhook handler.

**Session 2:** Build theme CSS files (all 4), build HTML document builder function, implement markdown → HTML pipeline in Worker.

**Session 3:** Integrate Cloudflare Browser Rendering, implement `/export` endpoint, test PDF output quality with sample READMEs.

**Session 4:** Build `index.html` — two-pane layout, live preview with marked.js + highlight.js, theme selector, options panel, file upload.

**Session 5:** Stripe checkout, KV gating, mobile layout, Polish export button states, deploy and smoke test.
