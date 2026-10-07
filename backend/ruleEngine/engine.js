/**
 * CyberSage - Rule Engine
 *
 * Purpose:
 *   Executes all security rules against scan data and returns
 *   a structured array of findings with metadata.
 *
 * Flow:
 *   scanData → runRules() → [findings] → scoreCalculator
 *
 * Each finding:
 *   {
 *     ruleId:         string
 *     title:          string
 *     severity:       string
 *     category:       string
 *     description:    string
 *     risk:           string
 *     recommendation: string
 *     evidence:       string
 *     reference:      string
 *     scoreImpact:    number
 *     positive:       boolean  (true = good finding, no deduction)
 *   }
 */

const RULES  = require('./rules');
const logger = require('../utils/logger');

/**
 * Run all security rules against scan data
 *
 * @param {object} scanData - { headers, cookies, httpsInfo, serverInfo }
 * @returns {{ findings: Array, positives: Array, categories: object }}
 */
const runRules = (scanData) => {
  const findings  = [];
  const positives = [];

  for (const rule of RULES) {
    try {
      const result = rule.check(scanData);

      if (result !== null) {
        const finding = {
          ruleId:         rule.id,
          title:          rule.name,
          severity:       rule.severity,
          category:       rule.category,
          description:    rule.description,
          risk:           rule.risk,
          recommendation: rule.recommendation,
          evidence:       result.evidence || '',
          reference:      rule.reference,
          scoreImpact:    result.positive ? 0 : rule.scoreImpact,
          positive:       result.positive || false
        };

        if (result.positive) {
          positives.push(finding);
        } else {
          findings.push(finding);
        }
      }
    } catch (err) {
      logger.error(`[RuleEngine] Rule ${rule.id} threw an error: ${err.message}`);
      // Continue with other rules — one bad rule shouldn't stop the scan
    }
  }

  // Group findings by category for summary
  const categories = {};
  findings.forEach(f => {
    if (!categories[f.category]) {
      categories[f.category] = { count: 0, severities: {} };
    }
    categories[f.category].count++;
    categories[f.category].severities[f.severity] =
      (categories[f.category].severities[f.severity] || 0) + 1;
  });

  // Sort findings: critical → high → medium → low → info
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) =>
    (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5)
  );

  logger.info(`[RuleEngine] Rules executed: ${RULES.length}, Findings: ${findings.length}, Positives: ${positives.length}`);

  return { findings, positives, categories };
};

/**
 * Get summary counts by severity
 * @param {Array} findings
 */
const getSeveritySummary = (findings) => {
  return findings.reduce((acc, f) => {
    if (!f.positive) {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      acc.total       = (acc.total || 0) + 1;
    }
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 });
};

module.exports = { runRules, getSeveritySummary };
