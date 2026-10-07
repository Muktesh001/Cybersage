/**
 * CyberSage - SeverityDistributionChart Component
 *
 * Purpose:
 *   Doughnut chart showing the distribution of security findings
 *   by severity level across all of the user's scans.
 *   Center text shows total findings count.
 *   Custom legend rendered below the chart.
 *
 * Props:
 *   severityCounts  {object}   - { critical, high, medium, low, info }
 *   isLoading       {boolean}  - Show skeleton
 */

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { MdPieChart } from 'react-icons/md';

// Register Chart.js modules (safe to call multiple times)
ChartJS.register(ArcElement, Tooltip, Legend);

// ---- Severity config ----
const SEVERITY_META = [
  { key: 'critical', label: 'Critical', color: '#ef4444', bg: 'bg-red-500'    },
  { key: 'high',     label: 'High',     color: '#f97316', bg: 'bg-orange-500' },
  { key: 'medium',   label: 'Medium',   color: '#eab308', bg: 'bg-yellow-500' },
  { key: 'low',      label: 'Low',      color: '#3b82f6', bg: 'bg-blue-500'   },
  { key: 'info',     label: 'Info',     color: '#64748b', bg: 'bg-slate-500'  },
];

// ---- Center text plugin ----
// Draws total count in the center of the doughnut hole
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    const { ctx, data, chartArea: area } = chart;
    if (!area) return;

    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    const cx    = (area.left + area.right)  / 2;
    const cy    = (area.top  + area.bottom) / 2;

    ctx.save();

    // Total number
    ctx.font         = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillStyle    = '#f1f5f9';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 10);

    // Label
    ctx.font      = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('findings', cx, cy + 12);

    ctx.restore();
  }
};

// ---- Empty State ----
const EmptyDistribution = () => (
  <div className="flex flex-col items-center justify-center h-48 gap-3">
    <MdPieChart className="w-10 h-10 text-dark-700" />
    <p className="text-gray-500 text-sm text-center">
      No findings yet.<br />
      <span className="text-gray-600 text-xs">Run a scan to see distribution.</span>
    </p>
  </div>
);

// ---- Skeleton ----
const DonutSkeleton = () => (
  <div className="flex items-center justify-center h-48 animate-pulse">
    <div className="w-36 h-36 rounded-full border-8 border-dark-700 relative">
      <div className="absolute inset-4 rounded-full bg-dark-800" />
    </div>
  </div>
);

// ---- Main Component ----
const SeverityDistributionChart = ({
  severityCounts = {},
  isLoading = false
}) => {
  const counts = SEVERITY_META.map(s => severityCounts[s.key] || 0);
  const total  = counts.reduce((a, b) => a + b, 0);
  const hasData = total > 0;

  const data = {
    labels:   SEVERITY_META.map(s => s.label),
    datasets: [{
      data:             counts,
      backgroundColor:  SEVERITY_META.map(s => s.color + 'cc'), // 80% opacity
      borderColor:      SEVERITY_META.map(s => s.color),
      borderWidth:      2,
      hoverOffset:      8,
      hoverBorderWidth: 3,
    }]
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    cutout:              '68%',
    plugins: {
      legend: { display: false },   // We render custom legend below
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor:     '#334155',
        borderWidth:     1,
        titleColor:      '#94a3b8',
        bodyColor:       '#f1f5f9',
        padding:         12,
        callbacks: {
          label: (item) => {
            const val = item.raw;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return `  ${item.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MdPieChart className="w-5 h-5 text-primary-400" />
          <h3 className="text-white font-semibold">Findings by Severity</h3>
        </div>
        {hasData && (
          <span className="text-xs text-gray-500">{total} total</span>
        )}
      </div>

      {/* Chart */}
      <div className="h-44">
        {isLoading ? (
          <DonutSkeleton />
        ) : !hasData ? (
          <EmptyDistribution />
        ) : (
          <Doughnut
            data={data}
            options={options}
            plugins={[centerTextPlugin]}
          />
        )}
      </div>

      {/* Custom Legend */}
      {!isLoading && hasData && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 pt-4 border-t border-dark-800">
          {SEVERITY_META.map((s) => {
            const count = severityCounts[s.key] || 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-gray-400 truncate">{s.label}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className="text-xs font-semibold text-gray-200 font-mono">{count}</span>
                  <span className="text-xs text-gray-600">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default SeverityDistributionChart;
