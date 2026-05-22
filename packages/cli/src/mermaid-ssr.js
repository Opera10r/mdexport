import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Render mermaid code blocks to SVG using Puppeteer.
 * Reuses an existing browser instance if provided.
 *
 * @param {string} html - HTML string potentially containing mermaid code blocks
 * @param {import('puppeteer').Browser} browser - Puppeteer browser instance
 * @returns {Promise<string>} HTML with mermaid blocks replaced by inline SVG
 */
export async function renderMermaidInHTML(html, browser) {
  const MERMAID_RE = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi;
  const matches = Array.from(html.matchAll(MERMAID_RE));
  if (matches.length === 0) return html;

  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><html><body></body></html>');

    // Find and inject mermaid.min.js from node_modules
    const mermaidPath = findMermaidScript();
    await page.addScriptTag({ path: mermaidPath });
    await page.evaluate(() => {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
        suppressErrors: true,
        logLevel: 'fatal',
      });
    });

    let result = '';
    let cursor = 0;
    let renderIndex = 0;

    for (const match of matches) {
      const placeholder = match[0];
      const encodedSource = match[1] || '';
      const source = decodeEntities(encodedSource).trim();
      const start = match.index;

      result += html.slice(cursor, start);

      if (!source) {
        result += '<div style="color:#999;font-style:italic;">Empty mermaid diagram</div>';
        cursor = start + placeholder.length;
        continue;
      }

      try {
        const svg = await page.evaluate(
          async ({ id, diagramSource }) => {
            const { svg } = await window.mermaid.render(id, diagramSource);
            return svg;
          },
          { id: `mmd-${renderIndex++}`, diagramSource: source },
        );
        result += `<div class="mermaid-diagram" style="text-align:center;margin:16px 0;break-inside:avoid;">${svg}</div>`;
      } catch (err) {
        result += `<div style="border:1px solid #e44;padding:12px;margin:16px 0;border-radius:6px;color:#c33;font-size:13px;">Mermaid error: ${escapeHtml(err.message || String(err))}</div>`;
      }

      cursor = start + placeholder.length;
    }

    result += html.slice(cursor);
    return result;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Render a single mermaid diagram to SVG string via Puppeteer.
 * Used by the DOCX renderer.
 *
 * @param {string} source - Mermaid diagram source code
 * @param {import('puppeteer').Browser} browser - Puppeteer browser instance
 * @returns {Promise<string>} SVG string
 */
export async function renderMermaidToSVG(source, browser) {
  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><html><body></body></html>');
    const mermaidPath = findMermaidScript();
    await page.addScriptTag({ path: mermaidPath });
    await page.evaluate(() => {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
        suppressErrors: true,
        logLevel: 'fatal',
      });
    });

    const svg = await page.evaluate(async (diagramSource) => {
      const { svg } = await window.mermaid.render('mmd-single', diagramSource);
      return svg;
    }, source);

    return svg;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Render SVG to PNG buffer via Puppeteer (for DOCX embedding).
 *
 * @param {string} svg - SVG markup
 * @param {import('puppeteer').Browser} browser - Puppeteer browser instance
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function svgToPNG(svg, browser) {
  const page = await browser.newPage();
  try {
    // Extract width/height from SVG or use defaults
    const widthMatch = svg.match(/width="([\d.]+)/);
    const heightMatch = svg.match(/height="([\d.]+)/);
    const width = Math.ceil(parseFloat(widthMatch?.[1] || '800'));
    const height = Math.ceil(parseFloat(heightMatch?.[1] || '600'));

    await page.setViewport({ width: Math.max(width + 40, 400), height: Math.max(height + 40, 300) });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:20px;background:white;">${svg}</body></html>`);

    const element = await page.$('svg');
    if (!element) throw new Error('SVG element not found');

    const pngBuffer = await element.screenshot({ type: 'png', omitBackground: false });
    return Buffer.from(pngBuffer);
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

let _mermaidScriptPath = null;

function findMermaidScript() {
  if (_mermaidScriptPath) return _mermaidScriptPath;

  try {
    const require = createRequire(import.meta.url);
    _mermaidScriptPath = require.resolve('mermaid/dist/mermaid.min.js');
    return _mermaidScriptPath;
  } catch {
    throw new Error('Could not find mermaid.min.js. Run: npm install mermaid');
  }
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
