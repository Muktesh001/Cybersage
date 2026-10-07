
/**
 * CyberSage - HTTP Scanner Service
 *
 * Purpose:
 *   Performs a single passive, safe HTTP GET request to a target URL.
 *   Collects all security-relevant response data without any intrusive
 *   testing, fuzzing, or exploitation.
 *
 * ⚠️  PASSIVE ONLY — This module NEVER:
 *     - Sends POST/PUT/DELETE requests
 *     - Injects payloads or probes
 *     - Performs brute force or fuzzing
 *     - Exploits any vulnerabilities
 *
 * Collects:
 *   - HTTP response headers (all, normalized)
 *   - Cookies (parsed from Set-Cookie header)
 *   - HTTPS enabled + HTTP→HTTPS redirect check
 *   - Final URL after redirects + redirect chain
 *   - Status code + server header
 *   - Response time in milliseconds
 *
 * Returns: { success, data, error }
 */

const axios  = require('axios');
const https  = require('https');
const { URL } = require('url');
const config = require('../config/config');
const logger = require('../utils/logger');

// ---- Cookie Parser ----
/**
 * Parse raw Set-Cookie header strings into structured objects
 * @param {string[]} rawCookies
 * @returns {Array}
 */
const parseCookies = (rawCookies) => {
  if (!rawCookies || rawCookies.length === 0) return [];

  const parsed = [];

  for (const raw of rawCookies) {
    const parts  = raw.split(';').map(p => p.trim());
    const [name] = parts[0].split('=');

    const cookie = {
      name:     name?.trim() || 'unknown',
      raw,
      secure:   false,
      httpOnly: false,
      sameSite: null,
      issues:   []
    };

    for (const part of parts.slice(1)) {
      const lower = part.toLowerCase();
      if (lower === 'secure')              cookie.secure   = true;
      if (lower === 'httponly')            cookie.httpOnly = true;
      if (lower.startsWith('samesite=')) {
        cookie.sameSite = part.split('=')[1]?.trim() || null;
      }
    }

    // Identify cookie security issues
    if (!cookie.secure)   cookie.issues.push('Missing Secure flag');
    if (!cookie.httpOnly) cookie.issues.push('Missing HttpOnly flag');
    if (!cookie.sameSite) {
      cookie.issues.push('Missing SameSite attribute');
    } else if (cookie.sameSite.toLowerCase() === 'none' && !cookie.secure) {
      cookie.issues.push('SameSite=None requires Secure flag');
    }

    parsed.push(cookie);
  }

  return parsed;
};

// ---- Redirect Tracker ----
/**
 * Build redirect chain using axios interceptors
 * We track each redirect manually
 */
const buildRedirectChain = (initialUrl, finalUrl, redirectCount) => {
  const chain = [];
  if (redirectCount > 0) {
    chain.push({ from: initialUrl, to: finalUrl, count: redirectCount });
  }
  return chain;
};

// ---- HTTPS Checker ----
/**
 * Check if an HTTP URL redirects to HTTPS
 * @param {string} httpUrl - URL starting with http://
 * @returns {Promise<boolean>}
 */
const checkHttpToHttpsRedirect = async (httpUrl, timeout) => {
  try {
    const response = await axios.get(httpUrl, {
      maxRedirects:   0,
      timeout:        timeout / 2,
      validateStatus: (s) => s >= 300 && s < 400,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const location = response.headers?.location || '';
    return location.toLowerCase().startsWith('https://');
  } catch (err) {
    // If redirect throws with a location, check it
    if (err.response?.headers?.location) {
      return err.response.headers.location.toLowerCase().startsWith('https://');
    }
    return false;
  }
};

// ---- Main Scanner Function ----
/**
 * Perform a passive HTTP scan on a target URL
 *
 * @param {string} targetUrl - Validated URL to scan
 * @returns {Promise<ScanResult>}
 *
 * ScanResult: {
 *   success:      boolean,
 *   data: {
 *     finalUrl:         string,
 *     statusCode:       number,
 *     responseTime:     number,   // ms
 *     headers:          object,   // all headers, lowercase keys
 *     rawHeaders:       object,   // original casing preserved
 *     cookies:          array,    // parsed cookie objects
 *     httpsInfo: {
 *       enabled:          boolean,
 *       redirectsToHttps: boolean,
 *       originalUrl:      string
 *     },
 *     serverInfo: {
 *       server:         string|null,
 *       poweredBy:      string|null,
 *       statusCode:     number,
 *       finalUrl:       string,
 *       redirectCount:  number,
 *       redirectChain:  array,
 *       responseTime:   number
 *     }
 *   },
 *   error: string|null
 * }
 */
const scanUrl = async (targetUrl) => {
  const startTime = Date.now();
  const timeout   = config.scanner.timeout || 10000;
  const parsed    = new URL(targetUrl);
  const isHttps   = parsed.protocol === 'https:';

  logger.info(`[Scanner] Starting scan: ${targetUrl}`);

  let redirectCount = 0;
  const redirectChain = [];

  // Custom axios instance for scanning
  const scanAgent = axios.create({
    timeout,
    maxRedirects: config.scanner.maxRedirects || 5,
    validateStatus: () => true, // Accept all HTTP status codes
    httpsAgent: new https.Agent({
      rejectUnauthorized: false // Allow self-signed certs — we report on this
    }),
    headers: {
      'User-Agent': 'CyberSage-SecurityAuditor/1.0 (Passive Security Configuration Audit)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'close',
      'DNT': '1'
    },
    // Track redirects
    beforeRedirect: (options, responseDetails) => {
      redirectCount++;
      redirectChain.push({
        from:       responseDetails.responseUrl || targetUrl,
        to:         options.href,
        statusCode: responseDetails.statusCode
      });
    }
  });

  try {
    const response = await scanAgent.get(targetUrl);
    const responseTime = Date.now() - startTime;

    // ---- Normalize headers to lowercase keys ----
    const rawHeaders = response.headers || {};
    const headers    = {};
    for (const [key, value] of Object.entries(rawHeaders)) {
      headers[key.toLowerCase()] = value;
    }

    // ---- Extract Set-Cookie headers ----
    // axios combines multiple set-cookie headers into array
    let rawCookies = [];
    if (headers['set-cookie']) {
      rawCookies = Array.isArray(headers['set-cookie'])
        ? headers['set-cookie']
        : [headers['set-cookie']];
    }
    const cookies = parseCookies(rawCookies);

    // ---- HTTPS Info ----
    let redirectsToHttps = false;
    if (!isHttps) {
      // Check if HTTP version redirects to HTTPS
      redirectsToHttps = await checkHttpToHttpsRedirect(targetUrl, timeout);
    } else {
      // If we reached here via HTTPS, it works
      redirectsToHttps = true;
    }

    const httpsInfo = {
      enabled:          isHttps,
      redirectsToHttps,
      originalUrl:      targetUrl
    };

    // ---- Server Info ----
    const serverInfo = {
      server:        headers['server'] || null,
      poweredBy:     headers['x-powered-by'] || null,
      statusCode:    response.status,
      finalUrl:      response.request?.res?.responseUrl || targetUrl,
      redirectCount,
      redirectChain,
      responseTime
    };

    logger.info(`[Scanner] Scan completed: ${targetUrl} (${response.status}, ${responseTime}ms)`);

    return {
      success: true,
      data: {
        finalUrl:     serverInfo.finalUrl,
        statusCode:   response.status,
        responseTime,
        headers,
        rawHeaders,
        cookies,
        httpsInfo,
        serverInfo
      },
      error: null
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The website may be offline or blocking requests.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Domain not found. Please check the URL and try again.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = `Connection timed out after ${timeout / 1000} seconds. The website may be too slow or unreachable.`;
    } else if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      errorMessage = 'SSL certificate hostname mismatch detected.';
    } else if (error.message?.includes('maxRedirects')) {
      errorMessage = 'Too many redirects. The website appears to be in a redirect loop.';
    } else {
      errorMessage = `Failed to connect: ${error.message}`;
    }

    logger.error(`[Scanner] Scan failed: ${targetUrl} — ${errorMessage}`);

    return {
      success:  false,
      data:     null,
      error:    errorMessage,
      duration: responseTime
    };
  }
};

module.exports = { scanUrl, parseCookies };
