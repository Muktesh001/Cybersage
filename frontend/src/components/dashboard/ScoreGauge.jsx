/**
 * CyberSage - ScoreGauge Component
 *
 * Purpose:
 *   SVG arc gauge that visualizes the 0-100 security score.
 *   Color transitions from red (low) → yellow (mid) → green (high).
 *   Animates arc fill on mount.
 *
 * Props:
 *   score    {number|null}  - 0 to 100
 *   size     {number}       - SVG diameter in px (default 200)
 *   showLabel {boolean}     - Show rating label below score (default true)
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Map score → color
const getScoreColor = (score) => {
  if (score === null || score === undefined) return '#64748b';
  if (score >= 90) return '#22c55e';  // green-500
  if (score >= 70) return '#3b82f6';  // blue-500
  if (score >= 50) return '#eab308';  // yellow-500
  if (score >= 30) return '#f97316';  // orange-500
  return '#ef4444';                    // red-500
};

const getScoreLabel = (score) => {
  if (score === null || score === undefined) return 'No Data';
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
};

const getGrade = (score) => {
  if (score === null || score === undefined) return '–';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

const ScoreGauge = ({ score = null, size = 200, showLabel = true }) => {
  const displayScore = score !== null && score !== undefined ? Math.round(score) : null;
  const color        = getScoreColor(displayScore);
  const label        = getScoreLabel(displayScore);
  const grade        = getGrade(displayScore);

  // SVG arc math
  const cx        = size / 2;
  const cy        = size / 2;
  const radius    = size * 0.38;
  const stroke    = size * 0.07;

  // Arc goes from 225° to 315° (270° sweep = 3/4 circle)
  const startAngle = 225;
  const totalAngle = 270;
  const pct        = displayScore !== null ? displayScore / 100 : 0;
  const endAngle   = startAngle + totalAngle * pct;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const arcPath = (start, end) => {
    const s = { x: cx + radius * Math.cos(toRad(start)), y: cy + radius * Math.sin(toRad(start)) };
    const e = { x: cx + radius * Math.cos(toRad(end)),   y: cy + radius * Math.sin(toRad(end))   };
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const bgPath    = arcPath(startAngle, startAngle + totalAngle);
  const scorePath = arcPath(startAngle, endAngle);

  const circumference = radius * toRad(totalAngle);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-label={`Security score: ${displayScore ?? 'not available'}`}
          role="img"
        >
          {/* Background arc track */}
          <path
            d={bgPath}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Score arc — animated */}
          {displayScore !== null && (
            <motion.path
              d={scorePath}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            />
          )}

          {/* Center: Score number */}
          <text
            x={cx}
            y={cy - size * 0.04}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.22}
            fontWeight="700"
            fill={color}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {displayScore !== null ? displayScore : '–'}
          </text>

          {/* Center: /100 label */}
          <text
            x={cx}
            y={cy + size * 0.13}
            textAnchor="middle"
            fontSize={size * 0.08}
            fill="#64748b"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {displayScore !== null ? '/ 100' : 'No scans yet'}
          </text>

          {/* Grade badge */}
          {displayScore !== null && (
            <>
              <circle cx={cx} cy={cy + size * 0.27} r={size * 0.1} fill="#0f172a" stroke={color} strokeWidth="1.5" />
              <text
                x={cx}
                y={cy + size * 0.27}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.1}
                fontWeight="700"
                fill={color}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {grade}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Rating label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-sm font-semibold"
          style={{ color }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
};

export default ScoreGauge;
