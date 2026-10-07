/**
 * CyberSage - Scan Controller
 *
 * Purpose:
 *   Orchestrates the complete security audit pipeline.
 *   Connects URL validation → HTTP scanner → rule engine →
 *   score calculator → database persistence → response.
 *
 * Controllers:
 *   startScan       POST /api/scan          — Run a new security audit
 *   getScanById     GET  /api/scan/:id      — Fetch a single scan result
 *   getScanHistory  GET  /api/scan/history  — Paginated scan history
 *   deleteScan      DELETE /api/scan/:id    — Delete a scan record
 *   getHeadersOnly  GET  /api/scan/:id/headers — Raw headers for a scan
 *
 * Scan Pipeline:
 *   1. Validate URL (SSRF-safe check)
 *   2. Create Scan document (status: pending)
 *   3. HTTP GET → collect headers/cookies/HTTPS
 *   4. Run 24 security rules
 *   5. Calculate score (0-100)
 *   6. Update Scan document (status: completed)
 *   7. Return full result
 */

const { URL }             = require('url');
const Scan                = require('../models/Scan');
const { validateUrl }     = require('../utils/urlValidator');
const { scanUrl }         = require('../scanner/httpScanner');
const { runRules, getSeveritySummary } = require('../ruleEngine/engine');
const { calculateScore, getScoreColor } = require('../ruleEngine/scoreCalculator');
const { createError }     = require('../middlewares/errorHandler');
const logger              = require('../utils/logger');

// ========================================
// START SCAN
// ========================================

/**
 * @route   POST /api/scan
 * @access  Private
 * @desc    Validate URL, run passive HTTP scan, analyze results, save to DB
 */
const startScan = async (req, res, next) => {
  const scanStartTime = Date.now();
  let scanDoc         = null;

  try {
    const { url: rawUrl } = req.body;
    const userId          = req.user.id;

    // ── Step 1: URL Validation ──────────────────
    const validation = await validateUrl(rawUrl);
    if (!validation.valid) {
      return next(createError(400, validation.error));
    }

    const targetUrl = validation.url;
    let domain;
    try {
      domain = new URL(targetUrl).hostname;
    } catch {
      domain = targetUrl;
    }

    logger.info(`[ScanController] Starting scan for: ${targetUrl} (user: ${req.user.email})`);

    // ── Step 2: Create pending scan record ──────
    scanDoc = await Scan.create({
      userId,
      url:    targetUrl,
      domain,
      status: 'running'
    });

    // ── Step 3: HTTP Scan ────────────────────────
    const httpResult = await scanUrl(targetUrl);

    if (!httpResult.success) {
      // Scan failed to connect — mark as failed and return error
      await Scan.findByIdAndUpdate(scanDoc._id, {
        status: 'failed',
        error:  httpResult.error,
        scanDuration: Date.now() - scanStartTime
      });

      return res.status(422).json({
        success: false,
        message: httpResult.error,
        scanId:  scanDoc._id
      });
    }

    const { headers, cookies, httpsInfo, serverInfo } = httpResult.data;

    // ── Step 4: Run Rule Engine ──────────────────
    const { findings, positives, categories } = runRules({
      headers,
      cookies,
      httpsInfo,
      serverInfo
    });

    // ── Step 5: Calculate Score ──────────────────
    const allFindings          = [...findings, ...positives];
    const scoreResult          = calculateScore(allFindings);
    const findingsSummary      = getSeveritySummary(findings);
    const scanDuration         = Date.now() - scanStartTime;

    // ── Step 6: Update scan document ────────────
    const headersMap = new Map(Object.entries(headers));

    const updatedScan = await Scan.findByIdAndUpdate(
      scanDoc._id,
      {
        status:       'completed',
        score:        scoreResult.score,
        grade:        scoreResult.grade,
        findings:     allFindings,
        findingsSummary,
        headers:      headersMap,
        cookies,
        httpsInfo: {
          enabled:          httpsInfo.enabled,
          redirectsToHttps: httpsInfo.redirectsToHttps,
          hsts:             !!headers['strict-transport-security'],
          hstsMaxAge:       (() => {
            const hsts  = headers['strict-transport-security'] || '';
            const match = hsts.match(/max-age=(\d+)/i);
            return match ? parseInt(match[1], 10) : null;
          })()
        },
        serverInfo: {
          statusCode:    serverInfo.statusCode,
          serverHeader:  serverInfo.server,
          redirectCount: serverInfo.redirectCount,
          finalUrl:      serverInfo.finalUrl,
          responseTime:  serverInfo.responseTime
        },
        scanDuration,
        error: null
      },
      { new: true }
    );

    logger.info(`[ScanController] Scan completed: ${targetUrl} score=${scoreResult.score} findings=${findings.length} (${scanDuration}ms)`);

    // ── Step 7: Return response ──────────────────
    res.status(200).json({
      success: true,
      message: 'Security audit completed successfully',
      data: {
        scan: {
          id:           updatedScan._id,
          url:          updatedScan.url,
          domain:       updatedScan.domain,
          status:       updatedScan.status,
          score:        scoreResult.score,
          grade:        scoreResult.grade,
          scoreLabel:   scoreResult.label,
          scoreColor:   getScoreColor(scoreResult.score),
          scannedAt:    updatedScan.createdAt,
          scanDuration,
          findings:     allFindings,
          findingsSummary,
          positives,
          categories,
          scoreBreakdown: scoreResult.breakdown,
          httpsInfo:    updatedScan.httpsInfo,
          serverInfo:   updatedScan.serverInfo,
          cookies,
          headers:      Object.fromEntries(headersMap)
        }
      }
    });

  } catch (error) {
    // Mark scan as failed if document was created
    if (scanDoc?._id) {
      await Scan.findByIdAndUpdate(scanDoc._id, {
        status: 'failed',
        error:  error.message,
        scanDuration: Date.now() - scanStartTime
      }).catch(() => {});
    }

    logger.error(`[ScanController] Scan error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET SCAN BY ID
// ========================================

/**
 * @route   GET /api/scan/:id
 * @access  Private
 * @desc    Retrieve a single completed scan result
 */
const getScanById = async (req, res, next) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.id;

    const scan = await Scan.findOne({ _id: id, userId }).lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    // Convert headers Map to plain object for JSON response
    const headersObj = scan.headers instanceof Map
      ? Object.fromEntries(scan.headers)
      : (scan.headers || {});

    res.status(200).json({
      success: true,
      data: {
        scan: {
          ...scan,
          headers: headersObj
        }
      }
    });

  } catch (error) {
    logger.error(`[ScanController] getScanById error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET SCAN HISTORY
// ========================================

/**
 * @route   GET /api/scan/history
 * @access  Private
 * @desc    Paginated list of user's scans with filtering
 */
const getScanHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Pagination
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit || '10', 10));
    const skip  = (page - 1) * limit;

    // Filtering
    const filter = { userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.domain) filter.domain = { $regex: req.query.domain, $options: 'i' };

    // Search by URL
    if (req.query.search) {
      filter.$or = [
        { url:    { $regex: req.query.search, $options: 'i' } },
        { domain: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Sorting
    const sortField = req.query.sortBy  || 'createdAt';
    const sortOrder = req.query.sortDir === 'asc' ? 1 : -1;
    const sort      = { [sortField]: sortOrder };

    const [scans, total] = await Promise.all([
      Scan.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-findings -headers -cookies -aiExplanation')
        .lean(),
      Scan.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        scans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext:    page < Math.ceil(total / limit),
          hasPrev:    page > 1
        }
      }
    });

  } catch (error) {
    logger.error(`[ScanController] getScanHistory error: ${error.message}`);
    next(error);
  }
};

// ========================================
// DELETE SCAN
// ========================================

/**
 * @route   DELETE /api/scan/:id
 * @access  Private
 * @desc    Delete a scan record (user can only delete their own)
 */
const deleteScan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const scan = await Scan.findOneAndDelete({ _id: id, userId });

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    logger.info(`[ScanController] Scan deleted: ${id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Scan deleted successfully'
    });

  } catch (error) {
    logger.error(`[ScanController] deleteScan error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET HEADERS ONLY
// ========================================

/**
 * @route   GET /api/scan/:id/headers
 * @access  Private
 * @desc    Return raw headers for a specific scan
 */
const getScanHeaders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const scan = await Scan.findOne({ _id: id, userId })
      .select('url domain headers serverInfo createdAt')
      .lean();

    if (!scan) {
      return next(createError(404, 'Scan not found or access denied'));
    }

    const headersObj = scan.headers instanceof Map
      ? Object.fromEntries(scan.headers)
      : (scan.headers || {});

    res.status(200).json({
      success: true,
      data: {
        url:        scan.url,
        domain:     scan.domain,
        scannedAt:  scan.createdAt,
        serverInfo: scan.serverInfo,
        headers:    headersObj,
        headerCount: Object.keys(headersObj).length
      }
    });

  } catch (error) {
    logger.error(`[ScanController] getScanHeaders error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  startScan,
  getScanById,
  getScanHistory,
  deleteScan,
  getScanHeaders
};
