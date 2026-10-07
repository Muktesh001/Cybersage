/**
 * CyberSage - AI Prompt Builder
 *
 * Purpose:
 *   Constructs a structured, safe prompt from scan data for Gemini AI.
 *   Engineered to produce factual, non-hallucinated security explanations.
 *
 * Design Principles:
 *   1. Role assignment: Tell Gemini exactly who it is
 *   2. Structured input: Provide only factual scan data — no speculation
 *   3. Structured output: Demand JSON with specific keys
 *   4. Uncertainty guard: Instruct "Further manual verification recommended" if unsure
 *   5. Scope guard: Never suggest attacks, exploitation, or penetration testing
 *   6. Length cap: Prevent runaway responses
 *
 * Output prompt targets:
 *   Gemini 1.5 Flash (fast, cost-effective for structured analysis)
 */

/**
 * Build a severity summary string for the prompt
 */
const buildFindingsSummary = (findings) => {
  if (!findings || findings.length === 0) {
    return 'No security misconfigurations detected.';
  }

  const neg = findings.filter(f => !f.positive);
  if (neg.length === 0) return 'No security misconfigurations detected.';

  return neg.map((f, i) =>
    `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}\n   Category: ${f.category}\n   Evidence: ${f.evidence || 'Header/config missing'}`
  ).join('\n');
};

/**
 * Build a structured prompt for Gemini
 *
 * @param {object} scanData - Full scan result from DB
 * @returns {string} - The complete prompt string
 */
const buildExplanationPrompt = (scanData) => {
  const {
    url,
    domain,
    score,
    grade,
    findings = [],
    httpsInfo  = {},
    serverInfo = {},
    cookies    = []
  } = scanData;

  const negFindings   = findings.filter(f => !f.positive);
  const topFindings   = negFindings.slice(0, 10); // Cap at 10 to keep prompt manageable
  const findingsList  = buildFindingsSummary(topFindings);
  const cookieCount   = cookies.length;
  const insecureCookies = cookies.filter(c => c.issues && c.issues.length > 0).length;

  const prompt = `You are a senior cybersecurity engineer analyzing HTTP security configuration results.

Your task: Provide a clear, factual security explanation for the following website audit.

IMPORTANT RULES:
- Only analyze the data provided below — do not assume or invent information
- If you are uncertain about anything, say "Further manual verification recommended"
- Never suggest attacks, exploits, or penetration testing
- Keep explanations practical and developer-friendly
- Return ONLY valid JSON — no markdown, no code blocks, no extra text

SCAN DATA:
- Target: ${url}
- Domain: ${domain}
- Security Score: ${score}/100 (Grade: ${grade})
- HTTPS Enabled: ${httpsInfo.enabled ? 'Yes' : 'No'}
- HTTP to HTTPS Redirect: ${httpsInfo.redirectsToHttps ? 'Yes' : 'No'}
- HSTS Present: ${httpsInfo.hsts ? 'Yes' : 'No'}
- Server Header: ${serverInfo.serverHeader || 'Not disclosed'}
- Status Code: ${serverInfo.statusCode || 'Unknown'}
- Total Findings: ${negFindings.length}
- Cookies Detected: ${cookieCount} (${insecureCookies} with issues)

FINDINGS (top ${topFindings.length}):
${findingsList}

Return a JSON object with EXACTLY these keys:

{
  "summary": "2-3 sentence plain-English overview of the site's security posture. Be specific about the score and main issues.",
  "whyItMatters": "2-3 sentences explaining why these misconfigurations matter to real users and businesses.",
  "topRisks": ["Risk 1 (specific, based on findings above)", "Risk 2", "Risk 3"],
  "quickWins": ["Fix 1 (specific header/config to add, with exact value)", "Fix 2", "Fix 3"],
  "codeExample": "A single practical server configuration code snippet (Nginx, Apache, or Express.js) showing how to add the most critical missing security headers. Use plain text with line breaks.",
  "technicalDetails": "2-3 sentences of technical context about the most severe finding for developers.",
  "disclaimer": "One sentence confirming this is a passive configuration audit only."
}

Requirements:
- topRisks: exactly 3 items, each under 120 characters
- quickWins: exactly 3 items, each a specific actionable fix under 150 characters
- codeExample: under 500 characters, plain text (no markdown fences)
- All values must be strings or arrays of strings
- Return ONLY the JSON object, nothing else`;

  return prompt;
};

/**
 * Build a simpler prompt for re-explanation of a single finding
 *
 * @param {object} finding - Single finding object
 * @returns {string}
 */
const buildFindingExplanationPrompt = (finding) => {
  return `You are a cybersecurity expert. Explain this specific web security finding in simple terms for a developer.

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text.

FINDING:
- Rule: ${finding.ruleId}
- Title: ${finding.title}
- Severity: ${finding.severity}
- Category: ${finding.category}
- Evidence: ${finding.evidence || 'Not available'}
- Description: ${finding.description}

Return JSON with EXACTLY these keys:
{
  "simpleExplanation": "1-2 sentences explaining what this finding means in plain English",
  "impact": "1-2 sentences on the real-world impact if not fixed",
  "howToFix": "Step-by-step fix in under 200 characters",
  "codeSnippet": "Single line or short example showing the correct header/config value"
}

Return ONLY the JSON object.`;
};

module.exports = { buildExplanationPrompt, buildFindingExplanationPrompt };
