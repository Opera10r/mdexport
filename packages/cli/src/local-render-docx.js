import {
  Document,
  Paragraph,
  TextRun,
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
  // 1. Parse markdown into AST
  const ast = parseMarkdownToAST(markdown);

  // 2. Extract headings for TOC
  const headings = extractHeadings(markdown);

  // 3. Convert AST to docx elements
  const children = astToDocxElements(ast, options);

  // 4. Cover page
  const coverElements = options.cover ? buildCoverPage(options) : [];

  // 5. TOC
  const tocElements = options.toc ? buildTOC(headings, options) : [];

  // 6. Build headers/footers
  const headerFooterConfig = buildHeaderFooter(options);

  // 7. Assemble document
  const doc = new Document({
    styles: buildStyles(options),
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

// ── AST → DOCX Elements ─────────────────────────────────────────────

function astToDocxElements(ast, options) {
  const elements = [];
  const spacing = Math.round((parseFloat(options.lineSpacing) || 1.15) * 240);

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
            children: parseInline(node.content),
            spacing: { before: node.level === 1 ? 480 : 360, after: 160 },
          })
        );
        break;
      }

      case 'paragraph':
        elements.push(
          new Paragraph({
            children: parseInline(node.content),
            spacing: { after: 160, line: spacing },
          })
        );
        break;

      case 'code_block': {
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
          })
        );
        break;
      }

      case 'blockquote': {
        // Re-parse the blockquote content as italic gray text
        const quoteRuns = parseInline(node.content);
        const italicRuns = quoteRuns.map(() => {
          // We can't easily extract text from TextRun, so re-parse simply
          return new TextRun({ text: '', italics: true, color: '666666' });
        });
        // Simpler approach: just render the raw content as italic
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: node.content, italics: true, color: '666666' })],
            border: { left: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
            indent: { left: 480 },
            spacing: { before: 200, after: 200 },
          })
        );
        break;
      }

      case 'ul':
        for (const item of node.items) {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: '\u2022  ' }), ...parseInline(item)],
              indent: { left: 720 },
              spacing: { after: 80 },
            })
          );
        }
        break;

      case 'ol':
        node.items.forEach((item, idx) => {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: `${idx + 1}.  ` }), ...parseInline(item)],
              indent: { left: 720 },
              spacing: { after: 80 },
            })
          );
        });
        break;

      case 'table':
        elements.push(buildTable(node.rows));
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

function parseInline(text) {
  const runs = [];
  // Match bold-italic, bold, italic (non-greedy, no nested *), code, links
  // Use [^*] instead of .+? for italic to prevent catastrophic backtracking
  const regex = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    lastIndex = match.index + match[0].length;

    if (match[1]) {
      runs.push(new TextRun({ text: match[1], bold: true, italics: true }));
    } else if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: 'Courier New', size: 20, color: '0369A1' }));
    } else if (match[5] && match[6]) {
      runs.push(new TextRun({ text: match[5], color: '0369A1', underline: {} }));
    }
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

// ── Table Builder ────────────────────────────────────────────────────

function buildTable(rows) {
  const tableRows = rows.map((cells, rowIdx) => {
    const isHeader = rowIdx === 0;
    return new TableRow({
      children: cells.map((cellText) => {
        return new TableCell({
          children: [
            new Paragraph({
              children: isHeader
                ? [new TextRun({ text: cellText, bold: true, size: 22 })]
                : parseInline(cellText),
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
