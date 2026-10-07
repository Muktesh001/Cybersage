/**
 * CyberSage - Scan History Page
 * Full paginated scan history with search, filter, sort, and delete.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdHistory, MdSearch, MdDelete, MdOpenInNew, MdRefresh,
  MdFilterList, MdKeyboardArrowUp, MdKeyboardArrowDown,
  MdWarning, MdCheckCircle, MdChevronLeft, MdChevronRight,
  MdDownload
} from 'react-icons/md';
import useScanHistory       from '../../hooks/useScanHistory';
import reportService        from '../../services/reportService';
import SeverityBadge        from '../../components/common/SeverityBadge';
import ScoreBar             from '../../components/common/ScoreBar';
import LoadingSpinner       from '../../components/common/LoadingSpinner';
import { formatDate, extractDomain } from '../../utils/helpers';

// ---- Delete Confirm Modal ----
function DeleteModal({ scan, onConfirm, onCancel, isDeleting }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <motion.div className="card max-w-md w-full border border-red-800/50"
        initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="p-2.5 bg-red-900/40 rounded-xl border border-red-800 flex-shrink-0">
            <MdWarning className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Delete Scan?</h3>
            <p className="text-gray-400 text-sm mt-1">
              This will permanently delete the scan for{' '}
              <span className="text-white font-medium">{scan?.domain || scan?.url}</span>.
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 btn bg-red-700 hover:bg-red-600 text-white flex items-center justify-center gap-2">
            {isDeleting ? <LoadingSpinner size="sm" /> : <MdDelete className="w-4 h-4" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---- Sort indicator ----
function SortIcon({ field, current, dir }) {
  if (field !== current) return <MdKeyboardArrowDown className="w-3.5 h-3.5 text-gray-600" />;
  return dir === 'asc'
    ? <MdKeyboardArrowUp   className="w-3.5 h-3.5 text-primary-400" />
    : <MdKeyboardArrowDown className="w-3.5 h-3.5 text-primary-400" />;
}

// ---- Grade Badge ----
function GradeBadge({ grade }) {
  const cls = { 'A+':'text-green-400','A':'text-green-400','B':'text-blue-400','C':'text-yellow-400','D':'text-orange-400','F':'text-red-400' };
  return <span className={`font-bold text-sm font-mono ${cls[grade]||'text-gray-400'}`}>{grade||'–'}</span>;
}

// ---- Main Page ----
export default function ScanHistory() {
  const navigate = useNavigate();
  const { scans, pagination, isLoading, isError, error,
          params, updateParam, refresh, deleteScan, isDeleting } = useScanHistory();

  const [scanToDelete, setScanToDelete] = useState(null);
  const [downloading,  setDownloading]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (field) => {
    if (params.sortBy === field) {
      updateParam('sortDir', params.sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      updateParam('sortBy', field);
      updateParam('sortDir', 'desc');
    }
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteScan(scanToDelete._id);
    setScanToDelete(null);
    if (result.success) showToast('Scan deleted successfully');
    else showToast(result.message || 'Delete failed', 'error');
  };

  const handleDownload = async (scan) => {
    setDownloading(scan._id);
    try {
      const domain   = scan.domain || extractDomain(scan.url);
      const date     = new Date(scan.createdAt).toISOString().split('T')[0];
      await reportService.downloadPDF(scan._id, `CyberSage_${domain}_${date}.pdf`);
      showToast('PDF downloaded successfully');
    } catch {
      showToast('Failed to download report', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const TH = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none"
      onClick={() => field && handleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {field && <SortIcon field={field} current={params.sortBy} dir={params.sortDir} />}
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MdHistory className="w-7 h-7 text-primary-400" />
            Scan History
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {pagination ? `${pagination.total} scan${pagination.total !== 1 ? 's' : ''} recorded` : 'All your security audits'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={isLoading} className="btn-secondary flex items-center gap-2 text-sm">
            <MdRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link to="/scan" className="btn-primary flex items-center gap-2 text-sm">
            <MdSearch className="w-4 h-4" /> New Scan
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input type="text" placeholder="Search by domain or URL..."
            value={params.search}
            onChange={e => updateParam('search', e.target.value)}
            className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <MdFilterList className="w-4 h-4 text-gray-500" />
          <select value={params.status} onChange={e => updateParam('status', e.target.value)}
            className="input py-2 text-sm w-36">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
          <select value={params.limit} onChange={e => updateParam('limit', parseInt(e.target.value))}
            className="input py-2 text-sm w-24">
            {[10,25,50].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="card border border-red-800/50 bg-red-950/20 flex items-center gap-3">
          <MdWarning className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={refresh} className="ml-auto btn-secondary text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-950/60">
                <TH field="domain"    label="Target" />
                <TH field="score"     label="Score" />
                <TH label="Grade" />
                <TH label="Findings" />
                <TH field="createdAt" label="Date" />
                <TH label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[50,30,15,25,25,20].map((w,j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-dark-700 rounded" style={{ width:`${w}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <MdHistory className="w-10 h-10 text-dark-700" />
                      <p className="text-gray-400">No scans found</p>
                      <p className="text-gray-600 text-sm">
                        {params.search ? 'Try a different search term' : 'Run your first scan to see history here'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                scans.map((scan, idx) => (
                  <motion.tr key={scan._id}
                    className="hover:bg-dark-800/30 transition-colors cursor-pointer"
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: idx * 0.03 }}
                    onClick={() => navigate(`/history/${scan._id}`)}>
                    {/* Target */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-200 truncate max-w-[180px]">
                        {scan.domain || extractDomain(scan.url)}
                      </p>
                      <p className="text-xs text-gray-600 truncate max-w-[180px] mt-0.5">{scan.url}</p>
                    </td>
                    {/* Score */}
                    <td className="px-4 py-3 min-w-[120px]">
                      {scan.status === 'completed'
                        ? <ScoreBar score={scan.score} height="h-1.5" showValue animate={false} />
                        : <span className="text-xs text-gray-500 italic capitalize">{scan.status}</span>}
                    </td>
                    {/* Grade */}
                    <td className="px-4 py-3"><GradeBadge grade={scan.grade} /></td>
                    {/* Findings */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scan.findingsSummary?.critical > 0 && <SeverityBadge severity="critical" size="sm" showDot={false} />}
                        {scan.findingsSummary?.high     > 0 && <SeverityBadge severity="high"     size="sm" showDot={false} />}
                        {scan.findingsSummary?.total    > 0
                          ? <span className="text-xs text-gray-500">{scan.findingsSummary.total} total</span>
                          : <span className="text-xs text-green-500 flex items-center gap-1"><MdCheckCircle className="w-3.5 h-3.5" />Clean</span>}
                      </div>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(scan.createdAt)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link to={`/history/${scan._id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-dark-700 transition-all"
                          title="View scan">
                          <MdOpenInNew className="w-4 h-4" />
                        </Link>
                        {scan.status === 'completed' && (
                          <button onClick={() => handleDownload(scan)} disabled={downloading === scan._id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-dark-700 transition-all"
                            title="Download PDF">
                            {downloading === scan._id
                              ? <LoadingSpinner size="sm" />
                              : <MdDownload className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => setScanToDelete(scan)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-700 transition-all"
                          title="Delete scan">
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800">
            <p className="text-xs text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => updateParam('page', pagination.page - 1)}
                disabled={!pagination.hasPrev || isLoading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <MdChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-400 px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button onClick={() => updateParam('page', pagination.page + 1)}
                disabled={!pagination.hasNext || isLoading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <MdChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {scanToDelete && (
          <DeleteModal scan={scanToDelete}
            onConfirm={handleDeleteConfirm} onCancel={() => setScanToDelete(null)}
            isDeleting={isDeleting} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
              ${toast.type === 'error'
                ? 'bg-red-950/90 border-red-700 text-red-300'
                : 'bg-green-950/90 border-green-700 text-green-300'}`}>
            {toast.type === 'error'
              ? <MdWarning className="w-4 h-4" />
              : <MdCheckCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
