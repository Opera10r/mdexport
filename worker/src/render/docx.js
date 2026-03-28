import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  ExternalHyperlink,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  ShadingType,
  TabStopPosition,
  TabStopType,
} from 'docx';
import { extractHeadings } from './markdown.js';

/**
 * Full DOCX rendering pipeline.
 * markdown → AST → docx elements → Document → buffer
 */
export async function renderDOCX(markdown, options, env) {
  // 1. Parse markdown into simple AST
  const ast = parseMarkdownToAST(markdown);

  // 2. Extract headings for TOC
  const headings = extractHeadings(markdown);

  // 3. Convert AST nodes to docx elements
  const children = astToDocxElements(ast, options);

  // 4. Build cover page if enabled
  const coverElements = options.cover?.enabled ? buildCoverPage(options) : [];

  // 5. Build TOC if enabled
  const tocElements = options.toc ? buildTOC(headings, options) : [];

  // 6. Assemble document
  const doc = new Document({
    styles: buildDocxStyles(options),
    sections: [
      {
        properties: {
          page: {
            margin: getDocxMargins(options.margins || 'normal'),
          },
        },
        children: [
          ...coverElements,
          ...tocElements,
          ...children,
        ],
      },
    ],
  });

  // 7. Generate buffer
  const buffer = await Packer.toBuffer(doc);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="export.docx"',
    },
  });
}

// ── Markdown → AST ──────────────────────────────────────────────────

function parseMarkdownToAST(markdown) {
  const lines = markdown.split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (fenced)
    if (line.match(/^```/)) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
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

    // Table
    if (i + 1 < lines.length && lines[i + 1]?.match(/^\|?\s*-+/)) {
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
      // Remove separator row (row index 1)
      if (tableRows.length > 1) {
        tableRows.splice(1, 1);
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

    // Unordered list
    if (line.match(/^[\s]*[-*+]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*+]\s+/)) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''));
        i++;
      }
      nodes.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (line.match(/^[\s]*\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s+/)) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ''));
        i++;
      }
      nodes.push({ type: 'ol', items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,6}\s|```|>|[-*+]\s|\d+\.\s|(-{3,}|_{3,}|\*{3,})\s*$)/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return nodes;
}

// ── AST → DOCX Elements ─────────────────────────────────────────────

function astToDocxElements(ast, options) {
  const elements = [];
  const accent = options.accent_color || getAccent(options.theme || 'clean');

  for (const node of ast) {
    switch (node.type) {
      case 'heading':
        elements.push(buildHeading(node, accent));
        break;

      case 'paragraph':
        elements.push(buildParagraph(node.content, options));
        break;

      case 'code_block':
        elements.push(buildCodeBlock(node));
        break;

      case 'blockquote':
        elements.push(buildBlockquote(node, accent));
        break;

      case 'ul':
        for (const item of node.items) {
          elements.push(buildListItem(item, false, options));
        }
        break;

      case 'ol':
        node.items.forEach((item, idx) => {
          elements.push(buildOrderedListItem(item, idx + 1, options));
        });
        break;

      case 'table':
        elements.push(buildTable(node.rows, accent));
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

// ── Element Builders ─────────────────────────────────────────────────

function buildHeading(node, accent) {
  const levelMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  };

  const runs = parseInlineFormatting(node.content);

  return new Paragraph({
    heading: levelMap[node.level] || HeadingLevel.HEADING_4,
    children: runs,
    spacing: { before: node.level === 1 ? 360 : 240, after: 120 },
  });
}

function buildParagraph(content, options) {
  const runs = parseInlineFormatting(content);
  const spacing = Math.round((options.line_spacing || 1.15) * 240);

  return new Paragraph({
    children: runs,
    spacing: { after: 120, line: spacing },
  });
}

function buildCodeBlock(node) {
  const lines = node.content.split('\n');
  const runs = [];

  lines.forEach((line, idx) => {
    runs.push(
      new TextRun({
        text: line,
        font: 'Courier New',
        size: 20, // 10pt
        color: '1A1A1A',
      })
    );
    if (idx < lines.length - 1) {
      runs.push(new TextRun({ break: 1 }));
    }
  });

  return new Paragraph({
    children: runs,
    shading: { type: ShadingType.SOLID, color: 'F4F4F5' },
    spacing: { before: 160, after: 160 },
    indent: { left: 360, right: 360 },
  });
}

function buildBlockquote(node, accent) {
  const runs = parseInlineFormatting(node.content);
  // Make all runs italic and gray
  for (const run of runs) {
    // TextRun objects are immutable after creation, so we rebuild
  }

  return new Paragraph({
    children: parseInlineFormatting(node.content).map((r) => {
      return new TextRun({
        text: r.text || '',
        italics: true,
        color: '666666',
        font: r.font,
        size: r.size,
      });
    }),
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: accent.replace('#', '') } },
    indent: { left: 360 },
    spacing: { before: 160, after: 160 },
  });
}

function buildListItem(content, ordered, options) {
  const runs = parseInlineFormatting(content);

  return new Paragraph({
    children: [
      new TextRun({ text: '•  ', font: 'Symbol' }),
      ...runs,
    ],
    indent: { left: 720 },
    spacing: { after: 60 },
  });
}

function buildOrderedListItem(content, number, options) {
  const runs = parseInlineFormatting(content);

  return new Paragraph({
    children: [
      new TextRun({ text: `${number}.  ` }),
      ...runs,
    ],
    indent: { left: 720 },
    spacing: { after: 60 },
  });
}

function buildTable(rows, accent) {
  const accentHex = accent.replace('#', '');
  const tableRows = rows.map((cells, rowIdx) => {
    const isHeader = rowIdx === 0;
    return new TableRow({
      children: cells.map((cellText) => {
        const runs = parseInlineFormatting(cellText);
        return new TableCell({
          children: [
            new Paragraph({
              children: isHeader
                ? runs.map((r) => new TextRun({ text: r.text || '', bold: true, size: r.size || 22 }))
                : runs,
            }),
          ],
          shading: isHeader
            ? { type: ShadingType.SOLID, color: 'F4F4F5' }
            : undefined,
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

// ── Inline Formatting Parser ─────────────────────────────────────────

function parseInlineFormatting(text) {
  const runs = [];
  // Regex to match: **bold**, *italic*, `code`, [link](url), or plain text
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|([^*`\[]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      // Italic
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      // Inline code
      runs.push(new TextRun({ text: match[4], font: 'Courier New', size: 20, color: '0369A1' }));
    } else if (match[5] && match[6]) {
      // Link — render as colored text (DOCX hyperlinks need relationship, keep simple for now)
      runs.push(new TextRun({ text: match[5], color: '0369A1', underline: {} }));
    } else if (match[7]) {
      // Plain text
      runs.push(new TextRun({ text: match[7] }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: text }));
  }

  return runs;
}

// ── Cover Page ───────────────────────────────────────────────────────

function buildCoverPage(options) {
  const title = options.cover.title || 'Document';
  const elements = [];

  // Spacer
  elements.push(new Paragraph({ spacing: { before: 4000 } }));

  // Title
  elements.push(
    new Paragraph({
      children: [
        new TextRun({ text: title, bold: true, size: 72, color: '1A1A1A' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Date
  if (options.cover.date !== false) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: dateStr, color: '71717A', size: 28 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Page break after cover
  elements.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  return elements;
}

// ── Table of Contents ────────────────────────────────────────────────

function buildTOC(headings, options) {
  if (headings.length === 0) return [];

  const elements = [];

  elements.push(
    new Paragraph({
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 36 })],
      spacing: { after: 240 },
    })
  );

  for (const h of headings) {
    const indent = (h.level - 1) * 360;
    const size = h.level === 1 ? 24 : h.level === 2 ? 22 : 20;
    const bold = h.level <= 2;

    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: h.text, bold, size, color: '333333' }),
        ],
        indent: { left: indent },
        spacing: { after: 60 },
      })
    );
  }

  // Page break after TOC
  elements.push(new Paragraph({ children: [new PageBreak()] }));

  return elements;
}

// ── Styles ───────────────────────────────────────────────────────────

function buildDocxStyles(options) {
  const font = getDocxFont(options.font || 'sans');

  return {
    default: {
      document: {
        run: {
          font: font,
          size: 22, // 11pt
          color: '1A1A1A',
        },
        paragraph: {
          spacing: { line: Math.round((options.line_spacing || 1.15) * 240) },
        },
      },
      heading1: {
        run: { font: font, size: 48, bold: true, color: '000000' },
        paragraph: { spacing: { before: 360, after: 120 } },
      },
      heading2: {
        run: { font: font, size: 36, bold: true, color: '1A1A1A' },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading3: {
        run: { font: font, size: 28, bold: true, color: '333333' },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
      heading4: {
        run: { font: font, size: 24, bold: true, color: '444444' },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function getDocxFont(font) {
  const fonts = {
    sans: 'Calibri',
    serif: 'Georgia',
    mono: 'Courier New',
    humanist: 'Trebuchet MS',
    slab: 'Rockwell',
  };
  return fonts[font] || 'Calibri';
}

function getDocxMargins(size) {
  // Values in twentieths of a point (1440 = 1 inch)
  const m = {
    narrow: { top: 720, right: 720, bottom: 720, left: 720 },
    normal: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
    wide: { top: 1440, right: 1800, bottom: 1440, left: 1800 },
  };
  return m[size] || m.normal;
}

function getAccent(theme) {
  const accents = { clean: '#000000', dark: '#7C3AED', editorial: '#B45309', technical: '#0369A1', warm: '#92400E' };
  return accents[theme] || '#000000';
}
