/**
 * CyberSage - Gemini AI Service
 *
 * Purpose:
 *   Calls the Google Gemini API to generate security explanations.
 *   Handles API errors, response parsing, validation, and fallbacks.
 *
 * Flow:
 *   buildPrompt(scanData) → Gemini API → parse JSON response →
 *   validate structure → return explanation | fallback
 *
 * Fallback behavior:
 *   If Gemini is unavailable, API key is missing, or response is malformed,
 *   returns a graceful fallback object so the UI never breaks.
 *
 * Anti-hallucination measures:
 *   - Temperature: 0.2 (factual, low creativity)
 *   - TopP: 0.8
 *   - MaxOutputTokens: 1024
 *   - Structured JSON output enforced via prompt
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config  = require('../config/config');
const logger  = require('../utils/logger');
const { buildExplanationPrompt, buildFindingExplanationPrompt } = require('./promptBuilder');

// ---- Initialize Gemini client ----
let genAI  = null;
let model  = null;

const initGemini = () => {
  if (!config.ai.geminiApiKey || config.ai.geminiApiKey === 'your_gemini_api_key_here') {
    logger.warn('[AI] Gemini API key not configured. AI features will return fallback responses.');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    model = genAI.getGenerativeModel({
      model: config.ai.geminiModel || 'gemini-1.5-flash',
      generationConfig: {
        temperature:      0.2,    // Low = more factual, less creative
        topP:             0.8,
        maxOutputTokens:  1024,   // Sufficient for structured JSON response
        responseMimeType: 'application/json'  // Request JSON output directly
      }
    });
    logger.info(`[AI] Gemini initialized with model: ${config.ai.geminiModel}`);
    return true;
  } catch (err) {
    logger.error(`[AI] Failed to initialize Gemini: ${err.message}`);
    return false;
  }
};

// Initialize on module load
const geminiReady = initGemini();

// ---- Fallback Response ----
const buildFallbackExplanation = (scanData) => {
  const neg   = (scanData.findings || []).filter(f => !f.positive);
  const score = scanData.score ?? 0;

  let summaryText;
  if (score >= 90)      summaryText = `${scanData.domain} has an excellent security configuration with a score of ${score}/100.`;
  else if (score >= 70) summaryText = `${scanData.domain} has a good security configuration (${score}/100) with some areas for improvement.`;
  else if (score >= 50) summaryText = `${scanData.domain} has a fair security configuration (${score}/100) with several misconfigurations to address.`;
  else                  summaryText = `${scanData.domain} has significant security misconfigurations with a score of ${score}/100. Immediate attention recommended.`;

  const topNeg  = neg.slice(0, 3);
  const topRisks = topNeg.length > 0
    ? topNeg.map(f => `${f.title} (${f.severity} severity)`)
    : ['No critical risks detected'];

  // Pad to 3
  while (topRisks.length < 3) topRisks.push('Review remaining findings for additional risks');

  const quickWins = neg.slice(0, 3).map(f => f.recommendation?.substring(0, 140) || f.title)
    .concat(['Review all findings for additional improvements']).slice(0, 3);

  return {
    summary:          summaryText,
    whyItMatters:     'Security misconfigurations can expose users to data theft, account hijacking, and privacy violations. Fixing these issues protects both users and the business.',
    topRisks,
    quickWins,
    codeExample:      neg.length > 0
      ? `# Add these security headers to your web server\nContent-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin`
      : 'Your security headers look good. Maintain current configuration.',
    technicalDetails: neg.length > 0
      ? `The most severe finding is "${neg[0]?.title}" which has a ${neg[0]?.severity} severity impact. ${neg[0]?.description || ''}`
      : 'No critical technical issues detected in this passive configuration audit.',
    disclaimer:       'This is a passive HTTP security configuration audit only — no active testing, exploitation, or penetration testing was performed.',
    generatedBy:      'fallback',
    generatedAt:      new Date().toISOString()
  };
};

// ---- Parse & Validate AI Response ----
const parseAiResponse = (rawText) => {
  try {
    // Clean up response — remove markdown fences if present despite instructions
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.replace(/^```\s*/i,     '').replace(/\s*```$/i, '');

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    const required = ['summary', 'whyItMatters', 'topRisks', 'quickWins', 'codeExample', 'technicalDetails', 'disclaimer'];
    for (const key of required) {
      if (!parsed[key]) {
        throw new Error(`Missing required field: ${key}`);
      }
    }

    // Validate arrays
    if (!Array.isArray(parsed.topRisks)  || parsed.topRisks.length  === 0) throw new Error('topRisks must be a non-empty array');
    if (!Array.isArray(parsed.quickWins) || parsed.quickWins.length === 0) throw new Error('quickWins must be a non-empty array');

    return { success: true, data: parsed };
  } catch (err) {
    logger.warn(`[AI] Failed to parse Gemini response: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ---- Generate Explanation ----
/**
 * Generate AI security explanation for a completed scan
 *
 * @param {object} scanData - Full scan result object
 * @returns {Promise<object>} - AI explanation object
 */
const generateExplanation = async (scanData) => {
  if (!geminiReady || !model) {
    logger.warn('[AI] Gemini not ready — returning fallback explanation');
    return { ...buildFallbackExplanation(scanData), generatedBy: 'fallback-no-api-key' };
  }

  try {
    const prompt   = buildExplanationPrompt(scanData);
    logger.info(`[AI] Generating explanation for: ${scanData.domain}`);

    const result   = await model.generateContent(prompt);
    const response = await result.response;
    const rawText  = response.text();

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = parseAiResponse(rawText);

    if (!parsed.success) {
      logger.warn(`[AI] Response parse failed: ${parsed.error} — using fallback`);
      return { ...buildFallbackExplanation(scanData), generatedBy: 'fallback-parse-error' };
    }

    logger.info(`[AI] Explanation generated successfully for: ${scanData.domain}`);

    return {
      ...parsed.data,
      generatedBy:  'gemini',
      generatedAt:  new Date().toISOString(),
      model:        config.ai.geminiModel
    };

  } catch (err) {
    // Handle specific Gemini API errors
    let errorMsg = err.message;

    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      logger.error('[AI] Invalid Gemini API key — check GEMINI_API_KEY in .env');
    } else if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('quota')) {
      logger.error('[AI] Gemini API quota exceeded');
    } else if (err.message?.includes('SAFETY')) {
      logger.warn('[AI] Gemini safety filter triggered — using fallback');
    } else {
      logger.error(`[AI] Gemini API error: ${errorMsg}`);
    }

    return { ...buildFallbackExplanation(scanData), generatedBy: 'fallback-api-error', apiError: errorMsg };
  }
};

/**
 * Generate explanation for a single finding
 *
 * @param {object} finding - Single finding object
 * @returns {Promise<object>}
 */
const generateFindingExplanation = async (finding) => {
  if (!geminiReady || !model) {
    return {
      simpleExplanation: finding.description,
      impact:            finding.risk,
      howToFix:          finding.recommendation,
      codeSnippet:       '',
      generatedBy:       'fallback-no-api-key'
    };
  }

  try {
    const prompt   = buildFindingExplanationPrompt(finding);
    const result   = await model.generateContent(prompt);
    const response = await result.response;
    const rawText  = response.text();

    const parsed = parseAiResponse(rawText);
    if (!parsed.success) throw new Error(parsed.error);

    return { ...parsed.data, generatedBy: 'gemini', generatedAt: new Date().toISOString() };

  } catch (err) {
    logger.error(`[AI] Finding explanation error: ${err.message}`);
    return {
      simpleExplanation: finding.description,
      impact:            finding.risk,
      howToFix:          finding.recommendation,
      codeSnippet:       '',
      generatedBy:       'fallback-error'
    };
  }
};

module.exports = { generateExplanation, generateFindingExplanation };
