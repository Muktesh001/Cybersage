/**
 * CyberSage - LoadingSpinner Component
 *
 * Reusable animated spinner with optional text.
 * Sizes: sm | md | lg
 */

const sizeMap = {
  sm: { spinner: 'w-5 h-5', text: 'text-xs' },
  md: { spinner: 'w-8 h-8', text: 'text-sm' },
  lg: { spinner: 'w-12 h-12', text: 'text-base' },
};

const LoadingSpinner = ({ size = 'md', text = '', className = '' }) => {
  const { spinner, text: textSize } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${spinner} rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`${textSize} text-gray-400 font-mono animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
