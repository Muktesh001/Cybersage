/**
 * CyberSage - PDF Report Generator Service
 *
 * Purpose:
 *   Generates a professional multi-page PDF security audit report
 *   using pdf-lib (no external font dependencies required).
 *
 * PDF Structure:
 *   Page 1:   Cover — branding, URL, date, score, grade
 *   Page 2:   Summary — severity table, HTTPS info, server info
 *   Page 3+:  Findings — one finding per entry with evidence + recommendation
 *   Last:     AI Explanation — summary, risks, quick wins, code example
 *
 * Returns: Buffer (PDF bytes) ready to stream as application/pdf
 */

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

// ---- Color Palette ----
const COLORS = {
  bg:         rgb(0.047, 0.090, 0.133),  // #0c1722 — dark navy
  card:       rgb(0.071, 0.118, 0.165),  // #12263a
  border:     rgb(0.118, 0.176, 0.231),  // #1e2d3a
  primary:    rgb(0.055, 0.647, 0.914),  // #0ea5e9
  white:      rgb(1, 1, 1),
  gray:       rgb(0.596, 0.635, 0.675),  // #98a2ac
  lightGray:  rgb(0.820, 0.847, 0.875),
  critical:   rgb(0.937, 0.267, 0.267),  // #ef4444
  high:       rgb(0.980, 0.451, 0.086),  // #f97316
  medium:     rgb(0.918, 0.702, 0.031),  // #eab308
  low:        rgb(0.231, 0.510, 0.965),  // #3b82f6
  info:       rgb(0.392, 0.451, 0.533),  // #647280
  green:      rgb(0.133, 0.773, 0.369),  // #22c55e
};

// Severity → color map
const SEVERITY_COLORS = {
  critical: COLORS.critical,
  high:     COLORS.high,
  medium:   COLORS.medium,
  low:      COLORS.low,
  info:     COLORS.info
};

// ---- Layout Constants ----
const PAGE_W  = 595;  // A4 width  (points)
const PAGE_H  = 842;  // A4 height (points)
const MARGIN  = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ---- Text Helpers ----
const truncate = (str, max) => {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
};

const wrapText = (text, maxChars) => {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let line    = '';
  for (const word of words) {
    if ((line + word).length > maxChars) {
      if (line) lines.push(line.trim());
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : [''];
};

/**
 * Draw a filled rectangle
 */
const drawRect = (page, x, y, w, h, color, borderColor = null) => {
  page.drawRectangle({ x, y, width: w, height: h, color });
  if (borderColor) {
    page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth: 1, color: undefined });
  }
};

/**
 * Draw text with safe fallback
 */
const drawText = (page, text, x, y, { font, size = 10, color = COLORS.white, maxWidth = null } = {}) => {
  const safeText = truncate(String(text || ''), maxWidth ? Math.floor(maxWidth / (size * 0.5)) : 200);
  page.drawText(safeText, { x, y, size, font, color });
};

/**
 * Draw a horizontal divider line
 */
const drawDivider = (page, y, color = COLORS.border) => {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color });
};

/**
 * Add a new blank page with dark background
 */
const addPage = async (pdfDoc) => {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawRect(page, 0, 0, PAGE_W, PAGE_H, COLORS.bg);
  return page;
};

/**
 * Draw page header bar
 */
const drawPageHeader = (page, fonts, title, pageNum) => {
  drawRect(page, 0, PAGE_H - 40, PAGE_W, 40, COLORS.card);
  drawText(page, 'CyberSage Security Report', MARGIN, PAGE_H - 26, { font: fonts.bold, size: 9, color: COLORS.primary });
  drawText(page, title, MARGIN + 180, PAGE_H - 26, { font: fonts.regular, size: 9, color: COLORS.gray });
  drawText(page, `Page ${pageNum}`, PAGE_W - MARGIN - 40, PAGE_H - 26, { font: fonts.regular, size: 9, color: COLORS.gray });
};

/**
 * Draw score arc (simplified arc using line segments)
 */
const drawScoreArc = (page, cx, cy, radius, score) => {
  // Background circle (approximated with rectangle for simplicity in pdf-lib)
  page.drawCircle({ x: cx, y: cy, size: radius, borderColor: COLORS.border, borderWidth: 8, color: undefined });

  // Score color
  let scoreColor = COLORS.critical;
  if (score >= 90)      scoreColor = COLORS.green;
  else if (score >= 70) scoreColor = COLORS.primary;
  else if (score >= 50) scoreColor = COLORS.medium;
  else if (score >= 30) scoreColor = COLORS.high;

  // Score text in center
  page.drawText(String(score), {
    x: cx - (score >= 100 ? 18 : score >= 10 ? 13 : 8),
    y: cy - 8,
    size: 28,
    color: scoreColor
  });

  page.drawText('/ 100', { x: cx - 14, y: cy - 22, size: 10, color: COLORS.gray });
};

// ========================================
// MAIN GENERATOR
// ========================================

/**
 * Generate a complete PDF security audit report
 *
 * @param {object} scanData - Full scan result from DB
 * @returns {Promise<Uint8Array>} - PDF bytes
 */
const generatePDFReport = async (scanData) => {
  const {
    url           = '',
    domain        = '',
    score         = 0,
    grade         = 'F',
    findings      = [],
    findingsSummary = {},
    httpsInfo     = {},
    serverInfo    = {},
    cookies       = [],
    aiExplanation = null,
    createdAt,
    scanDuration
  } = scanData;

  const negFindings = findings.filter(f => !f.positive);
  const scanDate    = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : 'Unknown';
  const scanTime    = createdAt ? new Date(createdAt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '';

  // ── Create PDF ────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();

  // Embed standard fonts
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold:    await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    oblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    mono:    await pdfDoc.embedFont(StandardFonts.Courier)
  };

  // ══════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════
  const p1 = await addPage(pdfDoc);

  // Top accent bar
  drawRect(p1, 0, PAGE_H - 6, PAGE_W, 6, COLORS.primary);

  // Logo area
  drawRect(p1, MARGIN, PAGE_H - 90, 44, 44, COLORS.card);
  drawText(p1, 'CS', MARGIN + 12, PAGE_H - 60, { font: fonts.bold, size: 18, color: COLORS.primary });

  // App name
  drawText(p1, 'CyberSage', MARGIN + 56, PAGE_H - 52, { font: fonts.bold, size: 22, color: COLORS.white });
  drawText(p1, 'AI-Powered Web Security Configuration Audit', MARGIN + 56, PAGE_H - 70, { font: fonts.regular, size: 10, color: COLORS.gray });

  // Report title
  const titleY = PAGE_H - 160;
  drawText(p1, 'SECURITY AUDIT REPORT', MARGIN, titleY, { font: fonts.bold, size: 26, color: COLORS.white });
  drawDivider(p1, titleY - 14, COLORS.primary);

  // Target info box
  const infoY = titleY - 60;
  drawRect(p1, MARGIN, infoY - 70, CONTENT_W, 80, COLORS.card);
  drawRect(p1, MARGIN, infoY - 70, 4, 80, COLORS.primary); // left accent
  drawText(p1, 'Target Website', MARGIN + 16, infoY - 16, { font: fonts.bold, size: 9, color: COLORS.primary });
  drawText(p1, truncate(url, 80), MARGIN + 16, infoY - 32, { font: fonts.regular, size: 11, color: COLORS.white });
  drawText(p1, 'Domain: ' + domain, MARGIN + 16, infoY - 48, { font: fonts.regular, size: 9, color: COLORS.gray });
  drawText(p1, 'Scan Date: ' + scanDate + '  ' + scanTime, MARGIN + 16, infoY - 62, { font: fonts.regular, size: 9, color: COLORS.gray });

  // Score gauge area
  const gaugeY = infoY - 180;
  const gaugeCX = PAGE_W / 2;
  drawScoreArc(p1, gaugeCX, gaugeY, 55, score);

  // Grade badge
  let gradeColor = COLORS.critical;
  if (grade === 'A+' || grade === 'A') gradeColor = COLORS.green;
  else if (grade === 'B')              gradeColor = COLORS.primary;
  else if (grade === 'C')              gradeColor = COLORS.medium;
  else if (grade === 'D')              gradeColor = COLORS.high;

  drawRect(p1, gaugeCX - 20, gaugeY - 95, 40, 28, COLORS.card);
  drawText(p1, grade, gaugeCX - (grade.length > 1 ? 12 : 7), gaugeY - 76, { font: fonts.bold, size: 18, color: gradeColor });
  drawText(p1, 'Security Grade', gaugeCX - 38, gaugeY - 108, { font: fonts.regular, size: 9, color: COLORS.gray });

  // Score label
  let scoreLabel = 'Critical';
  if (score >= 90)      scoreLabel = 'Excellent';
  else if (score >= 70) scoreLabel = 'Good';
  else if (score >= 50) scoreLabel = 'Fair';
  else if (score >= 30) scoreLabel = 'Poor';
  drawText(p1, scoreLabel, gaugeCX - (scoreLabel.length * 3), gaugeY + 72, { font: fonts.bold, size: 12, color: gradeColor });

  // Summary stats row
  const statsY = gaugeY - 150;
  const statW  = (CONTENT_W - 16) / 4;
  const stats  = [
    { label: 'Total Findings',   value: String(negFindings.length)        },
    { label: 'Critical + High',  value: String((findingsSummary.critical||0) + (findingsSummary.high||0)) },
    { label: 'HTTPS Enabled',    value: httpsInfo.enabled ? 'Yes' : 'No'  },
    { label: 'Scan Duration',    value: scanDuration ? `${Math.round(scanDuration/1000)}s` : 'N/A' }
  ];
  stats.forEach((stat, i) => {
    const sx = MARGIN + i * (statW + 4);
    drawRect(p1, sx, statsY - 36, statW, 46, COLORS.card);
    drawText(p1, stat.value, sx + 10, statsY - 12, { font: fonts.bold, size: 14, color: COLORS.white });
    drawText(p1, stat.label, sx + 10, statsY - 28, { font: fonts.regular, size: 8, color: COLORS.gray });
  });

  // Footer
  drawRect(p1, 0, 0, PAGE_W, 32, COLORS.card);
  drawText(p1, 'PASSIVE CONFIGURATION AUDIT ONLY - No active testing, exploitation, or penetration testing was performed.',
    MARGIN, 12, { font: fonts.oblique, size: 7.5, color: COLORS.gray });

  // ══════════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ══════════════════════════════════════════
  const p2 = await addPage(pdfDoc);
  drawPageHeader(p2, fonts, 'Executive Summary', 2);

  let y2 = PAGE_H - 72;

  drawText(p2, 'EXECUTIVE SUMMARY', MARGIN, y2, { font: fonts.bold, size: 16, color: COLORS.white });
  y2 -= 24;

  // Severity breakdown table
  drawText(p2, 'Findings by Severity', MARGIN, y2, { font: fonts.bold, size: 11, color: COLORS.primary });
  y2 -= 16;

  const severities = [
    { key: 'critical', label: 'Critical', color: COLORS.critical },
    { key: 'high',     label: 'High',     color: COLORS.high     },
    { key: 'medium',   label: 'Medium',   color: COLORS.medium   },
    { key: 'low',      label: 'Low',      color: COLORS.low      },
    { key: 'info',     label: 'Info',     color: COLORS.info     }
  ];

  severities.forEach(sev => {
    const count = findingsSummary[sev.key] || 0;
    const barW  = count > 0 ? Math.min((count / Math.max(negFindings.length, 1)) * 200, 200) : 0;
    drawRect(p2, MARGIN, y2 - 14, CONTENT_W, 22, COLORS.card);
    drawRect(p2, MARGIN, y2 - 14, 3, 22, sev.color);
    drawText(p2, sev.label, MARGIN + 12, y2 - 7, { font: fonts.bold, size: 9, color: COLORS.white });
    if (barW > 0) drawRect(p2, MARGIN + 80, y2 - 10, barW, 10, sev.color);
    drawText(p2, String(count), PAGE_W - MARGIN - 20, y2 - 7, { font: fonts.bold, size: 10, color: sev.color });
    y2 -= 28;
  });

  y2 -= 16;
  drawDivider(p2, y2);
  y2 -= 20;

  // Site configuration table
  drawText(p2, 'Site Configuration', MARGIN, y2, { font: fonts.bold, size: 11, color: COLORS.primary });
  y2 -= 16;

  const configRows = [
    ['HTTPS Enabled',          httpsInfo.enabled           ? 'Yes' : 'No'],
    ['HTTP to HTTPS Redirect', httpsInfo.redirectsToHttps  ? 'Yes' : 'No'],
    ['HSTS Present',           httpsInfo.hsts              ? 'Yes' : 'No'],
    ['HSTS max-age',           httpsInfo.hstsMaxAge        ? `${httpsInfo.hstsMaxAge}s` : 'N/A'],
    ['Server Header',          serverInfo.serverHeader     || 'Not disclosed'],
    ['HTTP Status Code',       String(serverInfo.statusCode || 'N/A')],
    ['Response Time',          serverInfo.responseTime     ? `${serverInfo.responseTime}ms` : 'N/A'],
    ['Cookies Detected',       String(cookies.length)],
  ];

  configRows.forEach(([label, value], i) => {
    const rowBg = i % 2 === 0 ? COLORS.card : COLORS.bg;
    drawRect(p2, MARGIN, y2 - 14, CONTENT_W, 20, rowBg);
    drawText(p2, label, MARGIN + 8, y2 - 7, { font: fonts.regular, size: 9, color: COLORS.gray });
    const valColor = (value === 'No' && ['HTTPS Enabled','HTTP to HTTPS Redirect','HSTS Present'].includes(label))
      ? COLORS.critical : COLORS.white;
    drawText(p2, value, MARGIN + 200, y2 - 7, { font: fonts.bold, size: 9, color: valColor });
    y2 -= 22;
  });

  // ══════════════════════════════════════════
  // PAGE(S) 3+ — FINDINGS
  // ══════════════════════════════════════════
  if (negFindings.length > 0) {
    let pF    = await addPage(pdfDoc);
    let pageN = 3;
    drawPageHeader(pF, fonts, 'Security Findings', pageN);
    let yF = PAGE_H - 72;

    drawText(pF, 'SECURITY FINDINGS', MARGIN, yF, { font: fonts.bold, size: 16, color: COLORS.white });
    yF -= 30;

    for (let i = 0; i < negFindings.length; i++) {
      const f = negFindings[i];

      // Check if we need a new page (need ~110px for a finding block)
      if (yF < 130) {
        pF = await addPage(pdfDoc);
        pageN++;
        drawPageHeader(pF, fonts, 'Security Findings (cont.)', pageN);
        yF = PAGE_H - 72;
      }

      const sevColor = SEVERITY_COLORS[f.severity] || COLORS.info;

      // Finding card background
      drawRect(pF, MARGIN, yF - 88, CONTENT_W, 94, COLORS.card);
      drawRect(pF, MARGIN, yF - 88, 3, 94, sevColor); // severity accent

      // Finding number + title
      drawText(pF, `${i + 1}.`, MARGIN + 12, yF - 10, { font: fonts.bold, size: 10, color: COLORS.gray });
      drawText(pF, truncate(f.title, 65), MARGIN + 28, yF - 10, { font: fonts.bold, size: 11, color: COLORS.white });

      // Severity + category badges
      const sevLabel = (f.severity || 'info').toUpperCase();
      drawRect(pF, MARGIN + 28, yF - 30, sevLabel.length * 6 + 12, 16, COLORS.bg);
      drawText(pF, sevLabel, MARGIN + 34, yF - 25, { font: fonts.bold, size: 8, color: sevColor });
      drawText(pF, f.category || '', MARGIN + 28 + sevLabel.length * 6 + 18, yF - 25, { font: fonts.regular, size: 8, color: COLORS.gray });
      drawText(pF, `Rule: ${f.ruleId}`, PAGE_W - MARGIN - 60, yF - 25, { font: fonts.regular, size: 8, color: COLORS.gray });

      // Evidence
      if (f.evidence) {
        drawText(pF, 'Evidence: ' + truncate(f.evidence, 80), MARGIN + 12, yF - 48, { font: fonts.mono, size: 8, color: COLORS.medium });
      }

      // Recommendation
      const recLines = wrapText(f.recommendation || '', 95);
      drawText(pF, '> ' + (recLines[0] || ''), MARGIN + 12, yF - 66, { font: fonts.regular, size: 8.5, color: COLORS.green });
      if (recLines[1]) {
        drawText(pF, '  ' + recLines[1], MARGIN + 12, yF - 78, { font: fonts.regular, size: 8.5, color: COLORS.green });
      }

      yF -= 104;
    }
  }

  // ══════════════════════════════════════════
  // LAST PAGE — AI EXPLANATION
  // ══════════════════════════════════════════
  const pAI    = await addPage(pdfDoc);
  const aiPageN = pdfDoc.getPageCount();
  drawPageHeader(pAI, fonts, 'AI Analysis', aiPageN);
  let yAI = PAGE_H - 72;

  drawText(pAI, 'AI SECURITY ANALYSIS', MARGIN, yAI, { font: fonts.bold, size: 16, color: COLORS.white });

  // AI source badge
  const aiSource = aiExplanation?.generatedBy === 'gemini' ? 'Gemini AI' : 'Rule-Based Analysis';
  drawRect(pAI, PAGE_W - MARGIN - 90, yAI - 8, 90, 18, COLORS.card);
  drawText(pAI, aiSource, PAGE_W - MARGIN - 84, yAI - 2, { font: fonts.regular, size: 8, color: COLORS.primary });
  yAI -= 28;

  if (!aiExplanation || !aiExplanation.summary) {
    drawText(pAI, 'AI explanation not generated for this scan.', MARGIN, yAI, { font: fonts.oblique, size: 10, color: COLORS.gray });
    drawText(pAI, 'Use the CyberSage web interface to generate an AI analysis.', MARGIN, yAI - 18, { font: fonts.regular, size: 9, color: COLORS.gray });
  } else {
    // Summary
    drawText(pAI, 'Summary', MARGIN, yAI, { font: fonts.bold, size: 11, color: COLORS.primary });
    yAI -= 16;
    const summaryLines = wrapText(aiExplanation.summary, 95);
    summaryLines.slice(0, 4).forEach(line => {
      drawText(pAI, line, MARGIN, yAI, { font: fonts.regular, size: 9.5, color: COLORS.lightGray });
      yAI -= 14;
    });
    yAI -= 8;

    // Why It Matters
    if (aiExplanation.whyItMatters) {
      drawText(pAI, 'Why It Matters', MARGIN, yAI, { font: fonts.bold, size: 11, color: COLORS.primary });
      yAI -= 16;
      wrapText(aiExplanation.whyItMatters, 95).slice(0, 3).forEach(line => {
        drawText(pAI, line, MARGIN, yAI, { font: fonts.regular, size: 9.5, color: COLORS.lightGray });
        yAI -= 14;
      });
      yAI -= 8;
    }

    // Top Risks
    if (aiExplanation.topRisks?.length > 0) {
      drawText(pAI, 'Top Risks', MARGIN, yAI, { font: fonts.bold, size: 11, color: COLORS.high });
      yAI -= 16;
      aiExplanation.topRisks.slice(0, 3).forEach((risk, i) => {
        drawText(pAI, `${i + 1}. ${truncate(risk, 90)}`, MARGIN + 8, yAI, { font: fonts.regular, size: 9.5, color: COLORS.lightGray });
        yAI -= 14;
      });
      yAI -= 8;
    }

    // Quick Wins
    if (aiExplanation.quickWins?.length > 0) {
      drawText(pAI, 'Quick Wins', MARGIN, yAI, { font: fonts.bold, size: 11, color: COLORS.green });
      yAI -= 16;
      aiExplanation.quickWins.slice(0, 3).forEach((win, i) => {
        drawText(pAI, `[+] ${truncate(win, 90)}`, MARGIN + 8, yAI, { font: fonts.regular, size: 9.5, color: COLORS.green });
        yAI -= 14;
      });
      yAI -= 8;
    }

    // Code Example
    if (aiExplanation.codeExample && yAI > 120) {
      drawText(pAI, 'Configuration Example', MARGIN, yAI, { font: fonts.bold, size: 11, color: COLORS.primary });
      yAI -= 14;
      drawRect(pAI, MARGIN, yAI - 10, CONTENT_W, 10, COLORS.card);
      const codeLines = aiExplanation.codeExample.split('\n').slice(0, 8);
      codeLines.forEach(line => {
        if (yAI < 60) return;
        drawRect(pAI, MARGIN, yAI - 12, CONTENT_W, 14, COLORS.bg);
        drawText(pAI, truncate(line, 90), MARGIN + 8, yAI - 5, { font: fonts.mono, size: 8, color: COLORS.green });
        yAI -= 14;
      });
      yAI -= 8;
    }

    // Disclaimer
    if (aiExplanation.disclaimer) {
      drawDivider(pAI, yAI);
      yAI -= 14;
      drawText(pAI, aiExplanation.disclaimer, MARGIN, yAI, { font: fonts.oblique, size: 8, color: COLORS.gray });
    }
  }

  // Footer on all pages
  pdfDoc.getPages().forEach((page, idx) => {
    drawRect(page, 0, 0, PAGE_W, 24, COLORS.card);
    drawText(page, `CyberSage Security Report - Generated ${new Date().toLocaleDateString()}`,
      MARGIN, 8, { font: fonts.regular, size: 7, color: COLORS.gray });
    drawText(page, `Page ${idx + 1} of ${pdfDoc.getPageCount()}`,
      PAGE_W - MARGIN - 60, 8, { font: fonts.regular, size: 7, color: COLORS.gray });
  });

  // ── Serialize ─────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generatePDFReport };
