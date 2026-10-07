/**
 * CyberSage - SeverityBadge Component
 *
 * Purpose:
 *   Color-coded pill badge displaying a severity level.
 *   Used in findings tables, scan results, and history views.
 *
 * Props:
 *   severity  {string}   - 'critical' | 'high' | 'medium' | 'low' | 'info'
 *   size      {string}   - 'sm' | 'md' (default 'md')
 *   showDot   {boolean}  - Show colored dot prefix (default true)
 */

const SEVERITY_CONFIG = {
  critical: {
    label:  'Critical',
    text:   'text-red-300',
    bg:     'bg-red-950/60',
    border: 'border-red-700/60',
    dot:    'bg-red-400'
  },
  high: {
    label:  'High',
    text:   'text-orange-300',
    bg:     'bg-orange-950/60',
    border: 'border-orange-700/60',
    dot:    'bg-orange-400'
  },
  medium: {
    label:  'Medium',
    text:   'text-yellow-300',
    bg:     'bg-yellow-950/60',
    border: 'border-yellow-700/60',
    dot:    'bg-yellow-400'
  },
  low: {
    label:  'Low',
    text:   'text-blue-300',
    bg:     'bg-blue-950/60',
    border: 'border-blue-700/60',
    dot:    'bg-blue-400'
  },
  info: {
    label:  'Info',
    text:   'text-gray-300',
    bg:     'bg-gray-800/60',
    border: 'border-gray-600/60',
    dot:    'bg-gray-400'
  }
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5'
};

const SeverityBadge = ({ severity = 'info', size = 'md', showDot = true }) => {
  const key    = (severity || 'info').toLowerCase();
  const config = SEVERITY_CONFIG[key] || SEVERITY_CONFIG.info;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.text} ${config.bg} ${config.border} ${sizeClass}`}
      aria-label={`Severity: ${config.label}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      )}
      {config.label}
    </span>
  );
};

export default SeverityBadge;
