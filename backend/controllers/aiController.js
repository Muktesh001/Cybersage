/**
 * CyberSage - AI Controller
 *
 * Purpose:
 *   Handles AI explanation requests for scan results.
 *   Integrates Gemini AI service with scan data from MongoDB.
 *   Caches AI explanations in the scan document to avoid
 *   repeated API calls for the same scan.
 *
 * Controllers:
 *   explainScan      POST   /api/ai/explain/:scanId    — Generate full AI explanation
 *   getExplanation   GET    /api/ai/explain/:scanId    — Get cached AI explanation
 *   explainFinding   POST   /api/ai/finding/:scanId/:ruleId — Explain single finding
 *
 * Cache Strategy:
 *   AI explanation is stored in scan.aiExplanation.
 *   If already present, skip Gemini API call and return cached result.
 *   Use ?regenerate=true query param to force a fresh explanation.
 */

const Scan                   = require('../models/Scan');
const { generateExplanation, generateFindingExplanation } = require('../ai/geminiService');
const { createError }        = require('../middlewares/errorHandler');
const logger                 = require('../utils/logger');

// ========================================
// EXPLAIN SCAN — Generate Full AI Analysis
// ========================================

/**
 * @route   POST /api/ai/explain/:scanId
 * @access  Private
 * @desc    Generate (or return cached) AI explanation for a scan
 */
const explainScan = async (req, res, next) => {
  try {
    const { scanId }    = req.params;
    const userId        = req.user.id;
    const regenerate    = req.query.regenerate === 'true';

    // ── Fetch scan (ownership enforced) ─────────────────────────
    const scan = await Scan.findOne({ _id: scanId, userId }).lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    if (scan.status !== 'completed') {
      return next(createError(400, `Cannot generate AI explanation for a scan with status: ${scan.status}`));
    }

    // ── Return cached explanation if present (and not forced refresh) ──
    if (scan.aiExplanation?.summary && !regenerate) {
      logger.info(`[AI Controller] Returning cached explanation for scan: ${scanId}`);
      return res.status(200).json({
        success: true,
        message: 'AI explanation retrieved from cache',
        data: {
          explanation: scan.aiExplanation,
          cached:      true,
          scanId
        }
      });
    }

    // ── Prepare scan data for AI ─────────────────────────────────
    // Convert headers Map to plain object if needed
    const headersObj = scan.headers instanceof Map
      ? Object.fromEntries(scan.headers)
      : (scan.headers || {});

    const scanData = {
      url:        scan.url,
      domain:     scan.domain,
      score:      scan.score,
      grade:      scan.grade,
      findings:   scan.findings || [],
      httpsInfo:  scan.httpsInfo || {},
      serverInfo: scan.serverInfo || {},
      cookies:    scan.cookies || [],
      headers:    headersObj
    };

    logger.info(`[AI Controller] Generating AI explanation for scan: ${scanId} (${scan.domain})`);

    // ── Call Gemini AI ───────────────────────────────────────────
    const explanation = await generateExplanation(scanData);

    // ── Save to scan document ────────────────────────────────────
    const aiExplanationDoc = {
      summary:          explanation.summary          || '',
      whyItMatters:     explanation.whyItMatters     || '',
      topRisks:         explanation.topRisks         || [],
      quickWins:        explanation.quickWins        || [],
      codeExample:      explanation.codeExample      || '',
      technicalDetails: explanation.technicalDetails || '',
      disclaimer:       explanation.disclaimer       || '',
      generatedBy:      explanation.generatedBy      || 'unknown',
      generatedAt:      new Date()
    };

    await Scan.findByIdAndUpdate(scanId, {
      aiExplanation: aiExplanationDoc
    });

    logger.info(`[AI Controller] AI explanation saved for scan: ${scanId} (source: ${explanation.generatedBy})`);

    res.status(200).json({
      success: true,
      message: 'AI explanation generated successfully',
      data: {
        explanation: {
          ...aiExplanationDoc,
          model:     explanation.model || null,
          apiError:  explanation.apiError || null
        },
        cached: false,
        scanId
      }
    });

  } catch (error) {
    logger.error(`[AI Controller] explainScan error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET EXPLANATION — Return Cached
// ========================================

/**
 * @route   GET /api/ai/explain/:scanId
 * @access  Private
 * @desc    Return cached AI explanation without regenerating
 */
const getExplanation = async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId     = req.user.id;

    const scan = await Scan.findOne({ _id: scanId, userId })
      .select('aiExplanation status url domain score grade')
      .lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    if (!scan.aiExplanation?.summary) {
      return res.status(404).json({
        success: false,
        message: 'No AI explanation available for this scan. Use POST to generate one.',
        data:    null
      });
    }

    res.status(200).json({
      success: true,
      data: {
        explanation: scan.aiExplanation,
        cached:      true,
        scanId,
        scan: {
          url:    scan.url,
          domain: scan.domain,
          score:  scan.score,
          grade:  scan.grade
        }
      }
    });

  } catch (error) {
    logger.error(`[AI Controller] getExplanation error: ${error.message}`);
    next(error);
  }
};

// ========================================
// EXPLAIN FINDING — Single Finding Detail
// ========================================

/**
 * @route   POST /api/ai/finding/:scanId/:ruleId
 * @access  Private
 * @desc    Generate AI explanation for a single finding
 *          Result is NOT cached — call on demand only
 */
const explainFinding = async (req, res, next) => {
  try {
    const { scanId, ruleId } = req.params;
    const userId             = req.user.id;

    // Fetch the scan
    const scan = await Scan.findOne({ _id: scanId, userId })
      .select('findings url domain status')
      .lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    if (scan.status !== 'completed') {
      return next(createError(400, 'Scan must be completed to explain findings'));
    }

    // Find the specific finding
    const finding = scan.findings?.find(f => f.ruleId === ruleId);

    if (!finding) {
      return next(createError(404, `Finding with rule ID "${ruleId}" not found in this scan`));
    }

    logger.info(`[AI Controller] Generating finding explanation: ${ruleId} for scan: ${scanId}`);

    const explanation = await generateFindingExplanation(finding);

    res.status(200).json({
      success: true,
      data: {
        finding: {
          ruleId:   finding.ruleId,
          title:    finding.title,
          severity: finding.severity,
          category: finding.category
        },
        explanation,
        scanId
      }
    });

  } catch (error) {
    logger.error(`[AI Controller] explainFinding error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  explainScan,
  getExplanation,
  explainFinding
};
