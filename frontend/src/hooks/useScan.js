/**
 * CyberSage - useScan Hook
 *
 * Manages the full scan lifecycle:
 *   idle → scanning → complete | error
 *
 * Returns:
 *   {
 *     scan:       object | null   — Full scan result
 *     isScanning: boolean
 *     isComplete: boolean
 *     isError:    boolean
 *     error:      string | null
 *     progress:   number (0-100)  — Simulated progress for UI
 *     startScan:  (url) => void
 *     reset:      () => void
 *   }
 */

import { useState, useCallback, useRef } from 'react';
import scanService from '../services/scanService';

// Scan UI steps for progress display
export const SCAN_STEPS = [
  { id: 1, label: 'Validating URL',           progress: 10 },
  { id: 2, label: 'Connecting to target',     progress: 25 },
  { id: 3, label: 'Collecting HTTP headers',  progress: 45 },
  { id: 4, label: 'Analyzing cookies',        progress: 60 },
  { id: 5, label: 'Checking HTTPS config',    progress: 75 },
  { id: 6, label: 'Running security rules',   progress: 88 },
  { id: 7, label: 'Calculating score',        progress: 95 },
  { id: 8, label: 'Scan complete',            progress: 100 },
];

const useScan = () => {
  const [scan,       setScan]       = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isError,    setIsError]    = useState(false);
  const [error,      setError]      = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [currentStep,setCurrentStep]= useState(0);

  const progressTimerRef = useRef(null);
  const isMounted        = useRef(true);

  // Simulate step-by-step progress during actual API call
  const simulateProgress = useCallback(() => {
    let stepIdx = 0;

    const advance = () => {
      if (!isMounted.current) return;
      if (stepIdx < SCAN_STEPS.length - 1) {
        stepIdx++;
        setProgress(SCAN_STEPS[stepIdx].progress);
        setCurrentStep(stepIdx);
        // Vary delay to feel realistic
        const delay = stepIdx < 3 ? 400 : stepIdx < 6 ? 600 : 1000;
        progressTimerRef.current = setTimeout(advance, delay);
      }
    };

    setProgress(SCAN_STEPS[0].progress);
    setCurrentStep(0);
    progressTimerRef.current = setTimeout(advance, 500);
  }, []);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startScan = useCallback(async (url) => {
    if (isScanning) return;

    setScan(null);
    setIsScanning(true);
    setIsComplete(false);
    setIsError(false);
    setError(null);
    setProgress(0);

    simulateProgress();

    try {
      const response = await scanService.startScan(url);

      clearProgressTimer();

      if (isMounted.current) {
        setProgress(100);
        setCurrentStep(SCAN_STEPS.length - 1);
        setScan(response.data.scan);
        setIsComplete(true);
      }
    } catch (err) {
      clearProgressTimer();

      if (isMounted.current) {
        setIsError(true);
        setError(err.message || 'Scan failed. Please try again.');
        setProgress(0);
      }
    } finally {
      if (isMounted.current) {
        setIsScanning(false);
      }
    }
  }, [isScanning, simulateProgress]);

  const reset = useCallback(() => {
    clearProgressTimer();
    setScan(null);
    setIsScanning(false);
    setIsComplete(false);
    setIsError(false);
    setError(null);
    setProgress(0);
    setCurrentStep(0);
  }, []);

  return {
    scan,
    isScanning,
    isComplete,
    isError,
    error,
    progress,
    currentStep,
    startScan,
    reset
  };
};

export default useScan;
