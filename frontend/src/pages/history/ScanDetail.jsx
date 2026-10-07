/**
 * CyberSage - Scan Detail Page
 *
 * Full single scan result view loaded from history.
 * Reuses Scanner result components + adds PDF download button.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MdArrowBack, MdDownload, MdRefresh, MdWarning,
  MdCheckCircle, MdError, MdOpenInNew, MdShield,
  MdLock, MdDns, MdCode, MdExpandMore, MdExpandLess,
  MdCookie, MdHttp
} from 'react-icons/md';
import scanService   from '../../services/scanService';
import reportService from '../../services/reportService';
import ScoreGauge    from '../../components/dashboard/ScoreGauge';
import AIExplanationPanel from '../../components/dashboard/AIExplanationPanel';
import SeverityBadge from '../../components/common/SeverityBadge';
import ScoreBar      from '../../components/common/ScoreBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, extractDomain, truncateUrl } from '../../utils/helpers';

// ── Reusable sub-components (shared with Scanner page) ─────────────────────

function InfoRow({ label, text, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'text-green-300' : 'text-gray-300'}`}>{text}</p>
    </div>
  );
}

function Flag(val) {
  return val
    ? <span className="text-green-400 flex items-center gap-1 text-xs"><MdCheckCircle className="w-3.5 h-3.5" />Yes</span>
    : <span className="text-red-400 flex items-center gap-1 text-xs"><MdError className="w-3.5 h-3.5" />No</span>;
}

function GradeBadge({ grade }) {
  const config = { 'A+':'text-green-300 bg-green-950/50 border-green-700/50','A':'text-green-400 bg-green-950/50 border-green-700/50','B':'text-blue-300 bg-blue-950/50 border-blue-700/50','C':'text-yellow-300 bg-yellow-950/50 border-yellow-700/50','D':'text-orange-300 bg-orange-950/50 border-orange-700/50','F':'text-red-300 bg-red-950/50 border-red-700/50' };
  const cls = config[grade] || 'text-gray-400 bg-dark-800 border-dark-600';
  return <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border text-sm font-bold ${cls}`}>{grade||'–'}</span>;
}

// ── Findings Panel ──────────────────────────────────────────────────────────
function FindingsPanel({ findings }) {
  const [open, setOpen] = useState({});
  const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));
  const neg = (findings||[]).filter(f => !f.positive);

  if (!neg.length) return (
    <div className="card border border-green-800/40 bg-green-950/20 flex items-center gap-3">
      <MdCheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
      <p className="text-green-400 font-medium">No security misconfigurations detected.</p>
    </div>
  );

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
        <MdWarning className="w-5 h-5 text-yellow-400" />
        <h3 className="text-white font-semibold">Security Findings</h3>
        <span className="ml-auto badge bg-dark-700 border border-dark-600 text-gray-400 text-xs">{neg.length}</span>
      </div>
      <div className="divide-y divide-dark-800/60">
        {neg.map(f => (
          <div key={f.ruleId}>
            <button onClick={() => toggle(f.ruleId)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-dark-800/40 transition-colors text-left">
              <SeverityBadge severity={f.severity} size="sm" />
              <span className="flex-1 text-sm font-medium text-gray-200">{f.title}</span>
              <span className="text-xs text-gray-600 mr-2">{f.category}</span>
              {open[f.ruleId] ? <MdExpandLess className="w-4 h-4 text-gray-500" /> : <MdExpandMore className="w-4 h-4 text-gray-500" />}
            </button>
            {open[f.ruleId] && (
              <div className="px-5 pb-5 space-y-3 bg-dark-950/40">
                {f.evidence && <div className="rounded-lg bg-dark-900 border border-dark-700 px-4 py-2.5 font-mono text-xs text-yellow-300 break-all">{f.evidence}</div>}
                <InfoRow label="Description"    text={f.description} />
                <InfoRow label="Risk"           text={f.risk} />
                <InfoRow label="Recommendation" text={f.recommendation} highlight />
                {f.reference && <a href={f.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"><MdOpenInNew className="w-3.5 h-3.5" />Reference</a>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Headers Panel ───────────────────────────────────────────────────────────
function HeadersPanel({ headers }) {
  const [expanded, setExpanded] = useState(false);
  const entries   = Object.entries(headers || {});
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
          {expanded ? <><MdExpandLess className="w-4 h-4" />Show less</> : <><MdExpandMore className="w-4 h-4" />Show {entries.length - 8} more headers</>}
        </button>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ScanDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [scan,         setScan]         = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isError,      setIsError]      = useState(false);
  const [error,        setError]        = useState(null);
  const [downloading,  setDownloading]  = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchScan = async () => {
      setIsLoading(true);
      try {
        const response = await scanService.getScanById(id);
        setScan(response.data.scan);
      } catch (err) {
        setIsError(true);
        setError(err.message || 'Failed to load scan');
      } finally {
        setIsLoading(false);
      }
    };
    fetchScan();
  }, [id]);

  const handleDownload = async () => {
    if (!scan) return;
    setDownloading(true);
    try {
      const domain = scan.domain || extractDomain(scan.url);
      const date   = new Date(scan.createdAt).toISOString().split('T')[0];
      await reportService.downloadPDF(scan._id, `CyberSage_${domain}_${date}.pdf`);
      showToast('PDF report downloaded successfully');
    } catch {
      showToast('Failed to download report. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" text="Loading scan result..." />
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────
  if (isError) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="p-4 bg-red-950/30 rounded-full border border-red-800/50">
        <MdError className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-white font-bold text-xl">Failed to Load Scan</h2>
      <p className="text-gray-400 text-sm">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/history')} className="btn-secondary flex items-center gap-2">
          <MdArrowBack className="w-4 h-4" /> Back to History
        </button>
        <button onClick={() => window.location.reload()} className="btn-primary flex items-center gap-2">
          <MdRefresh className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  );

  if (!scan) return null;

  const neg = (scan.findings || []).filter(f => !f.positive);
  const headersObj = typeof scan.headers === 'object' && !(scan.headers instanceof Map)
    ? scan.headers : {};

  return (
    <div className="space-y-5">
      {/* Back + Title */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <motion.div className="flex-1" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}>
          <Link to="/history" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors mb-2">
            <MdArrowBack className="w-4 h-4" /> Back to History
          </Link>
          <h1 className="text-xl font-bold text-white truncate">{scan.domain || extractDomain(scan.url)}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{truncateUrl(scan.url, 60)} · {formatDate(scan.createdAt)}</p>
        </motion.div>

        <motion.div className="flex items-center gap-3 flex-shrink-0"
          initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}>
          <a href={scan.url} target="_blank" rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm">
            <MdOpenInNew className="w-4 h-4" /> Visit Site
          </a>
          {scan.status === 'completed' && (
            <button onClick={handleDownload} disabled={downloading}
              className="btn-primary flex items-center gap-2 text-sm">
              {downloading ? <LoadingSpinner size="sm" /> : <MdDownload className="w-4 h-4" />}
              {downloading ? 'Generating PDF...' : 'Download Report'}
            </button>
          )}
        </motion.div>
      </div>

      {/* Row 1: Score + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score panel */}
        <div className="card flex flex-col items-center gap-4 py-6">
          <ScoreGauge score={scan.score} size={160} showLabel />
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
          </div>
          <GradeBadge grade={scan.grade} />
        </div>

        {/* Info panels */}
        <div className="lg:col-span-2 space-y-4">
          {/* Scan info */}
          <div className="card">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
              <MdDns className="w-4 h-4 text-primary-400" /> Scan Information
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ['Domain',        scan.domain],
                ['Status Code',   scan.serverInfo?.statusCode],
                ['Server',        scan.serverInfo?.serverHeader || 'Not disclosed'],
                ['Response Time', scan.serverInfo?.responseTime ? `${scan.serverInfo.responseTime}ms` : '–'],
                ['Scan Duration', scan.scanDuration ? `${scan.scanDuration}ms` : '–'],
                ['Redirects',     scan.serverInfo?.redirectCount ?? 0],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm text-gray-200 font-medium truncate">{value ?? '–'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* HTTPS info */}
          {scan.httpsInfo && (
            <div className="card">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                <MdLock className="w-4 h-4 text-primary-400" /> HTTPS Configuration
              </h3>
              <div className="space-y-2">
                {[
                  ['HTTPS Enabled',         scan.httpsInfo.enabled],
                  ['HTTP → HTTPS Redirect', scan.httpsInfo.redirectsToHttps],
                  ['HSTS Present',          scan.httpsInfo.hsts],
                ].map(([label, ok]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{label}</span>
                    {Flag(ok)}
                  </div>
                ))}
                {scan.httpsInfo.hstsMaxAge && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">HSTS max-age</span>
                    <span className="text-xs font-mono text-gray-300">{scan.httpsInfo.hstsMaxAge}s</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Findings */}
      <FindingsPanel findings={scan.findings} />

      {/* AI Explanation */}
      <AIExplanationPanel scanId={scan._id}
        autoLoad={!scan.aiExplanation?.summary} />

      {/* Cookies */}
      {scan.cookies?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
            <MdCookie className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Cookie Analysis</h3>
            <span className="ml-auto text-xs text-gray-500">{scan.cookies.length} cookie{scan.cookies.length !== 1 ? 's' : ''}</span>
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
                {scan.cookies.map((c, i) => (
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
      )}

      {/* Headers */}
      <HeadersPanel headers={headersObj} />

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
            ${toast.type === 'error' ? 'bg-red-950/90 border-red-700 text-red-300' : 'bg-green-950/90 border-green-700 text-green-300'}`}>
          {toast.type === 'error' ? <MdWarning className="w-4 h-4" /> : <MdCheckCircle className="w-4 h-4" />}
          {toast.msg}
        </motion.div>
      )}
    </div>
  );
}
