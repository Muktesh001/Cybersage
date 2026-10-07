/**
 * CyberSage - Scan Model
 *
 * Purpose:
 *   Stores the complete result of a single website security audit.
 *   Referenced by Dashboard, Scanner, History, and Report modules.
 *
 * Schema Overview:
 *   - userId:       Reference to the User who ran the scan
 *   - url:          Target URL that was scanned
 *   - domain:       Extracted domain name
 *   - status:       pending | running | completed | failed
 *   - score:        Overall security score (0-100)
 *   - grade:        Letter grade derived from score
 *   - findings:     Array of security misconfigurations found
 *   - headers:      Raw HTTP response headers collected
 *   - cookies:      Cookie security analysis results
 *   - httpsInfo:    HTTPS/TLS configuration details
 *   - serverInfo:   Server header, status code, redirect info
 *   - aiExplanation: AI-generated explanation (stored after Module 4)
 *   - scanDuration: Time taken for scan in ms
 *   - error:        Error message if scan failed
 */

const mongoose = require('mongoose');

// ---- Finding Sub-schema ----
// Each security misconfiguration detected is stored as a Finding
const findingSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    required: true
  },
  category: {
    type: String,
    trim: true,
    default: 'general'
  },
  description: {
    type: String,
    trim: true
  },
  risk: {
    type: String,
    trim: true
  },
  recommendation: {
    type: String,
    trim: true
  },
  evidence: {
    type: String,  // The actual header value or missing header name
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  scoreImpact: {
    type: Number,
    default: 0
  }
}, { _id: false });

// ---- Cookie Analysis Sub-schema ----
const cookieAnalysisSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  secure: { type: Boolean, default: false },
  httpOnly: { type: Boolean, default: false },
  sameSite: { type: String, trim: true, default: null },
  issues: [{ type: String }]
}, { _id: false });

// ---- HTTPS Info Sub-schema ----
const httpsInfoSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  redirectsToHttps: { type: Boolean, default: false },
  tlsVersion: { type: String, default: null },
  validCertificate: { type: Boolean, default: null },
  hsts: { type: Boolean, default: false },
  hstsMaxAge: { type: Number, default: null }
}, { _id: false });

// ---- Server Info Sub-schema ----
const serverInfoSchema = new mongoose.Schema({
  statusCode: { type: Number, default: null },
  serverHeader: { type: String, default: null },
  redirectCount: { type: Number, default: 0 },
  finalUrl: { type: String, default: null },
  responseTime: { type: Number, default: null }
}, { _id: false });

// ---- AI Explanation Sub-schema ----
const aiExplanationSchema = new mongoose.Schema({
  summary: { type: String, default: null },
  whyItMatters: { type: String, default: null },
  topRisks: [{ type: String }],
  quickWins: [{ type: String }],
  generatedAt: { type: Date, default: null }
}, { _id: false });

// ========================================
// MAIN SCAN SCHEMA
// ========================================

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    url: {
      type: String,
      required: [true, 'Target URL is required'],
      trim: true,
      maxlength: [2048, 'URL is too long']
    },

    domain: {
      type: String,
      trim: true,
      index: true
    },

    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },

    grade: {
      type: String,
      enum: ['A+', 'A', 'B', 'C', 'D', 'F', null],
      default: null
    },

    findings: {
      type: [findingSchema],
      default: []
    },

    // Summary counts for quick dashboard queries
    findingsSummary: {
      critical: { type: Number, default: 0 },
      high:     { type: Number, default: 0 },
      medium:   { type: Number, default: 0 },
      low:      { type: Number, default: 0 },
      info:     { type: Number, default: 0 },
      total:    { type: Number, default: 0 }
    },

    // Raw headers from HTTP response
    headers: {
      type: Map,
      of: String,
      default: {}
    },

    cookies: {
      type: [cookieAnalysisSchema],
      default: []
    },

    httpsInfo: {
      type: httpsInfoSchema,
      default: () => ({})
    },

    serverInfo: {
      type: serverInfoSchema,
      default: () => ({})
    },

    aiExplanation: {
      type: aiExplanationSchema,
      default: null
    },

    scanDuration: {
      type: Number,  // milliseconds
      default: null
    },

    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true, // createdAt = scan start time, updatedAt = last updated
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ========================================
// INDEXES
// ========================================

scanSchema.index({ userId: 1, createdAt: -1 }); // Most common query pattern
scanSchema.index({ userId: 1, status: 1 });
scanSchema.index({ createdAt: -1 });

// ========================================
// VIRTUALS
// ========================================

/**
 * Derive letter grade from numeric score
 */
scanSchema.virtual('computedGrade').get(function () {
  if (this.score === null) return null;
  if (this.score >= 90) return 'A+';
  if (this.score >= 80) return 'A';
  if (this.score >= 70) return 'B';
  if (this.score >= 55) return 'C';
  if (this.score >= 40) return 'D';
  return 'F';
});

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================

/**
 * Auto-compute findingsSummary and grade before saving
 */
scanSchema.pre('save', function (next) {
  if (this.isModified('findings')) {
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
    this.findings.forEach(f => {
      if (summary[f.severity] !== undefined) summary[f.severity]++;
      summary.total++;
    });
    this.findingsSummary = summary;
  }

  if (this.isModified('score') && this.score !== null) {
    if (this.score >= 90)      this.grade = 'A+';
    else if (this.score >= 80) this.grade = 'A';
    else if (this.score >= 70) this.grade = 'B';
    else if (this.score >= 55) this.grade = 'C';
    else if (this.score >= 40) this.grade = 'D';
    else                        this.grade = 'F';
  }

  next();
});

// ========================================
// STATIC METHODS
// ========================================

/**
 * Get dashboard stats for a specific user
 * @param {string} userId
 * @returns {Promise<Object>}
 */
scanSchema.statics.getDashboardStats = async function (userId) {
  const objectId   = new mongoose.Types.ObjectId(userId);
  const userFilter = { userId: objectId, status: 'completed' };

  const [
    totalScans,
    avgScoreResult,
    severityCounts,
    recentScans,
    trendData
  ] = await Promise.all([
    // Total completed scans
    this.countDocuments(userFilter),

    // Average score
    this.aggregate([
      { $match: userFilter },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]),

    // Total findings by severity
    this.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: null,
          critical: { $sum: '$findingsSummary.critical' },
          high:     { $sum: '$findingsSummary.high' },
          medium:   { $sum: '$findingsSummary.medium' },
          low:      { $sum: '$findingsSummary.low' },
          info:     { $sum: '$findingsSummary.info' }
        }
      }
    ]),

    // 5 most recent scans
    this.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('url domain score grade status findingsSummary createdAt scanDuration')
      .lean(),

    // Last 7 days trend (one score per day)
    this.aggregate([
      {
        $match: {
          ...userFilter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          avgScore: { $avg: '$score' },
          count:    { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  return {
    totalScans,
    averageScore: avgScoreResult[0]?.avgScore
      ? Math.round(avgScoreResult[0].avgScore)
      : null,
    severityCounts: severityCounts[0] || { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    recentScans,
    trendData
  };
};

/**
 * Get global admin stats (all users)
 */
scanSchema.statics.getAdminStats = async function () {
  const [totalScans, statusBreakdown, topScanned] = await Promise.all([
    this.countDocuments(),
    this.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$domain', count: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  return { totalScans, statusBreakdown, topScanned };
};

// ========================================
// EXPORT
// ========================================

const Scan = mongoose.model('Scan', scanSchema);
module.exports = Scan;
