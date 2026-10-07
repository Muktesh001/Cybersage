/**
 * CyberSage - Security Score Calculator
 *
 * Purpose:
 *   Computes a 0-100 security score from rule findings.
 *   Each finding deducts points based on its severity.
 *   Positive findings (e.g. HTTPS enabled) can add bonus points.
 *
 * Scoring Model:
 *   Base score: 100
 *
 *   Deductions per finding:
 *     critical  → deduct scoreImpact (max 20pts each)
 *     high      → deduct scoreImpact (max 15pts each)
 *     medium    → deduct scoreImpact (max 8pts each)
 *     low       → deduct scoreImpact (max 4pts each)
 *     info      → no deduction
 *
 *   Final score clamped between 0 and 100.
 *
 * Grade Thresholds:
 *   90-100 → A+  (Excellent)
 *   80-89  → A   (Good)
 *   70-79  → B   (Good)
 *   55-69  → C   (Fair)
 *   40-54  → D   (Poor)
 *   0-39   → F   (Critical)
 */

/**
 * Calculate security score from findings
 *
 * @param {Array} findings - Array of finding objects from rule engine
 * @returns {{
 *   score:     number,  — 0 to 100
 *   grade:     string,  — A+/A/B/C/D/F
 *   label:     string,  — Excellent/Good/Fair/Poor/Critical
 *   breakdown: object,  — Points deducted by category
 *   details:   object   — Severity counts + total deduction
 * }}
 */
const calculateScore = (findings) => {
  let score = 100;
  const breakdown = {};
  const deductionBySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  // Only deduct for non-positive findings
  const negativeFindings = findings.filter(f => !f.positive);

  for (const finding of negativeFindings) {
    const impact = finding.scoreImpact || 0;

    if (impact > 0) {
      score -= impact;
      deductionBySeverity[finding.severity] = (deductionBySeverity[finding.severity] || 0) + impact;

      // Track breakdown by category
      if (!breakdown[finding.category]) {
        breakdown[finding.category] = { deduction: 0, findings: 0 };
      }
      breakdown[finding.category].deduction += impact;
      breakdown[finding.category].findings++;
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Derive grade
  let grade, label;
  if      (score >= 90) { grade = 'A+'; label = 'Excellent'; }
  else if (score >= 80) { grade = 'A';  label = 'Good';      }
  else if (score >= 70) { grade = 'B';  label = 'Good';      }
  else if (score >= 55) { grade = 'C';  label = 'Fair';      }
  else if (score >= 40) { grade = 'D';  label = 'Poor';      }
  else                  { grade = 'F';  label = 'Critical';  }

  const totalDeduction = 100 - score;

  return {
    score,
    grade,
    label,
    breakdown,
    details: {
      deductionBySeverity,
      totalDeduction,
      negativeCount: negativeFindings.length
    }
  };
};

/**
 * Get score color name for frontend
 */
const getScoreColor = (score) => {
  if (score >= 90) return 'green';
  if (score >= 70) return 'blue';
  if (score >= 50) return 'yellow';
  if (score >= 30) return 'orange';
  return 'red';
};

module.exports = { calculateScore, getScoreColor };
