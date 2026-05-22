import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  FootnoteReferenceRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  ShadingType,
  PageNumber,
  NumberFormat,
  Header,
  Footer,
} from 'docx';

/**
 * Render markdown to DOCX locally.
 * Returns a Buffer ready to write to disk.
 */
export async function localRenderDOCX(markdown, options = {}) {
  // 0. Extract footnote definitions before AST parsing
  const { cleaned, footnoteMap } = extractFootnotes(markdown);

  // 1. Parse markdown into AST
  const ast = parseMarkdownToAST(cleaned);

  // 2. Extract headings for TOC
  const headings = extractHeadings(cleaned);

  // 3. Convert AST to docx elements (async for mermaid rendering)
  const children = await astToDocxElements(ast, { ...options, footnoteMap });

  // 4. Cover page
  const coverElements = options.cover ? buildCoverPage(options) : [];

  // 5. TOC
  const tocElements = options.toc ? buildTOC(headings, options) : [];

  // 6. Build headers/footers
  const headerFooterConfig = buildHeaderFooter(options);

  // 7. Build footnotes config for docx Document
  const footnotes = {};
  for (const [, info] of footnoteMap) {
    footnotes[info.id] = {
      children: [new Paragraph({ children: parseInline(info.content, new Map()) })],
    };
  }

  // 8. Assemble document
  const doc = new Document({
    styles: buildStyles(options),
    footnotes,
    sections: [
      {
        properties: {
          page: {
            margin: getMargins(options.margins || 'normal'),
            size: {
              width: 12240,  // 8.5in in twips
              height: 15840,  // 11in in twips
            },
          },
          ...headerFooterConfig,
        },
        children: [
          ...coverElements,
          ...tocElements,
          ...children,
        ],
      },
    ],
  });

  // 8. Generate buffer
  return await Packer.toBuffer(doc);
}

// ── Markdown → AST ──────────────────────────────────────────────────

function parseMarkdownToAST(markdown) {
  const lines = markdown.split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.match(/^```/)) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      nodes.push({ type: 'code_block', lang, content: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|_{3,}|\*{3,})\s*$/)) {
      nodes.push({ type: 'hr' });
      i++;
      continue;
    }

    // Table (current line must contain | to avoid false positives on --- separators)
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.match(/^\|?\s*[-:]+/)) {
      const tableRows = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i]
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 1) {
        tableRows.splice(1, 1); // remove separator row
      }
      nodes.push({ type: 'table', rows: tableRows });
      continue;
    }

    // Blockquote
    if (line.match(/^>\s?/)) {
      const quoteLines = [];
      while (i < lines.length && lines[i].match(/^>\s?/)) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      nodes.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Unordered list (with nesting)
    if (line.match(/^[\s]*[-*+]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*+]\s+/)) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        const depth = Math.floor(indent / 2);
        items.push({ text: lines[i].replace(/^[\s]*[-*+]\s+/, ''), depth });
        i++;
      }
      nodes.push({ type: 'ul', items });
      continue;
    }

    // Ordered list (with nesting)
    if (line.match(/^[\s]*\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s+/)) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        const depth = Math.floor(indent / 2);
        items.push({ text: lines[i].replace(/^[\s]*\d+\.\s+/, ''), depth });
        i++;
      }
      nodes.push({ type: 'ol', items });
      continue;
    }

    // Image on its own line
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      nodes.push({ type: 'image', alt: imgMatch[1], src: imgMatch[2] });
      i++;
      continue;
    }

    // Scene break (centered *** or --- or ### used as separator in fiction)
    if (line.trim() === '***' || line.trim() === '* * *') {
      nodes.push({ type: 'scene_break' });
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — each line becomes its own paragraph (works for both prose and technical docs)
    nodes.push({ type: 'paragraph', content: line });
    i++;
  }

  return nodes;
}

// ── Heading extraction ──────────────────────────────────────────────

function extractHeadings(markdown) {
  const headings = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`\[\]]/g, '').trim();
      headings.push({ level, text });
    }
  }
  return headings;
}

// ── Footnote extraction ──────────────────────────────────────────────

function extractFootnotes(markdown) {
  const footnoteMap = new Map(); // label → { id (numeric), content }
  let nextId = 1;
  // Match footnote definitions: [^label]: content
  const defRegex = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
  let match;
  while ((match = defRegex.exec(markdown)) !== null) {
    footnoteMap.set(match[1], { id: nextId++, content: match[2] });
  }
  // Remove definitions from the markdown
  const cleaned = markdown.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, '').replace(/\n{3,}/g, '\n\n');
  return { cleaned, footnoteMap };
}

// ── AST → DOCX Elements ─────────────────────────────────────────────

async function astToDocxElements(ast, options) {
  const elements = [];
  const spacing = Math.round((parseFloat(options.lineSpacing) || 1.15) * 240);
  const fnMap = options.footnoteMap || new Map();

  // Collect mermaid blocks and render them in batch
  const mermaidNodes = ast.filter((n) => n.type === 'code_block' && n.lang === 'mermaid');
  let mermaidImages = new Map(); // source -> PNG buffer

  if (mermaidNodes.length > 0) {
    try {
      const puppeteer = await import('puppeteer');
      const { renderMermaidToSVG, svgToPNG } = await import('./mermaid-ssr.js');
      const browser = await puppeteer.default.launch({ headless: true });
      try {
        for (const node of mermaidNodes) {
          const svg = await renderMermaidToSVG(node.content, browser);
          const png = await svgToPNG(svg, browser);
          mermaidImages.set(node.content, { buffer: png, svg });
        }
      } finally {
        await browser.close();
      }
    } catch {
      // Mermaid not available — fall through to code block rendering
    }
  }

  for (const node of ast) {
    switch (node.type) {
      case 'heading': {
        const levelMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6,
        };
        elements.push(
          new Paragraph({
            heading: levelMap[node.level] || HeadingLevel.HEADING_4,
            children: parseInline(node.content, fnMap),
            spacing: { before: node.level === 1 ? 480 : 360, after: 160 },
            keepNext: true,
            keepLines: true,
          })
        );
        break;
      }

      case 'paragraph':
        elements.push(
          new Paragraph({
            children: parseInline(node.content, fnMap),
            spacing: { after: 160, line: spacing },
            widowControl: true,
          })
        );
        break;

      case 'code_block': {
        // Mermaid diagrams → embedded image
        if (node.lang === 'mermaid' && mermaidImages.has(node.content)) {
          const { buffer, svg } = mermaidImages.get(node.content);
          // Extract dimensions from SVG for proper sizing
          const wMatch = svg.match(/width="([\d.]+)/);
          const hMatch = svg.match(/height="([\d.]+)/);
          const svgW = parseFloat(wMatch?.[1] || '600');
          const svgH = parseFloat(hMatch?.[1] || '400');
          // Scale to fit page width (max ~6 inches = 432pt at 72dpi, or ~576px)
          const maxWidth = 576;
          const scale = svgW > maxWidth ? maxWidth / svgW : 1;
          const imgW = Math.round(svgW * scale);
          const imgH = Math.round(svgH * scale);

          elements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: imgW, height: imgH },
                  type: 'png',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
              keepLines: true,
            })
          );
          break;
        }

        const codeLines = node.content.split('\n');
        const runs = [];
        codeLines.forEach((line, idx) => {
          runs.push(new TextRun({ text: line, font: 'Courier New', size: 20, color: '1A1A1A' }));
          if (idx < codeLines.length - 1) {
            runs.push(new TextRun({ break: 1 }));
          }
        });
        elements.push(
          new Paragraph({
            children: runs,
            shading: { type: ShadingType.SOLID, color: 'F4F4F5' },
            spacing: { before: 200, after: 200 },
            indent: { left: 360, right: 360 },
            keepLines: true,
            keepNext: false,
          })
        );
        break;
      }

      case 'blockquote': {
        // Parse inline formatting, then rebuild each run as italic + gray
        const quoteChildren = parseInlineToPlain(node.content, fnMap).map((seg) =>
          new TextRun({ text: seg.text, bold: seg.bold, italics: true, color: '666666', font: seg.font, size: seg.size })
        );
        elements.push(
          new Paragraph({
            children: quoteChildren.length > 0 ? quoteChildren : [new TextRun({ text: node.content, italics: true, color: '666666' })],
            border: { left: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
            indent: { left: 480 },
            spacing: { before: 200, after: 200 },
          })
        );
        break;
      }

      case 'ul':
        for (const item of node.items) {
          const baseIndent = 720 + (item.depth || 0) * 360;
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: '\u2022  ' }), ...parseInline(item.text, fnMap)],
              indent: { left: baseIndent },
              spacing: { after: 80 },
            })
          );
        }
        break;

      case 'ol': {
        // Track numbering per depth level
        const counters = {};
        for (const item of node.items) {
          const depth = item.depth || 0;
          counters[depth] = (counters[depth] || 0) + 1;
          // Reset deeper counters when a shallower item appears
          for (const d of Object.keys(counters)) {
            if (Number(d) > depth) counters[d] = 0;
          }
          const baseIndent = 720 + depth * 360;
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: `${counters[depth]}.  ` }), ...parseInline(item.text, fnMap)],
              indent: { left: baseIndent },
              spacing: { after: 80 },
            })
          );
        }
        break;
      }

      case 'image': {
        try {
          const imgPath = resolveImagePath(node.src, options.basePath);
          const imgBuffer = readFileSync(imgPath);
          const ext = path.extname(imgPath).toLowerCase();
          const type = ext === '.png' ? 'png' : ext === '.gif' ? 'gif' : 'jpg';
          // Default to reasonable size, scale down if needed
          elements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 500, height: 350 },
                  type,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            })
          );
        } catch {
          // Image not found — render alt text as placeholder
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: `[Image: ${node.alt || node.src}]`, italics: true, color: '999999' })],
              spacing: { before: 100, after: 100 },
            })
          );
        }
        break;
      }

      case 'table':
        elements.push(buildTable(node.rows, fnMap));
        break;

      case 'scene_break':
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: '* * *', color: '999999' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 360 },
          })
        );
        break;

      case 'hr':
        elements.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
            spacing: { before: 240, after: 240 },
          })
        );
        break;
    }
  }

  return elements;
}

// ── Inline Formatting ────────────────────────────────────────────────

function parseInline(text, footnoteMap) {
  const fnMap = footnoteMap || new Map();
  const children = [];
  // Match: bold-italic, bold, italic, strikethrough, code, footnote refs, links
  const regex = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`|\[\^([^\]]+)\]|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    lastIndex = match.index + match[0].length;

    if (match[1]) {
      // ***bold italic***
      children.push(new TextRun({ text: match[1], bold: true, italics: true }));
    } else if (match[2]) {
      // **bold**
      children.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      // *italic*
      children.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      // ~~strikethrough~~
      children.push(new TextRun({ text: match[4], strike: true }));
    } else if (match[5]) {
      // `code`
      children.push(new TextRun({ text: match[5], font: 'Courier New', size: 20, color: '0369A1' }));
    } else if (match[6]) {
      // [^ref] — footnote reference
      const fnInfo = fnMap.get(match[6]);
      if (fnInfo) {
        children.push(new FootnoteReferenceRun(fnInfo.id));
      } else {
        // Unknown footnote — render as plain text
        children.push(new TextRun({ text: `[^${match[6]}]`, color: '999999' }));
      }
    } else if (match[7] && match[8]) {
      // [text](url) — real clickable hyperlink
      children.push(
        new ExternalHyperlink({
          link: match[8],
          children: [
            new TextRun({ text: match[7], color: '0369A1', underline: { type: 'single' }, style: 'Hyperlink' }),
          ],
        })
      );
    }
  }

  if (lastIndex < text.length) {
    children.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  if (children.length === 0) {
    children.push(new TextRun({ text }));
  }

  return children;
}

// ── Table Builder ────────────────────────────────────────────────────

function buildTable(rows, fnMap) {
  const tableRows = rows.map((cells, rowIdx) => {
    const isHeader = rowIdx === 0;
    return new TableRow({
      children: cells.map((cellText) => {
        return new TableCell({
          children: [
            new Paragraph({
              children: isHeader
                ? [new TextRun({ text: cellText, bold: true, size: 22 })]
                : parseInline(cellText, fnMap || new Map()),
            }),
          ],
          shading: isHeader ? { type: ShadingType.SOLID, color: 'F4F4F5' } : undefined,
          width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
        });
      }),
    });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ── Cover Page ───────────────────────────────────────────────────────

function buildCoverPage(options) {
  const title = options.coverTitle || 'Document';
  const elements = [];

  // Top spacer
  elements.push(new Paragraph({ spacing: { before: 6000 } }));

  // Title
  elements.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 72, color: '1A1A1A' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Date
  if (options.coverDate !== false) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: dateStr, color: '71717A', size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  // Page break after cover
  elements.push(new Paragraph({ children: [new PageBreak()] }));

  return elements;
}

// ── TOC ──────────────────────────────────────────────────────────────

function buildTOC(headings, options) {
  if (headings.length === 0) return [];

  const elements = [];

  elements.push(
    new Paragraph({
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    })
  );

  for (const h of headings) {
    const indent = (h.level - 1) * 360;
    const bold = h.level <= 2;
    const size = h.level === 1 ? 26 : h.level === 2 ? 24 : 22;

    elements.push(
      new Paragraph({
        children: [new TextRun({ text: h.text, bold, size, color: '333333' })],
        indent: { left: indent },
        spacing: { after: 80 },
      })
    );
  }

  elements.push(new Paragraph({ children: [new PageBreak()] }));

  return elements;
}

// ── Header / Footer ─────────────────────────────────────────────────

function buildHeaderFooter(options) {
  const config = {};

  if (options.header) {
    config.headers = {
      default: new Header({
        children: [
          new Paragraph({
            children: [new TextRun({ text: options.header, size: 18, color: '999999' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    };
  }

  if (options.footer || options.pageNumbers) {
    const footerRuns = [];
    if (options.footer) {
      footerRuns.push(new TextRun({ text: options.footer, size: 18, color: '999999' }));
    }
    if (options.footer && options.pageNumbers) {
      footerRuns.push(new TextRun({ text: ' — ', size: 18, color: '999999' }));
    }
    if (options.pageNumbers) {
      footerRuns.push(
        new TextRun({ size: 18, color: '999999', children: [PageNumber.CURRENT] })
      );
    }

    config.footers = {
      default: new Footer({
        children: [
          new Paragraph({
            children: footerRuns,
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    };
  }

  return config;
}

// ── Styles ───────────────────────────────────────────────────────────

function buildStyles(options) {
  const font = getFont(options.font || 'sans');
  const spacing = Math.round((parseFloat(options.lineSpacing) || 1.15) * 240);

  return {
    default: {
      document: {
        run: { font, size: 24, color: '1A1A1A' },
        paragraph: { spacing: { line: spacing } },
      },
      heading1: {
        run: { font, size: 52, bold: true, color: '000000' },
        paragraph: { spacing: { before: 480, after: 160 } },
      },
      heading2: {
        run: { font, size: 40, bold: true, color: '1A1A1A' },
        paragraph: { spacing: { before: 360, after: 120 } },
      },
      heading3: {
        run: { font, size: 32, bold: true, color: '333333' },
        paragraph: { spacing: { before: 300, after: 100 } },
      },
      heading4: {
        run: { font, size: 26, bold: true, color: '444444' },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function getFont(font) {
  const fonts = {
    sans: 'Calibri',
    serif: 'Georgia',
    mono: 'Courier New',
    humanist: 'Trebuchet MS',
    slab: 'Rockwell',
  };
  return fonts[font] || 'Calibri';
}

function getMargins(size) {
  // Values in twips (1440 = 1 inch)
  const m = {
    narrow: { top: 720, right: 720, bottom: 720, left: 720 },
    normal: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
    wide: { top: 1440, right: 1800, bottom: 1440, left: 1800 },
  };
  return m[size] || m.normal;
}

function resolveImagePath(src, basePath) {
  if (path.isAbsolute(src)) return src;
  // Resolve relative to the source markdown file's directory
  const base = basePath || process.cwd();
  return path.resolve(base, src);
}

/**
 * Parse inline markdown to plain segment objects (not TextRun instances)
 * so callers can override styles like italics/color.
 */
function parseInlineToPlain(text, footnoteMap) {
  const fnMap = footnoteMap || new Map();
  const segments = [];
  const regex = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`|\[\^([^\]]+)\]|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    lastIndex = match.index + match[0].length;

    if (match[1]) {
      segments.push({ text: match[1], bold: true });
    } else if (match[2]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[3] });
    } else if (match[4]) {
      segments.push({ text: match[4] });
    } else if (match[5]) {
      segments.push({ text: match[5], font: 'Courier New', size: 20 });
    } else if (match[6]) {
      segments.push({ text: `[^${match[6]}]` });
    } else if (match[7]) {
      segments.push({ text: match[7] });
    }
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
}
