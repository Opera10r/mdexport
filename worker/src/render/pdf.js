import { parseMarkdown, extractHeadings, buildTOCHTML, addHeadingIDs } from './markdown.js';

/**
 * Full PDF rendering pipeline.
 * markdown → HTML → themed HTML document → Puppeteer → PDF binary
 */
export async function renderPDF(markdown, options, env) {
  const puppeteer = await import('@cloudflare/puppeteer');

  // 1. Parse markdown to HTML
  let html = parseMarkdown(markdown);

  // 2. Extract headings + add IDs for TOC linking
  const headings = extractHeadings(markdown);
  html = addHeadingIDs(html, headings);

  // 3. Build TOC if enabled
  const tocHTML = options.toc ? buildTOCHTML(headings) : '';

  // 4. Build themed CSS
  const css = buildFullCSS(options);

  // 5. Assemble full HTML document
  const fullHTML = buildDocument(html, css, tocHTML, options);

  // 6. Render with Puppeteer
  const browser = await puppeteer.default.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0', timeout: 15000 });

    const margins = getMargins(options.margins || 'normal');
    const showHeaderFooter = !!(options.header || options.footer || options.page_numbers);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: margins,
      displayHeaderFooter: showHeaderFooter,
      headerTemplate: showHeaderFooter ? buildHeaderTemplate(options) : '',
      footerTemplate: showHeaderFooter ? buildFooterTemplate(options) : '',
    });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="export.pdf"',
      },
    });
  } finally {
    await browser.close();
  }
}

// ── CSS Assembly ─────────────────────────────────────────────────────

function buildFullCSS(options) {
  const font = getFontFamily(options.font || 'sans');
  const lineSpacing = options.line_spacing || 1.15;
  const accent = options.accent_color || getThemeAccent(options.theme || 'clean');

  // Base styles applied to all themes
  const base = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&family=Nunito:wght@400;600;700&family=Roboto+Slab:wght@400;500;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${font};
      font-size: 14px;
      line-height: ${lineSpacing};
      color: #1a1a1a;
    }

    h1 { font-size: 28px; font-weight: 700; margin: 32px 0 16px 0; }
    h2 { font-size: 22px; font-weight: 600; margin: 28px 0 12px 0; }
    h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px 0; }
    h4 { font-size: 16px; font-weight: 600; margin: 20px 0 8px 0; }

    p { margin: 0 0 12px 0; }
    a { color: ${accent}; text-decoration: none; }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: #f4f4f5;
      padding: 2px 6px;
      border-radius: 4px;
    }

    pre {
      background: #18181b;
      color: #e4e4e7;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      font-size: 13px;
    }

    pre code { background: none; padding: 0; color: inherit; border: none; }

    blockquote {
      border-left: 3px solid ${accent};
      padding-left: 16px;
      margin: 16px 0;
      color: #52525b;
    }

    ul, ol { margin: 0 0 12px 24px; }
    li { margin: 4px 0; }

    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }

    hr { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    img { max-width: 100%; height: auto; }

    /* TOC styles */
    .toc { margin: 0 0 32px 0; }
    .toc-title { font-size: 20px; margin-bottom: 12px; }
    .toc-list { list-style: none; margin: 0; padding: 0; }
    .toc-item { margin: 4px 0; }
    .toc-item a { color: ${accent}; text-decoration: none; }
    .toc-item a:hover { text-decoration: underline; }
    .toc-level-1 { font-weight: 600; }
    .toc-level-2 { font-weight: 500; }
    .toc-level-3, .toc-level-4 { font-weight: 400; color: #52525b; }
  `;

  // Load theme-specific overrides
  const themeCSS = getThemeCSS(options.theme || 'clean');

  return base + '\n' + themeCSS;
}

function getThemeCSS(theme) {
  const themes = {
    clean: `
      body { background: #fff; }
      h1, h2, h3, h4 { color: #000; }
      a { text-decoration: underline; text-underline-offset: 3px; }
      code { border: 1px solid #e4e4e7; }
      pre { background: #fafafa; color: #1a1a1a; border: 1px solid #e4e4e7; }
      blockquote { border-left-color: #d4d4d8; }
      th { background: #fafafa; }
    `,
    dark: `
      body { background: #18181b; color: #e4e4e7; }
      h1 { color: #a78bfa; }
      h2 { color: #c4b5fd; }
      h3, h4 { color: #ddd6fe; }
      a { color: #a78bfa; }
      code { background: #27272a; border: 1px solid #3f3f46; color: #a78bfa; }
      pre { background: #09090b; color: #a1a1aa; border: 1px solid #27272a; }
      blockquote { border-left-color: #7c3aed; color: #a1a1aa; }
      th { background: #27272a; color: #e4e4e7; }
      th, td { border-color: #3f3f46; }
      hr { border-top-color: #3f3f46; }
      .toc-item a { color: #a78bfa; }
    `,
    editorial: `
      body { background: #fffbf5; color: #292524; }
      h1 { color: #b45309; font-style: italic; }
      h2 { color: #78350f; }
      h3, h4 { color: #451a03; }
      a { color: #b45309; }
      code { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; }
      pre { background: #fffbeb; color: #451a03; border: 1px solid #fde68a; }
      blockquote { border-left-color: #b45309; color: #78350f; font-style: italic; }
      th { background: #fef3c7; color: #78350f; }
      th, td { border-color: #fde68a; }
      hr { border-top-color: #fde68a; }
    `,
    technical: `
      body { background: #fff; color: #1e293b; font-size: 13px; }
      h1 { color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 8px; }
      h2 { color: #0c4a6e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
      h3, h4 { color: #164e63; }
      a { color: #0369a1; }
      code { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; font-size: 12px; }
      pre { background: #0f172a; color: #94a3b8; font-size: 12px; }
      blockquote { border-left-color: #0369a1; background: #f0f9ff; padding: 12px 16px; border-radius: 0 6px 6px 0; color: #0c4a6e; }
      th { background: #f0f9ff; color: #0c4a6e; font-size: 12px; }
      th, td { border-color: #e2e8f0; }
      hr { border-top-color: #e2e8f0; }
    `,
    warm: `
      body { background: #faf8f5; color: #292524; }
      h1 { color: #92400e; }
      h2 { color: #78350f; }
      h3, h4 { color: #451a03; }
      a { color: #b45309; }
      code { background: #f5f0eb; border: 1px solid #e7e0d8; color: #78350f; }
      pre { background: #1c1917; color: #d6d3d1; }
      blockquote { border-left-color: #92400e; color: #57534e; }
      th { background: #f5f0eb; color: #44403c; }
      th, td { border-color: #e7e5e4; }
      hr { border-top-color: #e7e5e4; }
    `,
  };
  return themes[theme] || themes.clean;
}

// ── HTML Document ────────────────────────────────────────────────────

function buildDocument(html, css, tocHTML, options) {
  let coverHTML = '';
  if (options.cover?.enabled) {
    const title = options.cover.title || 'Document';
    const dateStr = options.cover.date !== false
      ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    coverHTML = `
      <div class="cover-page">
        ${options.cover.logo_base64 ? `<img src="data:image/png;base64,${options.cover.logo_base64}" class="cover-logo" />` : ''}
        <h1 class="cover-title">${escapeHTML(title)}</h1>
        ${dateStr ? `<p class="cover-date">${dateStr}</p>` : ''}
      </div>
    `;
  }

  const coverCSS = `
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
      page-break-after: always;
    }
    .cover-logo { max-width: 200px; margin-bottom: 40px; }
    .cover-title { font-size: 36px !important; margin-bottom: 16px; }
    .cover-date { color: #71717a; font-size: 16px; }
  `;

  const tocPageBreak = tocHTML ? '<div style="page-break-after: always;">' + tocHTML + '</div>' : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}\n${coverCSS}</style>
</head>
<body>
${coverHTML}
${tocPageBreak}
${html}
</body>
</html>`;
}

// ── Header / Footer ─────────────────────────────────────────────────

function buildHeaderTemplate(options) {
  const text = options.header || '';
  if (!text) return '<span></span>';
  return `<div style="font-size: 9px; color: #999; width: 100%; text-align: center; padding: 0 40px;">${escapeHTML(text)}</div>`;
}

function buildFooterTemplate(options) {
  const parts = [];
  if (options.footer) parts.push(escapeHTML(options.footer));
  if (options.page_numbers) parts.push('<span class="pageNumber"></span> / <span class="totalPages"></span>');
  if (parts.length === 0) return '<span></span>';
  return `<div style="font-size: 9px; color: #999; width: 100%; text-align: center; padding: 0 40px;">${parts.join(' — ')}</div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getFontFamily(font) {
  const fonts = {
    sans: "'Inter', system-ui, sans-serif",
    serif: "'Lora', Georgia, serif",
    mono: "'JetBrains Mono', monospace",
    humanist: "'Nunito', 'Trebuchet MS', sans-serif",
    slab: "'Roboto Slab', 'Rockwell', serif",
  };
  return fonts[font] || fonts.sans;
}

function getThemeAccent(theme) {
  const accents = { clean: '#000000', dark: '#7C3AED', editorial: '#B45309', technical: '#0369A1', warm: '#92400E' };
  return accents[theme] || '#000000';
}

function getMargins(size) {
  const m = {
    narrow: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    normal: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
    wide: { top: '1in', right: '1.25in', bottom: '1in', left: '1.25in' },
  };
  return m[size] || m.normal;
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
