/**
 * CyberSage - ScanTrendChart Component
 *
 * Purpose:
 *   Line chart showing average security score trend over the last 7 days.
 *   Built with Chart.js + react-chartjs-2.
 *   Gradient fill under line, null gaps for days with no scans.
 *
 * Props:
 *   trend      {Array}    - [{ date, label, avgScore, count }] — 7 items
 *   isLoading  {boolean}  - Show skeleton
 */

import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { MdTrendingUp } from 'react-icons/md';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ---- Empty State ----
const EmptyTrend = () => (
  <div className="flex flex-col items-center justify-center h-48 gap-3">
    <MdTrendingUp className="w-10 h-10 text-dark-700" />
    <p className="text-gray-500 text-sm text-center">
      No scan data yet.<br />
      <span className="text-gray-600 text-xs">Complete a scan to see your trend.</span>
    </p>
  </div>
);

// ---- Skeleton ----
const TrendSkeleton = () => (
  <div className="h-48 flex items-end gap-2 px-4 pb-4 animate-pulse">
    {[40, 65, 50, 80, 60, 75, 55].map((h, i) => (
      <div
        key={i}
        className="flex-1 bg-dark-700 rounded-t"
        style={{ height: `${h}%` }}
      />
    ))}
  </div>
);

const ScanTrendChart = ({ trend = [], isLoading = false }) => {
  const chartRef = useRef(null);

  // Check if any data point has a score
  const hasData = trend.some(d => d.avgScore !== null);

  // Build gradient fill on chart mount
  const getGradient = (ctx, chartArea) => {
    if (!chartArea) return '#0ea5e930';
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.00)');
    return gradient;
  };

  const labels = trend.map(d => d.label);
  const scores = trend.map(d => d.avgScore); // null = gap in chart

  const data = {
    labels,
    datasets: [
      {
        label:            'Avg. Score',
        data:             scores,
        borderColor:      '#0ea5e9',
        borderWidth:      2.5,
        pointBackgroundColor: '#0ea5e9',
        pointBorderColor:     '#0f172a',
        pointBorderWidth:     2,
        pointRadius:          5,
        pointHoverRadius:     7,
        tension:          0.4,
        fill:             true,
        backgroundColor:  (ctx) => {
          const chart     = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(14,165,233,0.1)';
          return getGradient(c, chartArea);
        },
        spanGaps: false  // Show gaps for null values
      }
    ]
  };

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: {
      mode:       'index',
      intersect:  false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor:     '#334155',
        borderWidth:     1,
        titleColor:      '#94a3b8',
        bodyColor:       '#f1f5f9',
        padding:         12,
        callbacks: {
          title: (items) => items[0]?.label || '',
          label: (item) => {
            const val = item.raw;
            if (val === null) return 'No scan on this day';
            const idx    = item.dataIndex;
            const count  = trend[idx]?.count || 0;
            return [
              ` Score: ${Math.round(val)}`,
              ` Scans: ${count}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color:       'rgba(51, 65, 85, 0.4)',
          drawTicks:   false
        },
        ticks: {
          color:    '#64748b',
          font:     { size: 11 },
          padding:  8
        },
        border: { color: 'transparent' }
      },
      y: {
        min:  0,
        max:  100,
        grid: {
          color:    'rgba(51, 65, 85, 0.4)',
          drawTicks: false
        },
        ticks: {
          color:     '#64748b',
          font:      { size: 11 },
          padding:   8,
          stepSize:  25,
          callback:  (v) => `${v}`
        },
        border: { color: 'transparent' }
      }
    }
  };

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MdTrendingUp className="w-5 h-5 text-primary-400" />
          <h3 className="text-white font-semibold">Score Trend</h3>
        </div>
        <span className="text-xs text-gray-500">Last 7 days</span>
      </div>

      {/* Chart area — fixed height */}
      <div className="h-48">
        {isLoading  ? <TrendSkeleton /> :
         !hasData   ? <EmptyTrend />    :
         <Line ref={chartRef} data={data} options={options} />}
      </div>
    </motion.div>
  );
};

export default ScanTrendChart;
