/**
 * CyberSage - useAI Hook
 *
 * Manages AI explanation lifecycle for a scan.
 *
 * States: idle → loading → complete | error
 *
 * Returns:
 *   {
 *     explanation:  object | null
 *     isLoading:    boolean
 *     isComplete:   boolean
 *     isError:      boolean
 *     error:        string | null
 *     isCached:     boolean
 *     generate:     (scanId) => void
 *     regenerate:   (scanId) => void
 *   }
 *
 * Usage:
 *   const { explanation, isLoading, generate } = useAI();
 *   generate(scan.id);
 */

import { useState, useCallback, useRef } from 'react';
import aiService from '../services/aiService';

const useAI = () => {
  const [explanation, setExplanation] = useState(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isComplete,  setIsComplete]  = useState(false);
  const [isError,     setIsError]     = useState(false);
  const [error,       setError]       = useState(null);
  const [isCached,    setIsCached]    = useState(false);

  const isMounted = useRef(true);

  const reset = () => {
    setExplanation(null);
    setIsLoading(false);
    setIsComplete(false);
    setIsError(false);
    setError(null);
    setIsCached(false);
  };

  const _fetch = useCallback(async (scanId, forceRegenerate = false) => {
    if (isLoading) return;

    reset();
    setIsLoading(true);

    try {
      const response = await aiService.explainScan(scanId, forceRegenerate);

      if (isMounted.current) {
        setExplanation(response.data.explanation);
        setIsCached(response.data.cached || false);
        setIsComplete(true);
      }
    } catch (err) {
      if (isMounted.current) {
        setIsError(true);
        setError(err.message || 'Failed to generate AI explanation');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  const generate    = useCallback((scanId) => _fetch(scanId, false), [_fetch]);
  const regenerate  = useCallback((scanId) => _fetch(scanId, true),  [_fetch]);

  return {
    explanation,
    isLoading,
    isComplete,
    isError,
    error,
    isCached,
    generate,
    regenerate,
    reset
  };
};

export default useAI;
