/**
 * CyberSage - Reusable Helper Functions
 */

import { SCORE_THRESHOLDS } from './constants';

/**
 * Get score rating object based on numeric score
 * @param {number} score - 0 to 100
 * @returns {object} - { label, color, bg, border }
 */
export const getScoreRating = (score) => {
  if (score >= 90) return SCORE_THRESHOLDS.EXCELLENT;
  if (score >= 70) return SCORE_THRESHOLDS.GOOD;
  if (score >= 50) return SCORE_THRESHOLDS.FAIR;
  if (score >= 30) return SCORE_THRESHOLDS.POOR;
  return SCORE_THRESHOLDS.CRITICAL;
};

/**
 * Format a date string to readable format
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Truncate a URL for display
 * @param {string} url
 * @param {number} maxLength
 */
export const truncateUrl = (url, maxLength = 40) => {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

/**
 * Extract domain from URL
 * @param {string} url
 */
export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

/**
 * Format bytes to human-readable
 */
export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate URL format
 */
export const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Debounce a function
 */
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
