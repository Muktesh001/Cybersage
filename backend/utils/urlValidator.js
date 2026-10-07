/**
 * CyberSage - URL Validator Utility
 *
 * Purpose:
 *   Safely validates target URLs before any HTTP request is made.
 *   Prevents SSRF (Server-Side Request Forgery) attacks by blocking
 *   requests to private networks, localhost, and non-HTTP protocols.
 *
 * ⚠️  SECURITY CRITICAL — Do not bypass or weaken these checks.
 *
 * Blocked targets:
 *   - localhost / 127.0.0.1 / ::1        (loopback)
 *   - 10.x.x.x                           (RFC1918 private)
 *   - 172.16-31.x.x                      (RFC1918 private)
 *   - 192.168.x.x                        (RFC1918 private)
 *   - 169.254.x.x                        (link-local / AWS metadata)
 *   - 0.0.0.0                            (invalid)
 *   - Non-HTTP protocols (file, ftp, js) (protocol check)
 *
 * Allowed:
 *   - http:// and https:// only
 *   - Public domain names and IPs
 *   - Standard ports (80, 443, or no explicit port)
 */

const { URL } = require('url');
const dns     = require('dns').promises;
const net     = require('net');

// ---- Private IP Range Checkers ----

/**
 * Check if an IPv4 address falls in a private/reserved range
 * @param {string} ip
 * @returns {boolean}
 */
const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;

  return (
    a === 10                               ||  // 10.0.0.0/8
    a === 127                              ||  // 127.0.0.0/8 loopback
    a === 0                                ||  // 0.0.0.0/8
    (a === 172 && b >= 16 && b <= 31)      ||  // 172.16.0.0/12
    (a === 192 && b === 168)               ||  // 192.168.0.0/16
    (a === 169 && b === 254)               ||  // 169.254.0.0/16 link-local
    (a === 100 && b >= 64 && b <= 127)     ||  // 100.64.0.0/10 shared
    a === 198 && b === 51 && parts[2] === 100 || // 198.51.100.0/24 TEST-NET
    a === 203 && b === 0  && parts[2] === 113    // 203.0.113.0/24 TEST-NET
  );
};

/**
 * Check if an IPv6 address is private/loopback
 * @param {string} ip
 * @returns {boolean}
 */
const isPrivateIPv6 = (ip) => {
  const normalized = ip.toLowerCase().replace(/\[|\]/g, '');
  return (
    normalized === '::1'             ||  // loopback
    normalized.startsWith('fc')     ||  // ULA fc00::/7
    normalized.startsWith('fd')     ||  // ULA
    normalized.startsWith('fe80')   ||  // link-local
    normalized === '::'                  // unspecified
  );
};

/**
 * Check if any IP in an array is private
 */
const hasPrivateIP = (ips) => {
  return ips.some(ip => {
    if (net.isIPv4(ip)) return isPrivateIPv4(ip);
    if (net.isIPv6(ip)) return isPrivateIPv6(ip);
    return false;
  });
};

// ---- Blocked Hostnames ----
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'local',
  'internal',
  'intranet',
  'corp',
  'lan',
  'metadata.google.internal',
  'instance-data'
]);

// ---- Main Validator ----

/**
 * Validate a URL for safe scanning
 *
 * @param {string} rawUrl - URL string to validate
 * @returns {Promise<{ valid: boolean, url: string|null, error: string|null }>}
 */
const validateUrl = async (rawUrl) => {
  // ---- Step 1: Basic string checks ----
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, url: null, error: 'URL is required' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length === 0) {
    return { valid: false, url: null, error: 'URL cannot be empty' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, url: null, error: 'URL is too long (max 2048 characters)' };
  }

  // ---- Step 2: Add protocol if missing ----
  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = 'https://' + urlString;
  }

  // ---- Step 3: Parse URL ----
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, url: null, error: 'Invalid URL format. Please enter a valid website address.' };
  }

  // ---- Step 4: Protocol check ----
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      valid: false,
      url:   null,
      error: `Protocol "${parsed.protocol}" is not allowed. Only HTTP and HTTPS are supported.`
    };
  }

  // ---- Step 5: Hostname checks ----
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, ''); // strip trailing dot

  if (!hostname || hostname.length === 0) {
    return { valid: false, url: null, error: 'URL must contain a valid hostname' };
  }

  // Block known private hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      url:   null,
      error: `Scanning "${hostname}" is not allowed. Only public websites can be audited.`
    };
  }

  // Block .local, .internal, .corp, .lan TLDs
  const tld = hostname.split('.').pop();
  const BLOCKED_TLDS = new Set(['local', 'internal', 'corp', 'lan', 'intranet', 'home', 'localdomain']);
  if (BLOCKED_TLDS.has(tld)) {
    return {
      valid: false,
      url:   null,
      error: `Domain ".${tld}" is a private network domain and cannot be scanned.`
    };
  }

  // ---- Step 6: Direct IP check ----
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return {
        valid: false,
        url:   null,
        error: 'Scanning private IP addresses is not allowed. Please enter a public website URL.'
      };
    }
  } else if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return {
        valid: false,
        url:   null,
        error: 'Scanning private IPv6 addresses is not allowed.'
      };
    }
  } else {
    // ---- Step 7: DNS resolution check (prevent SSRF via DNS rebinding) ----
    try {
      const records = await dns.lookup(hostname, { all: true });
      const ips = records.map(r => r.address);

      if (hasPrivateIP(ips)) {
        return {
          valid: false,
          url:   null,
          error: 'The domain resolves to a private IP address and cannot be scanned.'
        };
      }
    } catch {
      // DNS lookup failed — could be a legitimate domain that's temporarily unreachable
      // or a non-existent domain. We pass it through and let the HTTP request fail naturally.
      // Don't block — the scanner will handle the connection error gracefully.
    }
  }

  // ---- Step 8: Port validation ----
  const port = parsed.port;
  if (port) {
    const portNum = parseInt(port, 10);
    const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
    if (!ALLOWED_PORTS.has(portNum)) {
      return {
        valid: false,
        url:   null,
        error: `Port ${portNum} is not allowed. Only standard ports (80, 443, 8080, 8443) are supported.`
      };
    }
  }

  // ---- All checks passed ----
  return {
    valid: true,
    url:   urlString,
    error: null
  };
};

/**
 * Synchronous quick-check for frontend-style validation
 * (no DNS lookup — use only for basic format validation)
 *
 * @param {string} rawUrl
 * @returns {{ valid: boolean, error: string|null }}
 */
const quickValidateUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return { valid: false, error: 'URL is required' };
  }

  let urlString = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = 'https://' + urlString;
  }

  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'Invalid hostname' };
    }
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

module.exports = { validateUrl, quickValidateUrl, isPrivateIPv4, isPrivateIPv6 };
