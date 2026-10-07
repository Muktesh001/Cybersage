/**
 * CyberSage - RecentScansTable Component
 *
 * Purpose:
 *   Displays the 5 most recent completed scans in a styled dark table.
 *   Shows: domain, score bar, grade, finding counts by severity, date, actions.
 *
 * Props:
 *   scans      {Array}    - Array of scan objects from API
 *   isLoading  {boolean}  - Show skeleton rows
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MdOpenInNew, MdShield, MdSearch, MdAccessTime
} from 'react-icons/md';
import ScoreBar from '../common/ScoreBar';
import SeverityBadge from '../common/SeverityBadge';
import { formatDate, truncateUrl, extractDomain } from '../../utils/helpers';

// ---- Grade Badge ----
const GradeBadge = ({ grade }) => {
  const config = {
    'A+': 'text-green-300  bg-green-950/50  border-green-700/50',
    'A':  'text-green-400  bg-green-950/50  border-green-700/50',
    'B':  'text-blue-300   bg-blue-950/50   border-blue-700/50',
    'C':  'text-yellow-300 bg-yellow-950/50 border-yellow-700/50',
    'D':  'text-orange-300 bg-orange-950/50 border-orange-700/50',
    'F':  'text-red-300    bg-red-950/50    border-red-700/50',
  };
  const cls = config[grade] || 'text-gray-400 bg-dark-800 border-dark-600';

  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold ${cls}`}>
      {grade || '–'}
    </span>
  );
};

// ---- Status Badge ----
const StatusBadge = ({ status }) => {
  const config = {
    completed: 'text-green-400  bg-green-950/40  border-green-800',
    running:   'text-blue-400   bg-blue-950/40   border-blue-800',
    pending:   'text-yellow-400 bg-yellow-950/40 border-yellow-800',
    failed:    'text-red-400    bg-red-950/40    border-red-800',
  };
  const cls = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'completed' ? 'bg-green-400' :
        status === 'running'   ? 'bg-blue-400 animate-pulse' :
        status === 'failed'    ? 'bg-red-400' : 'bg-yellow-400'
      }`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
};

// ---- Skeleton Row ----
const SkeletonRow = () => (
  <tr className="border-b border-dark-800 animate-pulse">
    {[40, 28, 20, 24, 28, 20].map((w, i) => (
      <td key={i} className="px-4 py-4">
        <div className={`h-4 bg-dark-700 rounded w-${w}/100 max-w-full`} style={{ width: `${w}%` }} />
      </td>
    ))}
  </tr>
);

// ---- Empty State ----
const EmptyState = () => (
  <tr>
    <td colSpan={6} className="px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-dark-800 rounded-full border border-dark-700">
          <MdSearch className="w-8 h-8 text-gray-600" />
        </div>
        <div>
          <p className="text-gray-400 font-medium">No scans yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Run your first scan to see results here
          </p>
        </div>
        <Link
          to="/scan"
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          <MdShield className="w-4 h-4" />
          Start a Scan
        </Link>
      </div>
    </td>
  </tr>
);

// ---- Main Component ----
const RecentScansTable = ({ scans = [], isLoading = false }) => {
  return (
    <motion.div
      className="card p-0 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <MdAccessTime className="w-5 h-5 text-primary-400" />
          <h3 className="text-white font-semibold">Recent Scans</h3>
          {!isLoading && scans.length > 0 && (
            <span className="badge bg-dark-700 text-gray-400 border border-dark-600 text-xs">
              {scans.length}
            </span>
          )}
        </div>
        <Link
          to="/history"
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
        >
          View all
          <MdOpenInNew className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table — scrollable on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-dark-800 bg-dark-950/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Findings
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scanned
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-dark-800/50">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : scans.length === 0 ? (
              <EmptyState />
            ) : (
              scans.map((scan, idx) => (
                <motion.tr
                  key={scan.id || idx}
                  className="hover:bg-dark-800/30 transition-colors duration-150"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {/* Target */}
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-200 truncate max-w-[180px]">
                        {scan.domain || extractDomain(scan.url)}
                      </p>
                      <p className="text-xs text-gray-600 truncate max-w-[180px] mt-0.5">
                        {truncateUrl(scan.url, 35)}
                      </p>
                    </div>
                  </td>

                  {/* Score bar */}
                  <td className="px-4 py-4 min-w-[120px]">
                    <ScoreBar
                      score={scan.score}
                      height="h-1.5"
                      showValue={true}
                      animate={false}
                    />
                  </td>

                  {/* Grade */}
                  <td className="px-4 py-4">
                    <GradeBadge grade={scan.grade} />
                  </td>

                  {/* Findings summary */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {scan.findings?.critical > 0 && (
                        <SeverityBadge severity="critical" size="sm" showDot={false} />
                      )}
                      {scan.findings?.high > 0 && (
                        <SeverityBadge severity="high" size="sm" showDot={false} />
                      )}
                      {scan.findings?.medium > 0 && (
                        <span className="text-xs text-yellow-400 font-medium">
                          {scan.findings.medium}M
                        </span>
                      )}
                      {scan.findings?.low > 0 && (
                        <span className="text-xs text-blue-400 font-medium">
                          {scan.findings.low}L
                        </span>
                      )}
                      {(!scan.findings || scan.findings?.total === 0) && (
                        <span className="text-xs text-gray-600">None</span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(scan.scannedAt)}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4">
                    <Link
                      to={`/history/${scan.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                 text-primary-400 bg-primary-900/20 border border-primary-800/50
                                 hover:bg-primary-900/40 hover:text-primary-300 transition-all duration-150"
                      aria-label={`View scan for ${scan.domain}`}
                    >
                      <MdOpenInNew className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default RecentScansTable;
