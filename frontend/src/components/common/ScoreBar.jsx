/**
 * CyberSage - ScoreBar Component
 *
 * Purpose:
 *   Horizontal progress bar for displaying a security score (0-100).
 *   Color transitions based on score range.
 *   Animates fill width on mount.
 *
 * Props:
 *   score     {number|null}  - 0 to 100
 *   showValue {boolean}      - Show score number on right (default true)
 *   height    {string}       - Tailwind height class (default 'h-2')
 *   animate   {boolean}      - Animate fill on mount (default true)
 *   label     {string}       - Optional left label
 */

import { motion } from 'framer-motion';

const getBarColor = (score) => {
  if (score === null || score === undefined) return 'bg-gray-600';
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
};

const getTextColor = (score) => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
};

const ScoreBar = ({
  score      = null,
  showValue  = true,
  height     = 'h-2',
  animate    = true,
  label      = ''
}) => {
  const pct       = score !== null && score !== undefined ? Math.min(100, Math.max(0, score)) : 0;
  const barColor  = getBarColor(score);
  const textColor = getTextColor(score);

  return (
    <div className="w-full">
      {/* Label row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-gray-400 truncate mr-2">{label}</span>
          )}
          {showValue && (
            <span className={`text-xs font-semibold font-mono ml-auto ${textColor}`}>
              {score !== null ? score : '–'}
            </span>
          )}
        </div>
      )}

      {/* Bar track */}
      <div
        className={`w-full ${height} bg-dark-800 rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={score ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score: ${score ?? 'not available'}`}
      >
        {animate ? (
          <motion.div
            className={`${height} ${barColor} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{ boxShadow: score !== null ? `0 0 8px ${barColor.replace('bg-', '')}40` : 'none' }}
          />
        ) : (
          <div
            className={`${height} ${barColor} rounded-full`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ScoreBar;
