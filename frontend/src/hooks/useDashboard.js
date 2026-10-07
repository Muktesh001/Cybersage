/**
 * CyberSage - useDashboard Hook
 *
 * Purpose:
 *   Manages dashboard data fetching, loading, and error state.
 *   Provides a refresh() function for manual refetch.
 *   Auto-fetches on mount.
 *
 * Returns:
 *   {
 *     data:      { overview, severityCounts, recentScans, trend } | null
 *     isLoading: boolean
 *     isError:   boolean
 *     error:     string | null
 *     refresh:   () => void
 *     lastFetched: Date | null
 *   }
 *
 * Usage:
 *   const { data, isLoading, isError, refresh } = useDashboard();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dashboardService from '../services/dashboardService';

const useDashboard = () => {
  const [data, setData]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Prevent state updates on unmounted component
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await dashboardService.getStats();

      if (isMounted.current) {
        setData(response.data);
        setLastFetched(new Date());
      }
    } catch (err) {
      if (isMounted.current) {
        setIsError(true);
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    isLoading,
    isError,
    error,
    refresh: fetchStats,
    lastFetched
  };
};

export default useDashboard;
