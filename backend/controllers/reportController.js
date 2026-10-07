/**
 * CyberSage - Report Controller
 *
 * Purpose:
 *   Generates and streams PDF security audit reports.
 *   Ownership enforced — users can only download their own scan reports.
 *
 * Controllers:
 *   downloadPDFReport  GET /api/report/:scanId/pdf  — Stream PDF file
 *   getReportMeta      GET /api/report/:scanId/meta — Report metadata
 */

const Scan                  = require('../models/Scan');
const { generatePDFReport } = require('../services/pdfReportService');
const { createError }       = require('../middlewares/errorHandler');
const logger                = require('../utils/logger');

// ========================================
// DOWNLOAD PDF REPORT
// ========================================

/**
 * @route   GET /api/report/:scanId/pdf
 * @access  Private
 * @desc    Generate and stream a PDF security audit report
 */
const downloadPDFReport = async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId     = req.user.id;

    // ── Fetch scan with ownership check ─────────────────────────
    const scan = await Scan.findOne({ _id: scanId, userId }).lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    if (scan.status !== 'completed') {
      return next(createError(400, `Cannot generate report for a scan with status: ${scan.status}`));
    }

    logger.info(`[Report] Generating PDF report for scan: ${scanId} (${scan.domain}) by user: ${req.user.email}`);

    // ── Convert headers Map → plain object for PDF generator ────
    const headersObj = scan.headers instanceof Map
      ? Object.fromEntries(scan.headers)
      : (scan.headers || {});

    const scanData = {
      ...scan,
      headers: headersObj
    };

    // ── Generate PDF ─────────────────────────────────────────────
    const pdfBytes = await generatePDFReport(scanData);

    // ── Build safe filename ──────────────────────────────────────
    const safeDomain   = (scan.domain || 'scan').replace(/[^a-z0-9.-]/gi, '_');
    const dateStr      = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename     = `CyberSage_Report_${safeDomain}_${dateStr}.pdf`;

    logger.info(`[Report] PDF generated: ${filename} (${pdfBytes.length} bytes)`);

    // ── Stream response ──────────────────────────────────────────
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length',      pdfBytes.length);
    res.setHeader('Cache-Control',       'no-store');

    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    logger.error(`[Report] PDF generation error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET REPORT METADATA
// ========================================

/**
 * @route   GET /api/report/:scanId/meta
 * @access  Private
 * @desc    Return lightweight metadata about a report (no PDF generation)
 */
const getReportMeta = async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId     = req.user.id;

    const scan = await Scan.findOne({ _id: scanId, userId })
      .select('url domain score grade status createdAt scanDuration findingsSummary aiExplanation')
      .lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    res.status(200).json({
      success: true,
      data: {
        scanId,
        url:            scan.url,
        domain:         scan.domain,
        score:          scan.score,
        grade:          scan.grade,
        status:         scan.status,
        scannedAt:      scan.createdAt,
        scanDuration:   scan.scanDuration,
        findingsSummary: scan.findingsSummary,
        hasAiExplanation: !!scan.aiExplanation?.summary,
        reportAvailable: scan.status === 'completed'
      }
    });

  } catch (error) {
    logger.error(`[Report] getReportMeta error: ${error.message}`);
    next(error);
  }
};

module.exports = { downloadPDFReport, getReportMeta };
