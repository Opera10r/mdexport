import { Marked } from 'marked';

/**
 * Parse markdown string into HTML.
 * Handles: headings, paragraphs, bold, italic, inline code, code blocks,
 * blockquotes, ordered/unordered lists, images, tables, horizontal rules, links.
 *
 * If TOC is enabled, extracts headings and generates a table of contents.
 */

const marked = new Marked({
  gfm: true,
  breaks: false,
});

export function parseMarkdown(markdown) {
  return marked.parse(markdown);
}

/**
 * Extract headings from markdown for TOC generation.
 * Returns array of { level, text, id }
 */
export function extractHeadings(markdown) {
  const headings = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`\[\]]/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ level, text, id });
    }
  }

  return headings;
}

/**
 * Build a styled HTML table of contents from extracted headings.
 */
export function buildTOCHTML(headings) {
  if (headings.length === 0) return '';

  let html = '<nav class="toc"><h2 class="toc-title">Table of Contents</h2><ul class="toc-list">';

  for (const h of headings) {
    const indent = (h.level - 1) * 20;
    html += `<li style="padding-left: ${indent}px;" class="toc-item toc-level-${h.level}">`;
    html += `<a href="#${h.id}">${escapeHTML(h.text)}</a>`;
    html += '</li>';
  }

  html += '</ul></nav>';
  return html;
}

/**
 * Add IDs to headings in parsed HTML so TOC links work.
 */
export function addHeadingIDs(html, headings) {
  let result = html;
  for (const h of headings) {
    // Match the heading tag and add an id attribute
    const tagRegex = new RegExp(`<h${h.level}>([^<]*${escapeRegex(h.text)}[^<]*)</h${h.level}>`, 'i');
    result = result.replace(tagRegex, `<h${h.level} id="${h.id}">$1</h${h.level}>`);
  }
  return result;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
