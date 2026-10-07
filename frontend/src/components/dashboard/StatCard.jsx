/**
 * CyberSage - StatCard Component
 *
 * Purpose:
 *   Displays a single metric with icon, value, label, and optional trend.
 *   Used in the dashboard overview row for: Total Scans, Avg Score,
 *   Total Findings, Critical Issues.
 *
 * Props:
 *   title       {string}          - Card label
 *   value       {string|number}   - Primary metric value
 *   icon        {ReactNode}       - Icon component
 *   iconColor   {string}          - Tailwind text color class
 *   iconBg      {string}          - Tailwind bg color class
 *   trend       {object|null}     - { value: number, label: string, direction: 'up'|'down'|'neutral' }
 *   isLoading   {boolean}         - Show skeleton
 *   subtitle    {string}          - Secondary text below value
 *   delay       {number}          - Animation delay in seconds
 */

import { motion } from 'framer-motion';
import { MdTrendingUp, MdTrendingDown, MdRemove } from 'react-icons/md';

const StatCard = ({
  title      = '',
  value      = '–',
  icon       = null,
  iconColor  = 'text-primary-400',
  iconBg     = 'bg-primary-900/40',
  iconBorder = 'border-primary-700/50',
  trend      = null,
  isLoading  = false,
  subtitle   = '',
  delay      = 0
}) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-dark-700" />
          <div className="w-16 h-5 rounded bg-dark-700" />
        </div>
        <div className="w-20 h-8 rounded bg-dark-700 mb-2" />
        <div className="w-32 h-4 rounded bg-dark-700" />
      </div>
    );
  }

  const trendIcon = {
    up:      <MdTrendingUp  className="w-4 h-4" />,
    down:    <MdTrendingDown className="w-4 h-4" />,
    neutral: <MdRemove       className="w-4 h-4" />
  };

  const trendColor = {
    up:      'text-green-400 bg-green-900/30',
    down:    'text-red-400   bg-red-900/30',
    neutral: 'text-gray-400  bg-gray-900/30'
  };

  return (
    <motion.div
      className="card hover:border-dark-700 transition-colors duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        {icon && (
          <div className={`p-2.5 rounded-xl border ${iconBg} ${iconBorder}`}>
            <span className={`${iconColor} block`} style={{ fontSize: '1.25rem' }}>
              {icon}
            </span>
          </div>
        )}

        {/* Trend badge */}
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColor[trend.direction || 'neutral']}`}>
            {trendIcon[trend.direction || 'neutral']}
            {trend.label}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-3xl font-bold text-white mb-1 font-mono">
        {value}
      </div>

      {/* Title */}
      <div className="text-sm font-medium text-gray-400">{title}</div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-gray-600 mt-1">{subtitle}</div>
      )}
    </motion.div>
  );
};

export default StatCard;
