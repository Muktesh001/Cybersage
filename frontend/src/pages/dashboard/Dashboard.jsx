/**
 * CyberSage - Dashboard Page
 *
 * Purpose:
 *   Main dashboard view for authenticated users.
 *   Assembles all dashboard components with live API data.
 *
 * Layout:
 *   1. Header: Welcome, last refresh time, action buttons
 *   2. Score + Stats row: ScoreGauge + 4 StatCards
 *   3. Charts row: ScanTrendChart + SeverityDistributionChart
 *   4. Recent Scans Table
 *
 * Data Flow:
 *   useDashboard() → GET /api/dashboard/stats →
 *   { overview, severityCounts, recentScans, trend }
 */

import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdShield, MdSearch, MdRefresh, MdErrorOutline,
  MdBarChart, MdBugReport, MdWarning, MdSecurity
} from 'react-icons/md';

import useAuth         from '../../hooks/useAuth';
import useDashboard    from '../../hooks/useDashboard';

// Dashboard components
import ScoreGauge                from '../../components/dashboard/ScoreGauge';
import StatCard                  from '../../components/dashboard/StatCard';
import ScanTrendChart            from '../../components/dashboard/ScanTrendChart';
import SeverityDistributionChart from '../../components/dashboard/SeverityDistributionChart';
import RecentScansTable          from '../../components/dashboard/RecentScansTable';
import LoadingSpinner            from '../../components/common/LoadingSpinner';

// ---- Error State ----
const DashboardError = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
  >
    <div className="p-5 bg-red-950/30 rounded-full border border-red-800/50">
      <MdErrorOutline className="w-12 h-12 text-red-400" />
    </div>
    <div className="text-center">
      <h2 className="text-xl font-bold text-white mb-2">Failed to Load Dashboard</h2>
      <p className="text-gray-400 text-sm max-w-sm">
        {message || 'Could not fetch dashboard data. Please check your connection and try again.'}
      </p>
    </div>
    <button
      onClick={onRetry}
      className="btn-primary flex items-center gap-2 px-6 py-3"
    >
      <MdRefresh className="w-5 h-5" />
      Try Again
    </button>
  </motion.div>
);

// ---- Score Skeleton ----
const ScoreSkeleton = () => (
  <div className="card flex flex-col items-center gap-4 animate-pulse">
    <div className="w-48 h-48 rounded-full bg-dark-800 border-8 border-dark-700" />
    <div className="w-24 h-5 bg-dark-700 rounded" />
  </div>
);

// ---- Main Dashboard ----
const Dashboard = () => {
  const { user }                       = useAuth();
  const { data, isLoading, isError,
          error, refresh, lastFetched } = useDashboard();

  const firstName = user?.name?.split(' ')[0] || 'there';

  // Format last fetched time
  const lastFetchedStr = lastFetched
    ? lastFetched.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Extract data sections (safe fallbacks)
  const overview        = data?.overview        || {};
  const severityCounts  = data?.severityCounts  || {};
  const recentScans     = data?.recentScans      || [];
  const trend           = data?.trend            || [];

  // ---- Stat Card config ----
  const statCards = [
    {
      title:       'Total Scans',
      value:       isLoading ? '–' : (overview.totalScans ?? 0),
      icon:        <MdBarChart />,
      iconColor:   'text-primary-400',
      iconBg:      'bg-primary-900/40',
      iconBorder:  'border-primary-800/50',
      subtitle:    'Completed audits',
      delay:       0.1
    },
    {
      title:       'Average Score',
      value:       isLoading ? '–' : (overview.averageScore !== null ? overview.averageScore : '–'),
      icon:        <MdShield />,
      iconColor:   'text-blue-400',
      iconBg:      'bg-blue-900/40',
      iconBorder:  'border-blue-800/50',
      subtitle:    overview.scoreRating?.label || 'No data yet',
      delay:       0.15
    },
    {
      title:       'Total Findings',
      value:       isLoading ? '–' : (overview.totalFindings ?? 0),
      icon:        <MdBugReport />,
      iconColor:   'text-yellow-400',
      iconBg:      'bg-yellow-900/40',
      iconBorder:  'border-yellow-800/50',
      subtitle:    'Across all scans',
      delay:       0.2
    },
    {
      title:       'Critical Issues',
      value:       isLoading ? '–' : (severityCounts.critical ?? 0),
      icon:        <MdWarning />,
      iconColor:   severityCounts.critical > 0 ? 'text-red-400'  : 'text-green-400',
      iconBg:      severityCounts.critical > 0 ? 'bg-red-900/40'  : 'bg-green-900/40',
      iconBorder:  severityCounts.critical > 0 ? 'border-red-800/50' : 'border-green-800/50',
      subtitle:    severityCounts.critical > 0 ? 'Needs attention' : 'All clear',
      trend:       severityCounts.critical > 0
                     ? { label: 'Action needed', direction: 'down' }
                     : null,
      delay:       0.25
    }
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-white">
            Welcome back,{' '}
            <span className="text-gradient">{firstName}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-2">
            Security Auditing Dashboard
            {lastFetchedStr && (
              <span className="text-gray-600 text-xs">
                · Updated {lastFetchedStr}
              </span>
            )}
          </p>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2"
            aria-label="Refresh dashboard"
          >
            <MdRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* New Scan CTA */}
          <Link
            to="/scan"
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            <MdSearch className="w-4 h-4" />
            New Scan
          </Link>
        </motion.div>
      </div>

      {/* ── Error State ── */}
      <AnimatePresence>
        {isError && (
          <DashboardError message={error} onRetry={refresh} />
        )}
      </AnimatePresence>

      {/* ── Content (only when not errored) ── */}
      {!isError && (
        <>
          {/* ── Row 1: Score + Stat Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Score Gauge — takes 1 column */}
            <motion.div
              className="lg:col-span-1 card flex flex-col items-center justify-center py-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {isLoading ? (
                <ScoreSkeleton />
              ) : (
                <>
                  <ScoreGauge
                    score={overview.averageScore ?? null}
                    size={180}
                    showLabel={true}
                  />
                  <p className="text-xs text-gray-500 mt-3 text-center px-2">
                    Average across all scans
                  </p>
                </>
              )}
            </motion.div>

            {/* Stat Cards — takes 4 columns as 2x2 grid */}
            <div className="lg:col-span-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <StatCard
                  key={card.title}
                  isLoading={isLoading}
                  {...card}
                />
              ))}

              {/* Security Status Banner — full width within 4-col area */}
              <motion.div
                className="col-span-2 xl:col-span-4 rounded-xl border px-5 py-4 flex items-center gap-4
                           bg-gradient-to-r from-dark-900 to-dark-950
                           border-dark-700"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="p-2.5 rounded-xl bg-primary-900/30 border border-primary-800/50 flex-shrink-0">
                  <MdSecurity className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <div className="animate-pulse space-y-1">
                      <div className="h-4 bg-dark-700 rounded w-48" />
                      <div className="h-3 bg-dark-800 rounded w-64" />
                    </div>
                  ) : overview.totalScans === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-white">No scans completed yet</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Run your first security audit to start tracking your web security posture.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">
                        Security Posture:{' '}
                        <span style={{
                          color: overview.scoreRating?.color === 'green'  ? '#22c55e' :
                                 overview.scoreRating?.color === 'blue'   ? '#3b82f6' :
                                 overview.scoreRating?.color === 'yellow' ? '#eab308' :
                                 overview.scoreRating?.color === 'orange' ? '#f97316' : '#ef4444'
                        }}>
                          {overview.scoreRating?.label || 'Unknown'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Based on {overview.totalScans} scan{overview.totalScans !== 1 ? 's' : ''} ·{' '}
                        {overview.totalFindings} total finding{overview.totalFindings !== 1 ? 's' : ''} detected
                      </p>
                    </>
                  )}
                </div>

                {!isLoading && overview.totalScans === 0 && (
                  <Link
                    to="/scan"
                    className="btn-primary text-xs px-3 py-2 flex-shrink-0 flex items-center gap-1.5"
                  >
                    <MdSearch className="w-3.5 h-3.5" />
                    Start
                  </Link>
                )}
              </motion.div>
            </div>
          </div>

          {/* ── Row 2: Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trend Chart — 2/3 width */}
            <div className="lg:col-span-2">
              <ScanTrendChart trend={trend} isLoading={isLoading} />
            </div>

            {/* Severity Distribution — 1/3 width */}
            <div className="lg:col-span-1">
              <SeverityDistributionChart
                severityCounts={severityCounts}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* ── Row 3: Recent Scans Table ── */}
          <RecentScansTable scans={recentScans} isLoading={isLoading} />

          {/* ── Row 4: Quick Tips (only when no scans) ── */}
          {!isLoading && overview.totalScans === 0 && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[
                {
                  step:  '01',
                  title: 'Enter a URL',
                  desc:  'Provide any publicly accessible website URL to audit.',
                  color: 'text-primary-400',
                  bg:    'bg-primary-900/20',
                  border:'border-primary-800/40'
                },
                {
                  step:  '02',
                  title: 'We Analyze',
                  desc:  'CyberSage safely checks HTTP headers, cookies, and HTTPS config.',
                  color: 'text-purple-400',
                  bg:    'bg-purple-900/20',
                  border:'border-purple-800/40'
                },
                {
                  step:  '03',
                  title: 'Get AI Insights',
                  desc:  'Receive a security score, findings, and AI-generated remediation advice.',
                  color: 'text-green-400',
                  bg:    'bg-green-900/20',
                  border:'border-green-800/40'
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className={`rounded-xl border ${item.border} ${item.bg} p-5`}
                >
                  <div className={`text-3xl font-black font-mono mb-3 ${item.color}`}>
                    {item.step}
                  </div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
