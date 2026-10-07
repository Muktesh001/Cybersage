/**
 * CyberSage - Scanner Page
 * URL input, scan progress, and full results display.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdSearch, MdSecurity, MdRefresh, MdCheckCircle,
  MdError, MdExpandMore, MdExpandLess, MdShield,
  MdLock, MdWarning, MdInfo, MdOpenInNew, MdCookie,
  MdDns, MdHttp, MdCode
} from 'react-icons/md';
import useScan, { SCAN_STEPS } from '../../hooks/useScan';
import ScoreGauge from '../../components/dashboard/ScoreGauge';
import SeverityBadge from '../../components/common/SeverityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AIExplanationPanel from '../../components/dashboard/AIExplanationPanel';

export default function Scanner() {
  const [url, setUrl]           = useState('');
  const [urlError, setUrlError] = useState('');
  const { scan, isScanning, isComplete, isError,
          error, progress, currentStep, startScan, reset } = useScan();

  const validateUrl = (val) => {
    if (!val.trim()) return 'Please enter a URL';
    try {
      let u = val.trim();
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      new URL(u);
      return '';
    } catch { return 'Please enter a valid URL (e.g. https://example.com)'; }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setUrlError('');
    startScan(url.trim());
  };

  const handleReset = () => { reset(); setUrl(''); setUrlError(''); };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ScannerHeader />
      <UrlInputForm
        url={url} setUrl={setUrl} urlError={urlError} setUrlError={setUrlError}
        isScanning={isScanning} isComplete={isComplete}
        onSubmit={handleSubmit} onReset={handleReset}
      />
      {isScanning && <ScanProgress progress={progress} currentStep={currentStep} />}
      {isError    && <ScanError error={error} onRetry={handleReset} />}
      {isComplete && scan && <ScanResults scan={scan} />}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function ScannerHeader() {
  return (
    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <MdSecurity className="w-7 h-7 text-primary-400" />
        Security Scanner
      </h1>
      <p className="text-gray-400 text-sm mt-1">
        Passive, safe HTTP security configuration audit — no attacks, no probes.
      </p>
    </motion.div>
  );
}

// ── URL Input Form ─────────────────────────────────────────────────────────────
function UrlInputForm({ url, setUrl, urlError, setUrlError, isScanning, isComplete, onSubmit, onReset }) {
  return (
    <motion.div className="card" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="scan-url" className="block text-sm font-medium text-gray-300 mb-2">
          Target Website URL
        </label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MdHttp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
              id="scan-url" type="text" value={url}
              onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(''); }}
              placeholder="https://example.com"
              disabled={isScanning}
              className={`input pl-10 ${urlError ? 'border-red-600 focus:ring-red-500' : ''}`}
              aria-describedby={urlError ? 'url-error' : undefined}
            />
          </div>
          {isComplete ? (
            <button type="button" onClick={onReset} className="btn-secondary flex items-center gap-2 px-5 whitespace-nowrap">
              <MdRefresh className="w-4 h-4" /> New Scan
            </button>
          ) : (
            <button type="submit" disabled={isScanning} className="btn-primary flex items-center gap-2 px-6 whitespace-nowrap">
              {isScanning ? <LoadingSpinner size="sm" /> : <MdSearch className="w-4 h-4" />}
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
          )}
        </div>
        {urlError && <p id="url-error" className="mt-2 text-xs text-red-400">{urlError}</p>}
        <p className="mt-2 text-xs text-gray-600">
          Enter any publicly accessible website. We only perform passive, read-only HTTP requests.
        </p>
      </form>
    </motion.div>
  );
}

// ── Scan Progress ──────────────────────────────────────────────────────────────
function ScanProgress({ progress, currentStep }) {
  return (
    <motion.div className="card" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="flex items-center gap-3 mb-4">
        <LoadingSpinner size="sm" />
        <h3 className="text-white font-semibold">Analyzing Security Configuration</h3>
        <span className="ml-auto text-primary-400 font-mono text-sm">{progress}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-dark-800 rounded-full overflow-hidden mb-5">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration:0.4, ease:'easeOut' }}
        />
      </div>
      {/* Steps */}
      <div className="space-y-2">
        {SCAN_STEPS.slice(0, -1).map((step, idx) => {
          const done    = idx < currentStep;
          const active  = idx === currentStep;
          return (
            <div key={step.id} className={`flex items-center gap-3 text-sm transition-all ${
              active ? 'text-primary-400' : done ? 'text-green-400' : 'text-gray-700'
            }`}>
              {done   ? <MdCheckCircle className="w-4 h-4 flex-shrink-0" />
               : active ? <LoadingSpinner size="sm" className="w-4 h-4 flex-shrink-0" />
               : <div className="w-4 h-4 rounded-full border border-dark-600 flex-shrink-0" />}
              {step.label}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Scan Error ─────────────────────────────────────────────────────────────────
function ScanError({ error, onRetry }) {
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      className="card border border-red-800/50 bg-red-950/20">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-red-900/40 rounded-xl border border-red-800 flex-shrink-0">
          <MdError className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold mb-1">Scan Failed</h3>
          <p className="text-gray-300 text-sm">{error}</p>
        </div>
        <button onClick={onRetry} className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0">
          <MdRefresh className="w-4 h-4" /> Retry
        </button>
      </div>
    </motion.div>
  );
}

// ── Scan Results ───────────────────────────────────────────────────────────────
function ScanResults({ scan }) {
  const neg = (scan.findings || []).filter(f => !f.positive);
  const pos = (scan.findings || []).filter(f => f.positive);
  return (
    <motion.div className="space-y-5" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}>
      <ResultsHeader scan={scan} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ScorePanel scan={scan} pos={pos} />
        <div className="lg:col-span-2 space-y-5">
          <ScanInfoPanel scan={scan} />
          <HttpsPanel httpsInfo={scan.httpsInfo} />
        </div>
      </div>
      <FindingsPanel findings={neg} />
      {/* AI Explanation Panel */}
      <AIExplanationPanel scanId={scan.id} autoLoad={true} />
      {scan.cookies?.length > 0 && <CookiesPanel cookies={scan.cookies} />}
      <HeadersPanel headers={scan.headers || {}} />
    </motion.div>
  );
}

function ResultsHeader({ scan }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <MdCheckCircle className="w-5 h-5 text-green-400" />
          <h2 className="text-white font-bold text-lg">Scan Complete</h2>
        </div>
        <p className="text-gray-400 text-sm">{scan.url}</p>
      </div>
      <a href={scan.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors">
        Visit Site <MdOpenInNew className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function ScorePanel({ scan, pos }) {
  return (
    <div className="card flex flex-col items-center gap-4 py-6">
      <ScoreGauge score={scan.score} size={160} showLabel={true} />
      <div className="w-full space-y-2 pt-2 border-t border-dark-800">
        {['critical','high','medium','low','info'].map(sev => {
          const count = scan.findingsSummary?.[sev] || 0;
          if (!count) return null;
          return (
            <div key={sev} className="flex items-center justify-between">
              <SeverityBadge severity={sev} size="sm" />
              <span className="text-sm font-mono text-gray-300">{count}</span>
            </div>
          );
        })}
        {pos.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-green-400 flex items-center gap-1">
              <MdCheckCircle className="w-3.5 h-3.5" /> Passed
            </span>
            <span className="text-sm font-mono text-green-400">{pos.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ScanInfoPanel({ scan }) {
  const items = [
    { label:'Domain',        value: scan.domain },
    { label:'Status Code',   value: scan.serverInfo?.statusCode },
    { label:'Server',        value: scan.serverInfo?.serverHeader || 'Not disclosed' },
    { label:'Response Time', value: scan.serverInfo?.responseTime ? `${scan.serverInfo.responseTime}ms` : '–' },
    { label:'Scan Duration', value: scan.scanDuration ? `${scan.scanDuration}ms` : '–' },
    { label:'Redirects',     value: scan.serverInfo?.redirectCount ?? 0 },
  ];
  return (
    <div className="card">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <MdDns className="w-4 h-4 text-primary-400" /> Scan Information
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-gray-200 font-medium truncate">{value ?? '–'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HttpsPanel({ httpsInfo }) {
  if (!httpsInfo) return null;
  const checks = [
    { label:'HTTPS Enabled',           ok: httpsInfo.enabled },
    { label:'HTTP → HTTPS Redirect',   ok: httpsInfo.redirectsToHttps },
    { label:'HSTS Header Present',     ok: httpsInfo.hsts },
  ];
  return (
    <div className="card">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <MdLock className="w-4 h-4 text-primary-400" /> HTTPS Configuration
      </h3>
      <div className="space-y-2">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
              {ok ? <MdCheckCircle className="w-4 h-4" /> : <MdError className="w-4 h-4" />}
              {ok ? 'Yes' : 'No'}
            </span>
          </div>
        ))}
        {httpsInfo.hstsMaxAge && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">HSTS max-age</span>
            <span className="text-xs font-mono text-gray-300">{httpsInfo.hstsMaxAge}s</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Findings Panel ─────────────────────────────────────────────────────────────
function FindingsPanel({ findings }) {
  const [open, setOpen] = useState({});
  const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));

  if (!findings.length) {
    return (
      <div className="card border border-green-800/40 bg-green-950/20 flex items-center gap-3">
        <MdCheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
        <p className="text-green-400 font-medium">No security misconfigurations detected.</p>
      </div>
    );
  }
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
        <MdWarning className="w-5 h-5 text-yellow-400" />
        <h3 className="text-white font-semibold">Security Findings</h3>
        <span className="ml-auto badge bg-dark-700 border border-dark-600 text-gray-400 text-xs">{findings.length}</span>
      </div>
      <div className="divide-y divide-dark-800/60">
        {findings.map((f) => (
          <div key={f.ruleId}>
            <button
              onClick={() => toggle(f.ruleId)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-dark-800/40 transition-colors text-left"
            >
              <SeverityBadge severity={f.severity} size="sm" />
              <span className="flex-1 text-sm font-medium text-gray-200">{f.title}</span>
              <span className="text-xs text-gray-600 mr-2">{f.category}</span>
              {open[f.ruleId] ? <MdExpandLess className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              : <MdExpandMore className="w-4 h-4 text-gray-500 flex-shrink-0" />}
            </button>
            <AnimatePresence>
              {open[f.ruleId] && (
                <motion.div
                  initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                  exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-3 bg-dark-950/40">
                    {f.evidence && (
                      <div className="rounded-lg bg-dark-900 border border-dark-700 px-4 py-2.5 font-mono text-xs text-yellow-300 break-all">
                        {f.evidence}
                      </div>
                    )}
                    <InfoRow label="Description"    text={f.description} />
                    <InfoRow label="Risk"           text={f.risk} />
                    <InfoRow label="Recommendation" text={f.recommendation} highlight />
                    {f.reference && (
                      <a href={f.reference} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300">
                        <MdOpenInNew className="w-3.5 h-3.5" /> Reference
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, text, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'text-green-300' : 'text-gray-300'}`}>{text}</p>
    </div>
  );
}

// ── Cookies Panel ──────────────────────────────────────────────────────────────
function CookiesPanel({ cookies }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
        <MdCookie className="w-5 h-5 text-primary-400" />
        <h3 className="text-white font-semibold">Cookie Analysis</h3>
        <span className="ml-auto text-xs text-gray-500">{cookies.length} cookie{cookies.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-dark-800 bg-dark-950/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {['Name','Secure','HttpOnly','SameSite','Issues'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/50">
            {cookies.map((c, i) => (
              <tr key={i} className="hover:bg-dark-800/30">
                <td className="px-4 py-3 text-sm text-gray-200 font-mono">{c.name}</td>
                <td className="px-4 py-3">{Flag(c.secure)}</td>
                <td className="px-4 py-3">{Flag(c.httpOnly)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{c.sameSite || <span className="text-red-400">Missing</span>}</td>
                <td className="px-4 py-3 text-xs text-red-400">{c.issues?.join(', ') || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Flag = (val) => val
  ? <span className="text-green-400 flex items-center gap-1 text-xs"><MdCheckCircle className="w-3.5 h-3.5" />Yes</span>
  : <span className="text-red-400 flex items-center gap-1 text-xs"><MdError className="w-3.5 h-3.5" />No</span>;

// ── Headers Panel ──────────────────────────────────────────────────────────────
function HeadersPanel({ headers }) {
  const [expanded, setExpanded] = useState(false);
  const entries   = Object.entries(headers);
  const displayed = expanded ? entries : entries.slice(0, 8);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
        <MdCode className="w-5 h-5 text-primary-400" />
        <h3 className="text-white font-semibold">HTTP Response Headers</h3>
        <span className="ml-auto text-xs text-gray-500">{entries.length} headers</span>
      </div>
      <div className="divide-y divide-dark-800/30">
        {displayed.map(([key, val]) => (
          <div key={key} className="flex items-start gap-4 px-5 py-2.5 hover:bg-dark-800/20">
            <span className="text-xs font-mono text-primary-400 w-56 flex-shrink-0 truncate pt-0.5">{key}</span>
            <span className="text-xs font-mono text-gray-300 break-all">{String(val)}</span>
          </div>
        ))}
      </div>
      {entries.length > 8 && (
        <button onClick={() => setExpanded(p => !p)}
          className="w-full px-5 py-3 text-xs text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1.5 border-t border-dark-800 transition-colors">
          {expanded ? <><MdExpandLess className="w-4 h-4" />Show less</>
                    : <><MdExpandMore className="w-4 h-4" />Show {entries.length - 8} more headers</>}
        </button>
      )}
    </div>
  );
}
